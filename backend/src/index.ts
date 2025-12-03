import dotenv from "dotenv";
// Load .env first (main config)
dotenv.config();

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { PrismaClient } from "@prisma/client";

// singleton Prisma client to avoid multiple instances during hot reload
const globalForPrisma = globalThis as any as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
import { Queue } from "bullmq";
import IORedis from "ioredis";

import { workflowRoutes } from "./routes/workflows";
import { workflowVersioning } from "./routes/workflowVersioning";
import { credentialRoute } from "./routes/credentials";
import { lotteryRoutes } from "./routes/lottery";
import { footballRoutes } from "./routes/football";

const app = new Hono();

// Redis connection
const redis = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
const executionQueue = new Queue("executions", { connection: redis });

// Register routes
app.route("/workflows", workflowRoutes({ prisma, executionQueue }));
app.route("/workflow-version", workflowVersioning);
app.route("/credentials", credentialRoute);
app.route("/lottery", lotteryRoutes({ prisma, executionQueue }));
app.route("/football", footballRoutes({ prisma, executionQueue }));

// Health check
app.get("/", (c) => c.text("Automation Platform API"));

serve({
  fetch: app.fetch,
  port: Number(process.env.PORT || 3000),
});

console.log("Backend running on port", process.env.PORT || 3000);
