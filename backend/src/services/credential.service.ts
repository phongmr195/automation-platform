import { PrismaClient } from "@prisma/client";
import { encryptJSON, decryptJSON } from "../lib/crypto";

const prisma = new PrismaClient();

export async function createCredential(
  ownerId: string,
  name: string,
  provider: string,
  type: string,
  secret: any,
  meta?: any
) {
  const { encrypted, iv } = encryptJSON(secret);

  return prisma.credential.create({
    data: {
      ownerId,
      name,
      provider,
      type,
      encrypted,
      iv,
      meta: meta ?? {}
    }
  });
}

export async function getCredential(ownerId: string, id: string) {
  const row = await prisma.credential.findUnique({ where: { id } });
  if (!row || row.ownerId !== ownerId) return null;

  const secret = decryptJSON(row.encrypted as Buffer, row.iv as Buffer);

  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    type: row.type,
    meta: row.meta,
    secret
  };
}

export async function listCredentials(ownerId: string) {
  return prisma.credential.findMany({
    where: { ownerId },
    select: { id: true, name: true, provider: true, type: true, meta: true, createdAt: true }
  });
}

export async function deleteCredential(ownerId: string, id: string) {
  const row = await prisma.credential.findUnique({ where: { id } });
  if (!row || row.ownerId !== ownerId) throw new Error("Not found");

  return prisma.credential.delete({ where: { id } });
}
