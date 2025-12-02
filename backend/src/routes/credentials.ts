import { Hono } from "hono";
import { z } from "zod";
import * as service from "../services/credential.service";

export const credentialRoute = new Hono();

// Mock auth: replace with your real auth middleware
function getOwnerId(c: any) {
  return c.req.header("x-owner-id") || "demo-owner";
}

/**
 * Create credential
 */
credentialRoute.post("/", async (c) => {
  const ownerId = getOwnerId(c);
  const body = await c.req.json();

  const schema = z.object({
    name: z.string(),
    provider: z.string(),
    type: z.enum(["apiKey", "oauth", "basic"]),
    secret: z.any(),
    meta: z.any().optional(),
  });

  const { name, provider, type, secret, meta } = schema.parse(body);

  const created = await service.createCredential(
    ownerId,
    name,
    provider,
    type,
    secret,
    meta
  );

  return c.json({
    success: true,
    credential: {
      id: created.id,
      name: created.name,
      provider: created.provider,
      type: created.type,
      createdAt: created.createdAt,
    },
  });
});

/**
 * List credentials (safe, metadata only)
 */
credentialRoute.get("/", async (c) => {
  const ownerId = getOwnerId(c);
  const list = await service.listCredentials(ownerId);
  return c.json(list);
});

/**
 * Read credential metadata only
 */
credentialRoute.get("/:id", async (c) => {
  const ownerId = getOwnerId(c);
  const id = c.req.param("id");

  const row = await service.getCredential(ownerId, id);
  if (!row) return c.json({ error: "Not found" }, 404);

  // hide secret
  return c.json({
    id: row.id,
    name: row.name,
    provider: row.provider,
    type: row.type,
    meta: row.meta,
  });
});

/**
 * Read full secret (ONLY FOR WORKER / INTERNAL)
 */
credentialRoute.get("/:id/secret", async (c) => {
  // TODO: protect with service-token middleware
  const ownerId = getOwnerId(c);

  const id = c.req.param("id");

  const row = await service.getCredential(ownerId, id);
  if (!row) return c.json({ error: "Not found" }, 404);

  return c.json({
    id: row.id,
    provider: row.provider,
    type: row.type,
    secret: row.secret,
  });
});

/**
 * Delete credential
 */
credentialRoute.delete("/:id", async (c) => {
  const ownerId = getOwnerId(c);
  const id = c.req.param("id");

  await service.deleteCredential(ownerId, id);
  return c.json({ success: true });
});
