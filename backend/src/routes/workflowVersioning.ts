import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const workflowVersioning = new Hono();

// LIST VERSIONS
workflowVersioning.get("/:workflowId/versions", async (c) => {
  const workflowId = c.req.param("workflowId");

  const versions = await prisma.workflowVersion.findMany({
    where: { workflowId },
    orderBy: { versionNumber: "desc" },
  });

  return c.json(versions);
});

// PUBLISH VERSION
workflowVersioning.post("/:workflowId/publish", async (c) => {
  const workflowId = c.req.param("workflowId");

  // get current draft
  const draft = await prisma.workflowVersion.findFirst({
    where: { workflowId, isDraft: true },
  });

  if (!draft) return c.json({ error: "No draft available" }, 400);

  // publish it
  const published = await prisma.workflowVersion.update({
    where: { id: draft.id },
    data: { isDraft: false },
  });

  // update workflow reference
  await prisma.workflow.update({
    where: { id: workflowId },
    data: { publishedVersionId: draft.id },
  });

  // create new draft v+1
  await prisma.workflowVersion.create({
    data: {
      workflowId,
      versionNumber: draft.versionNumber + 1,
      isDraft: true,
      definition: draft.definition,
    },
  });

  return c.json({ published });
});

// ROLLBACK
workflowVersioning.post("/:workflowId/rollback/:version", async (c) => {
  const workflowId = c.req.param("workflowId");
  const version = Number(c.req.param("version"));

  const versionToRollback = await prisma.workflowVersion.findFirst({
    where: { workflowId, versionNumber: version },
  });

  if (!versionToRollback) return c.json({ error: "Version not found" }, 404);

  // set published
  await prisma.workflow.update({
    where: { id: workflowId },
    data: { publishedVersionId: versionToRollback.id },
  });

  return c.json({ restored: versionToRollback });
});
