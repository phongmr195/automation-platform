// worker/src/index.ts
import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { NodeVM } from 'vm2';

dotenv.config();

const prisma = new PrismaClient();
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
const queueName = 'executions';

// ensure a scheduler exists (for retries, delayed jobs)
const queue = new Queue(queueName, { connection });
// util: sleep
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

// default per-node timeout (ms)
const DEFAULT_NODE_TIMEOUT = Number(process.env.NODE_TIMEOUT_MS || 15000);

// default maximum code sandbox memory/time (vm2 can't strictly cap memory but we can limit exec time)
const createCodeVM = (timeoutMs: number) =>
  new NodeVM({
    timeout: timeoutMs,
    sandbox: {},
    console: 'inherit',
    eval: false,
    wasm: false,
    require: {
      external: false,
      builtin: [],
    },
  });

// helper to run with timeout
async function withTimeout<T>(promise: Promise<T>, ms: number, nodeId?: string) {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, rej) => {
    timeoutId = setTimeout(() => rej(new Error(`Node timeout after ${ms}ms${nodeId ? ` (node ${nodeId})` : ''}`)), ms);
  });
  try {
    const res = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return res;
  } catch (err) {
    clearTimeout(timeoutId!);
    throw err;
  }
}

// run single node
async function runNode(node: any, context: any) {
  const { type, id, config = {}, data = {} } = node;
  const nodeLog: any = { nodeId: id, type, startedAt: new Date().toISOString() };
  try {
    switch (type) {
      case 'http': {
        const method = (config.method || 'get').toLowerCase();
        const url = config.url;
        const opts: any = { method, url, headers: config.headers || {}, timeout: config.timeoutMs || 10000 };
        if (method === 'post' || method === 'put' || method === 'patch') {
          opts.data = config.body ?? context;
        } else {
          // optionally allow templating in query with context (simple replace)
          if (config.queryTemplate) {
            opts.url = opts.url.replace(/\{\{(.+?)\}\}/g, (_, p) => (context[p.trim()] ?? ''));
          }
        }
        const resp = await withTimeout(axios(opts), config.timeoutMs || 10000, id);
        nodeLog.output = resp.data;
        nodeLog.status = 'success';
        nodeLog.finishedAt = new Date().toISOString();
        return { success: true, output: resp.data, log: nodeLog };
      }

      case 'delay': {
        const ms = Number(config.ms || 1000);
        await withTimeout(sleep(ms), config.timeoutMs || DEFAULT_NODE_TIMEOUT, id);
        nodeLog.output = { sleptMs: ms };
        nodeLog.status = 'success';
        nodeLog.finishedAt = new Date().toISOString();
        return { success: true, output: { sleptMs: ms }, log: nodeLog };
      }

      case 'set': {
        // set data to context (like assign variables)
        const key = config.key;
        const value = config.value;
        // support simple template replacement with context keys
        const resolved = typeof value === 'string' ? value.replace(/\{\{(.+?)\}\}/g, (_, p) => (context[p.trim()] ?? '')) : value;
        context[key] = resolved;
        nodeLog.output = { [key]: resolved };
        nodeLog.status = 'success';
        nodeLog.finishedAt = new Date().toISOString();
        return { success: true, output: { [key]: resolved }, log: nodeLog };
      }

      case 'if': {
        // simple condition language: e.g. config.expr = "context.x > 10"
        // We'll run this expression in a tiny vm with context provided
        const expr = config.expr || 'true';
        const vm = createCodeVM(config.timeoutMs || 2000);
        const wrapped = `module.exports = (context) => { return (${expr}); }`;
        const fn = vm.run(wrapped, `if-node-${id}.js`);
        const res = await withTimeout(Promise.resolve(fn(context)), config.timeoutMs || 2000, id);
        nodeLog.output = { result: !!res };
        nodeLog.status = 'success';
        nodeLog.finishedAt = new Date().toISOString();
        return { success: true, output: { result: !!res }, log: nodeLog };
      }

      case 'code': {
        // run arbitrary JS in vm2 sandbox, receives context and must return newContext or output
        const code = config.code || '';
        const timeoutMs = config.timeoutMs || DEFAULT_NODE_TIMEOUT;
        const vm = createCodeVM(timeoutMs);
        // wrap as async function so user can await
        const wrapped = `
          module.exports = async function(context) {
            ${code}
          }
        `;
        const fn = vm.run(wrapped, `code-node-${id}.js`);
        const result = await withTimeout(Promise.resolve(fn(context)), timeoutMs, id);
        // if user returns object, we merge into context
        if (result && typeof result === 'object') {
          context = { ...context, ...result };
        } else {
          // otherwise set lastOutput
          context._last = result;
        }
        nodeLog.output = result;
        nodeLog.status = 'success';
        nodeLog.finishedAt = new Date().toISOString();
        return { success: true, output: result, log: nodeLog, context };
      }

      case 'db-query': {
        // expects config.sql or config.prismaAction
        // For simplicity we allow simple prisma findMany / create via config.action and config.model
        if (!config.action || !config.model) throw new Error('db-query node requires action and model in config');
        const action = config.action;
        const model = config.model;
        // only allow read actions for MVP
        if (action === 'findMany') {
          // dynamic access: prisma[model].findMany(config.args)
          // ensure model exists on prisma
          if (!(prisma as any)[model]) throw new Error(`Prisma model ${model} not found`);
          const args = config.args || {};
          const result = await withTimeout((prisma as any)[model].findMany(args), config.timeoutMs || 10000, id);
          nodeLog.output = result;
          nodeLog.status = 'success';
          nodeLog.finishedAt = new Date().toISOString();
          context._db = result;
          return { success: true, output: result, log: nodeLog, context };
        } else {
          throw new Error(`Unsupported db action: ${action}`);
        }
      }

      case 'webhook-response': {
        // placeholder node used to return response early; we put output and status
        nodeLog.output = config.body ?? context;
        nodeLog.status = 'success';
        nodeLog.finishedAt = new Date().toISOString();
        return { success: true, output: nodeLog.output, log: nodeLog, stopExecution: true };
      }

      default: {
        throw new Error(`Unknown node type: ${type}`);
      }
    }
  } catch (err: any) {
    nodeLog.status = 'error';
    nodeLog.error = err.message;
    nodeLog.finishedAt = new Date().toISOString();
    return { success: false, error: err, log: nodeLog };
  }
}

