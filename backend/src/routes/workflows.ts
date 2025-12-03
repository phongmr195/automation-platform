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

  // LIST WORKFLOWS with Search, Filter, Sort, and Pagination
  router.get("/", async (c) => {
    // Get query parameters
    const search = c.req.query("search") || "";
    const status = c.req.query("status") || ""; // all, published, draft
    const sort = c.req.query("sort") || "createdAt";
    const order = c.req.query("order") || "desc";
    const page = Number.parseInt(c.req.query("page") || "1");
    const limit = Number.parseInt(c.req.query("limit") || "20");

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.WorkflowWhereInput = {};

    // Search by name (case-insensitive)
    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    // Filter by status
    if (status === "published") {
      where.versions = {
        some: {
          isDraft: false,
        },
      };
    } else if (status === "draft") {
      where.versions = {
        every: {
          isDraft: true,
        },
      };
    }

    // Get total count for pagination
    const total = await prisma.workflow.count({ where });

    // Build orderBy clause
    const orderBy: Prisma.WorkflowOrderByWithRelationInput = {};
    if (sort === "createdAt" || sort === "updatedAt" || sort === "name") {
      orderBy[sort] = order === "asc" ? "asc" : "desc";
    } else {
      orderBy.createdAt = "desc"; // default
    }

    // Fetch workflows with relations and counts
    const workflows = await prisma.workflow.findMany({
      where,
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1, // Only get latest version
        },
        _count: {
          select: {
            versions: true,
            executions: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    });

    // Return with pagination metadata
    return c.json({
      workflows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
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
