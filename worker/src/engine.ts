import { Prisma, PrismaClient } from "@prisma/client";
import axios from "axios";
import { NodeVM } from "vm2";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.PRISMA_LOG_QUERIES ? ["query"] : [],
  });
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

const DEFAULT_RETRY = 3;
const DEFAULT_TIMEOUT = 30000;
const LOG_BATCH_SIZE = 25;
const ABORT_CHECK_INTERVAL = 5;

export async function runWorkflowExecution(executionId: string) {
  const execution = await prisma.execution.findUnique({
    where: { id: executionId },
    include: {
      version: { select: { definition: true } },
    },
  });

  if (!execution) throw new Error("Execution not found");

  const definition = (execution.definitionSnapshot ??
    execution.version?.definition) as any;
  if (!definition) throw new Error("Execution definition snapshot missing");

  const nodes = definition.nodes ?? [];
  const edges = definition.edges ?? [];

  const childrenMap: Record<string, string[]> = {};
  const parentCount: Record<string, number> = {};

  nodes.forEach((n: any) => {
    childrenMap[n.id] = [];
    parentCount[n.id] = 0;
  });

  edges.forEach((edge: any) => {
    childrenMap[edge.source]?.push(edge.target);
    if (parentCount[edge.target] === undefined) parentCount[edge.target] = 0;
    parentCount[edge.target] += 1;
  });

  let context: Record<string, any>;
  if (execution.input === null || execution.input === undefined) {
    context = {};
  } else if (typeof execution.input === "object") {
    context = execution.input as Record<string, any>;
  } else {
    // wrap primitive inputs so callers can always treat context as an object
    context = { input: execution.input };
  }
  let processedNodes = 0;
  const logBuffer: Prisma.NodeLogCreateManyInput[] = [];

  const flushLogs = async () => {
    if (!logBuffer.length) return;
    const batch = logBuffer.splice(0, logBuffer.length);
    await prisma.nodeLog.createMany({ data: batch });
  };

  async function log(nodeId: string, status: string, data: Prisma.JsonValue) {
    logBuffer.push({ executionId, nodeId, status, data });
    if (logBuffer.length >= LOG_BATCH_SIZE) {
      await flushLogs();
    }
  }

  function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timeout: NodeJS.Timeout;
    const timer = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error("Node timeout")), ms);
    });
    return Promise.race([promise, timer]).finally(() => clearTimeout(timeout));
  }

  async function runNode(node: any): Promise<any> {
    let attempts = node.config?.retry ?? DEFAULT_RETRY;
    const timeout = node.config?.timeout ?? DEFAULT_TIMEOUT;
    const errorPolicy = node.config?.onError ?? "stop";

    while (attempts > 0) {
      try {
        await log(node.id, "running", {});
        const result = await withTimeout(executeNode(node), timeout);
        await log(node.id, "success", result ?? {});
        return result;
      } catch (err: any) {
        attempts -= 1;

        if (attempts > 0 && errorPolicy === "retry") {
          await log(node.id, "retry", { error: err.message });
          await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempts)));
          continue;
        }

        if (errorPolicy === "fallback") {
          const fallback = node.config?.fallback ?? {};
          await log(node.id, "fallback", fallback);
          return fallback;
        }

        if (errorPolicy === "continue") {
          await log(node.id, "continue-after-error", {});
          return {};
        }

        await log(node.id, "error", { message: err.message });
        throw err;
      }
    }
  }

  async function executeNode(node: any): Promise<any> {
    // Helper function to interpolate templates like {{nodes.1.message}}
    function interpolate(obj: any): any {
      if (typeof obj === "string") {
        return obj.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
          const trimmedPath = path.trim();

          // Handle environment variables: {{env.VARIABLE_NAME}}
          if (trimmedPath.startsWith("env.")) {
            const envVar = trimmedPath.substring(4); // Remove 'env.' prefix
            const envValue = process.env[envVar];
            return envValue !== undefined ? envValue : match;
          }

          // Handle context variables: {{nodes.1.field}}
          const keys = trimmedPath.split(".");
          let value = context;
          for (const key of keys) {
            value = value?.[key];
          }
          if (value === undefined) return match;
          if (typeof value === "object") return JSON.stringify(value);
          return String(value);
        });
      }
      if (Array.isArray(obj)) {
        return obj.map((item) => interpolate(item));
      }
      if (obj && typeof obj === "object") {
        const result: any = {};
        for (const [key, val] of Object.entries(obj)) {
          result[key] = interpolate(val);
        }
        return result;
      }
      return obj;
    }

    if (node.type === "http") {
      // Interpolate body templates
      const body = node.config.body ? interpolate(node.config.body) : undefined;

      const res = await axios({
        method: node.config.method,
        url: node.config.url,
        headers: node.config.headers,
        data: body,
      });
      return res.data;
    }

    if (node.type === "set") {
      const key = node.config.key;
      const template = node.config.value;
      const value = interpolate(template);
      return { [key]: value };
    }

    if (node.type === "transform" || node.type === "code") {
      const vm = new NodeVM({ sandbox: { context }, timeout: 10000 });
      const code = node.config.code || "";
      const fn = vm.run(`module.exports = function() { ${code} }`);
      return fn();
    }

    throw new Error("Unknown node type: " + node.type);
  }

  async function runGraph() {
    const queue = nodes.filter((n: any) => parentCount[n.id] === 0);
    const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));

    while (queue.length > 0) {
      const node = queue.shift() as any;
      const output = await runNode(node);

      // Store node output in context for later reference
      if (!context.nodes) context.nodes = {};
      context.nodes[node.id] = output;

      // Also merge output into context root for backwards compatibility
      Object.assign(context, output);
      processedNodes += 1;

      for (const child of childrenMap[node.id] ?? []) {
        parentCount[child] -= 1;
        if (parentCount[child] === 0) {
          const childNode = nodeMap.get(child);
          if (childNode) queue.push(childNode);
        }
      }

      if (processedNodes % ABORT_CHECK_INTERVAL === 0) {
        const check = await prisma.execution.findUnique({
          where: { id: executionId },
          select: { status: true },
        });
        if (check?.status === "aborted") return;
      }
    }
  }

  await prisma.execution.update({
    where: { id: executionId },
    data: { status: "running", startedAt: new Date() },
  });

  try {
    await runGraph();
    await flushLogs();

    await prisma.execution.update({
      where: { id: executionId },
      data: {
        status: "success",
        output: context,
        finishedAt: new Date(),
      },
    });
  } catch (err: any) {
    await flushLogs();
    await prisma.execution.update({
      where: { id: executionId },
      data: {
        status: "failed",
        error: err?.message ?? "Unknown error",
        finishedAt: new Date(),
      },
    });
    throw err;
  }
}