// worker processor
const worker = new Worker(
  queueName,
  async job => {
    console.log(`[worker] job ${job.id} name=${job.name} data=`, job.data);
    const { executionId, workflowId } = job.data;

    const execution = await prisma.execution.findUnique({ where: { id: executionId } });
    if (!execution) throw new Error('Execution record not found');

    // update running
    await prisma.execution.update({ where: { id: executionId }, data: { status: 'running', startedAt: new Date() } });

    // load workflow
    const wf = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!wf) {
      await prisma.execution.update({ where: { id: executionId }, data: { status: 'failed', logs: [{ error: 'workflow not found' }], finishedAt: new Date() } });
      return;
    }

    // context initial
    let context = execution.input ?? {};
    const nodeLogs: any[] = [];
    let finalOutput: any = null;
    let stoppedEarly = false;

    try {
      // validate wf.definition shape
      const def: any = wf.definition;
      if (!def || !Array.isArray(def.nodes)) throw new Error('Invalid workflow definition');

      // assume nodes array is ordered sequentially for MVP
      for (const node of def.nodes) {
        const nodeTimeout = node.config?.timeoutMs ?? DEFAULT_NODE_TIMEOUT;
        const res = await runNode(node, context);
        nodeLogs.push(res.log || { nodeId: node.id, status: res.success ? 'success' : 'error' });

        if (!res.success) {
          // record failure, update execution and break
          await prisma.execution.update({
            where: { id: executionId },
            data: {
              status: 'failed',
              logs: nodeLogs,
              finishedAt: new Date(),
            },
          });
          throw new Error(`Node ${node.id} failed: ${res.log?.error || 'unknown'}`);
        }

        // merge context if returned
        if (res.context) context = res.context;
        else if (res.output && typeof res.output === 'object') context = { ...context, ...res.output };
        else context._last = res.output;

        if (res.stopExecution) {
          finalOutput = res.output;
          stoppedEarly = true;
          break;
        }
      }

      if (!stoppedEarly) finalOutput = context;

      // success -> update execution
      await prisma.execution.update({
        where: { id: executionId },
        data: {
          status: 'success',
          output: finalOutput,
          logs: nodeLogs,
          finishedAt: new Date(),
        },
      });

      console.log(`[worker] execution ${executionId} finished success`);
    } catch (err: any) {
      console.error('[worker] execution error', err);
      // already updated in failure path; ensure final state
      if ((err as any).message) {
        // if not already failed update
        const ex = await prisma.execution.findUnique({ where: { id: executionId } });
        if (ex?.status !== 'failed') {
          await prisma.execution.update({
            where: { id: executionId },
            data: {
              status: 'failed',
              logs: nodeLogs.concat([{ error: err.message }]),
              finishedAt: new Date(),
            },
          });
        }
      }
      throw err; // let bullmq handle retries if configured
    }
  },
  { connection }
);

worker.on('completed', job => console.log(`[worker] job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`[worker] job ${job?.id} failed:`, err?.message));
console.log('[worker] started, listening for jobs...');
