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
    const starred = c.req.query("starred") === "true";
    const folderId = c.req.query("folderId") || "";
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

    // Filter by starred
    if (starred) {
      where.starred = true;
    }

    // Filter by folder
    if (folderId) {
      where.folderId = folderId;
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

    const wf = await prisma.workflow.findUnique({ 
      where: { id },
      include: {
        versions: {
          orderBy: {
            versionNumber: 'asc'
          }
        },
        publishedVersion: true
      }
    });
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

    // Delete related records first (in correct order to avoid FK constraints)
    // 1. Delete version control records (they reference WorkflowVersion)
    await prisma.workflowMergeRequest.deleteMany({ where: { workflowId: id } });
    await prisma.workflowSnapshot.deleteMany({ where: { workflowId: id } });
    await prisma.workflowDiff.deleteMany({ where: { workflowId: id } });
    await prisma.workflowCommit.deleteMany({ where: { workflowId: id } });
    await prisma.workflowBranch.deleteMany({ where: { workflowId: id } });
    
    // 2. Delete workflow execution and schedule records
    await prisma.execution.deleteMany({ where: { workflowId: id } });
    await prisma.scheduleConfig.deleteMany({ where: { workflowId: id } });
    
    // 3. Delete workflow versions (no longer referenced by commits)
    await prisma.workflowVersion.deleteMany({ where: { workflowId: id } });
    
    // 4. Finally delete the workflow itself
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

    // Update lastOpenedAt
    await prisma.workflow.update({
      where: { id },
      data: { lastOpenedAt: new Date() },
    });

    return c.json({ executionId: execution.id, versionId: versionToRun.id });
  });

  // TOGGLE STAR
  router.post("/:id/star", async (c) => {
    const id = c.req.param("id");

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      select: { starred: true },
    });

    if (!workflow) return c.json({ error: "Workflow not found" }, 404);

    const updated = await prisma.workflow.update({
      where: { id },
      data: { starred: !workflow.starred },
      select: { id: true, starred: true },
    });

    return c.json(updated);
  });

  // DUPLICATE WORKFLOW
  router.post("/:id/duplicate", async (c) => {
    const id = c.req.param("id");

    const original = await prisma.workflow.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!original) return c.json({ error: "Workflow not found" }, 404);

    const latestVersion = original.versions[0];
    if (!latestVersion) {
      return c.json({ error: "Workflow has no versions" }, 400);
    }

    // Create duplicate
    const duplicate = await prisma.workflow.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        organizationId: original.organizationId,
        ownerId: original.ownerId,
        folderId: original.folderId,
        versions: {
          create: {
            versionNumber: 1,
            definition: latestVersion.definition,
            isDraft: true,
          },
        },
      },
      include: {
        versions: true,
      },
    });

    return c.json(duplicate);
  });

  // EXPORT WORKFLOW(S)
  router.post("/export", async (c) => {
    const body = await c.req.json();
    const workflowIds = body.workflowIds as string[];

    if (!Array.isArray(workflowIds) || workflowIds.length === 0) {
      return c.json({ error: "Invalid workflowIds" }, 400);
    }

    const workflows = await prisma.workflow.findMany({
      where: { id: { in: workflowIds } },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    const exportData = {
      version: "1.0",
      exported: new Date().toISOString(),
      workflows: workflows.map((wf) => ({
        name: wf.name,
        description: wf.description,
        definition: wf.versions[0]?.definition,
      })),
    };

    return c.json(exportData);
  });

  // IMPORT WORKFLOW(S)
  router.post("/import", async (c) => {
    const body = await c.req.json();

    if (!body.workflows || !Array.isArray(body.workflows)) {
      return c.json({ error: "Invalid import format" }, 400);
    }

    const imported = [];

    for (const wf of body.workflows) {
      const normalized = normalizeWorkflow(wf.definition);

      const created = await prisma.workflow.create({
        data: {
          name: wf.name || "Imported Workflow",
          description: wf.description,
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

      imported.push(created);
    }

    return c.json({ imported: imported.length, workflows: imported });
  });

  // FOLDER ROUTES
  router.get("/folders/list", async (c) => {
    const organizationId = c.req.query("organizationId");

    const folders = await prisma.workflowFolder.findMany({
      where: organizationId ? { organizationId } : {},
      include: {
        _count: {
          select: { workflows: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return c.json(
      folders.map((f) => ({
        id: f.id,
        name: f.name,
        workflowCount: f._count.workflows,
      }))
    );
  });

  router.post("/folders", async (c) => {
    const body = await c.req.json();

    const folder = await prisma.workflowFolder.create({
      data: {
        name: body.name,
        organizationId: body.organizationId,
      },
    });

    return c.json(folder);
  });

  router.put("/:id/folder", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();

    const workflow = await prisma.workflow.update({
      where: { id },
      data: { folderId: body.folderId },
    });

    return c.json(workflow);
  });

  return router;
};
