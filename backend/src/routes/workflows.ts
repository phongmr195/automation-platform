import { Context } from 'hono';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';

export default ({ prisma, executionQueue }: { prisma: PrismaClient; executionQueue: Queue }) => {
  const router = new (require('hono')).Hono();

  // create workflow
  router.post('/', async (c: Context) => {
    const body = await c.req.json();
    const wf = await prisma.workflow.create({
      data: {
        name: body.name,
        definition: body.definition
      }
    });
    return c.json(wf);
  });

  // list workflows
  router.get('/', async (c: Context) => {
    const list = await prisma.workflow.findMany();
    return c.json(list);
  });

  // trigger execution (enqueue)
  router.post('/:id/execute', async (c: Context) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const execution = await prisma.execution.create({
      data: { workflowId: id, status: 'queued', input: body }
    });
    await executionQueue.add('run', { executionId: execution.id, workflowId: id, input: body });
    return c.json({ executionId: execution.id });
  });

  return router;
};
