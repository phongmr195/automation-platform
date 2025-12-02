import path from "path";

// Lazily require PrismaClient so we can resolve the generated client that may
// live under `backend/node_modules` or `worker/node_modules` depending on how
// the code is executed. This avoids startup errors when the generated client
// isn't present at the repo root node_modules.
function getPrismaClient(): any {
  // Try backend generated client first (prefer backend runtime)
  try {
    const backendClientPath = path.join(
      __dirname,
      "..",
      "backend",
      "node_modules",
      "@prisma",
      "client"
    );
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(backendClientPath).PrismaClient;
  } catch (err) {
    // Next try worker generated client
    try {
      const workerClientPath = path.join(
        __dirname,
        "..",
        "worker",
        "node_modules",
        "@prisma",
        "client"
      );
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require(workerClientPath).PrismaClient;
    } catch (err2) {
      // Fallback to normal resolution
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require("@prisma/client").PrismaClient;
    }
  }
}

const PrismaClientCtor = getPrismaClient();

// Create a singleton PrismaClient to avoid creating multiple instances during
// hot-reloads or when both backend and worker import this file.
const globalForPrisma = globalThis as any as {
  prisma?: InstanceType<typeof PrismaClientCtor>;
};

const prisma = globalForPrisma.prisma ?? new PrismaClientCtor();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
