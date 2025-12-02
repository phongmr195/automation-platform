import { Hono } from "hono";
import { PrismaClient, Prisma } from "@prisma/client";
import { Queue } from "bullmq";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { WorkflowDefinitionSchema } from "../schemas/workflow";

export const workflowRoutes = (opts: {
  prisma: PrismaClient;
  executionQueue: Queue;
}) => {
  const router = new Hono();
  const { prisma, executionQueue } = opts;

  // CREATE WORKFLOW
  interface CreateWorkflowBody {
    name: string;
    definition: Prisma.InputJsonValue;
  }

  type CreatedWorkflow = Awaited<ReturnType<typeof prisma.workflow.create>>;

  // Normalize workflow BEFORE validation
  function normalizeWorkflow(def: any) {
    return {
      nodes: (def.nodes ?? []).map((n: any) => ({
        id: n.id,
        type: n.type,
        name: n.name ?? n.type.toUpperCase(),   // fallback
        position: n.position ?? { x: 0, y: 0 }, // fallback
        data: n.data ?? {},
        config: n.config ?? {},
      })),
      edges: (def.edges ?? []).map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label ?? "",
      })),
    };
  }

  router.post(
    "/",
    zValidator("json", z.object({
      name: z.string(),
      definition: WorkflowDefinitionSchema,
    })),
    async c => {
      const body = c.req.valid("json");
      const normalized = normalizeWorkflow(body.definition);
      const workflow = await prisma.workflow.create({
        data: {
          name: body.name,
          definition: normalized,
        },
      });

      return c.json(workflow);
    }
  );

  // LIST WORKFLOWS
  router.get("/", async c => {
    const list = await prisma.workflow.findMany({
      orderBy: { createdAt: "desc" },
    });
    return c.json(list);
  });

  // GET WORKFLOW
  router.get("/:id", async c => {
    const id = c.req.param("id");

    const wf = await prisma.workflow.findUnique({ where: { id } });
    if (!wf) return c.json({ error: "Workflow not found" }, 404);

    return c.json(wf);
  });

  // UPDATE WORKFLOW
  router.put(
    "/:id",
    zValidator("json", z.object({
      name: z.string(),
      definition: WorkflowDefinitionSchema,
    })),
    async c => {
      const id = c.req.param("id");
      const body = c.req.valid("json");
      const normalized = normalizeWorkflow(body.definition);

      const wf = await prisma.workflow.update({
        where: { id },
        data: {
          name: body.name,
          definition: normalized,
        },
      });

      return c.json(wf);
    }
  );
  // DELETE WORKFLOW
  router.delete("/:id", async c => {
    const id = c.req.param("id");

    await prisma.execution.deleteMany({ where: { workflowId: id } });
    await prisma.workflow.delete({ where: { id } });

    return c.json({ success: true });
  });

  // ENQUEUE EXECUTION
  router.post("/:id/execute", async c => {
    const id = c.req.param("id");
    const body = await c.req.json();

    const wf = await prisma.workflow.findUnique({ where: { id } });
    if (!wf) return c.json({ error: "Workflow not found" }, 404);

    const execution = await prisma.execution.create({
      data: {
        workflowId: id,
        status: "queued",
        input: body,
      },
    });

    // enqueue a job
    await executionQueue.add("execute-workflow", {
      executionId: execution.id,
      workflowId: id,
    });

    return c.json({ executionId: execution.id });
  });

  return router;
};
