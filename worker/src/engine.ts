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

  let context: Record<string, any> = execution.input ?? {};
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
    if (node.type === "http") {
      const res = await axios({
        method: node.config.method,
        url: node.config.url,
        data: node.config.body ?? undefined,
      });
      return res.data;
    }

    if (node.type === "set") {
      const key = node.config.key;
      const template = node.config.value;
      const value = template.replace(
        /\{\{(.*?)\}\}/g,
        (_, varName) => context[varName.trim()] ?? null
      );
      return { [key]: value };
    }

    if (node.type === "code") {
      const vm = new NodeVM({ sandbox: { context } });
      const fn = vm.run(
        `module.exports = async function(input){ ${node.config.code} }`
      );
      return await fn(context);
    }

    throw new Error("Unknown node type: " + node.type);
  }

  async function runGraph() {
    const queue = nodes.filter((n: any) => parentCount[n.id] === 0);
    const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));

    while (queue.length > 0) {
      const node = queue.shift() as any;
      const output = await runNode(node);

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
