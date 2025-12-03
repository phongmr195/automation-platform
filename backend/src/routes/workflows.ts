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
    definition: any;
  }

  type CreatedWorkflow = Awaited<ReturnType<typeof prisma.workflow.create>>;

  // Normalize workflow BEFORE validation
  function normalizeWorkflow(def: any) {
    return {
      nodes: (def.nodes ?? []).map((n: any) => ({
        id: n.id,
        type: n.type,
        name: n.name ?? n.type.toUpperCase(), // fallback
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
    zValidator(
      "json",
      z.object({
        name: z.string(),
        definition: WorkflowDefinitionSchema,
      })
    ),
    async (c) => {
      const body = c.req.valid("json");
      const normalized = normalizeWorkflow(body.definition);

      // Create workflow with initial version
      const workflow = await prisma.workflow.create({
        data: {
          name: body.name,
          versions: {
            create: {
              versionNumber: 1,
              definition: normalized,
              isDraft: true,
            },
          },
        },
        include: {
          versions: true,
        },
      });

      return c.json(workflow);
    }
  );

  // LIST WORKFLOWS
  router.get("/", async (c) => {
    const list = await prisma.workflow.findMany({
      orderBy: { createdAt: "desc" },
    });
    return c.json(list);
  });

  // GET WORKFLOW
  router.get("/:id", async (c) => {
    const id = c.req.param("id");

    const wf = await prisma.workflow.findUnique({ where: { id } });
    if (!wf) return c.json({ error: "Workflow not found" }, 404);

    return c.json(wf);
  });

  // UPDATE WORKFLOW
  router.put(
    "/:id",
    zValidator(
      "json",
      z.object({
        name: z.string(),
        definition: WorkflowDefinitionSchema,
      })
    ),
    async (c) => {
      const id = c.req.param("id");
      const body = c.req.valid("json");
      const normalized = normalizeWorkflow(body.definition);

      // Get the latest version number
      const latestVersion = await prisma.workflowVersion.findFirst({
        where: { workflowId: id },
        orderBy: { versionNumber: "desc" },
      });

      const wf = await prisma.workflow.update({
        where: { id },
        data: {
          name: body.name,
          versions: {
            create: {
              versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
              definition: normalized,
              isDraft: true,
            },
          },
        },
        include: {
          versions: true,
        },
      });

      return c.json(wf);
    }
  );
  // DELETE WORKFLOW
  router.delete("/:id", async (c) => {
    const id = c.req.param("id");

    await prisma.execution.deleteMany({ where: { workflowId: id } });
    await prisma.workflow.delete({ where: { id } });

    return c.json({ success: true });
  });

  // ENQUEUE EXECUTION
  router.post("/:id/execute", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();

    const wf = await prisma.workflow.findUnique({
      where: { id },
      include: {
        publishedVersion: true,
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!wf) return c.json({ error: "Workflow not found" }, 404);

    const versionToRun = wf.publishedVersion ?? wf.versions[0];
    if (!versionToRun) {
      return c.json({ error: "Workflow has no versions to execute" }, 400);
    }

    const execution = await prisma.execution.create({
      data: {
        workflowId: id,
        versionId: versionToRun.id,
        status: "queued",
        input: body,
        definitionSnapshot: versionToRun.definition,
      },
      select: { id: true },
    });

    await executionQueue.add(
      "execute-workflow",
      {
        executionId: execution.id,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 500 },
        removeOnComplete: 100,
        removeOnFail: 100,
      }
    );

    return c.json({ executionId: execution.id, versionId: versionToRun.id });
  });

  return router;
};
