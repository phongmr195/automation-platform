import dotenv from "dotenv";
// Load .env first (main config)
dotenv.config();

import { Hono } from "hono";
import { cors } from "hono/cors";
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
import workflowEngineRoutes from "./routes/workflowEngine";
import authRoutes from "./routes/auth";
import organizationRoutes from "./routes/organizations";
import { ExecutionWebSocketServer } from "./websocket";

// Import workflow engine to auto-register nodes
import "./workflow/index";

const app = new Hono();

// Enable CORS for frontend
app.use('/*', cors({
  origin: (origin) => origin, // Allow all origins in development
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 600,
}));

// Redis connection
const redis = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
const executionQueue = new Queue("executions", { connection: redis });

// Register routes
app.route("/auth", authRoutes);
app.route("/organizations", organizationRoutes);
app.route("/workflows", workflowRoutes({ prisma, executionQueue }));
app.route("/workflow-version", workflowVersioning);
app.route("/credentials", credentialRoute);
app.route("/lottery", lotteryRoutes({ prisma, executionQueue }));
app.route("/football", footballRoutes({ prisma, executionQueue }));
app.route("/engine", workflowEngineRoutes);

// Health check
app.get("/", (c) => c.text("Automation Platform API"));

// WebSocket stats endpoint
app.get("/ws/stats", (c) => {
  if (wsServer) {
    return c.json(wsServer.getStats());
  }
  return c.json({ error: "WebSocket server not initialized" }, 503);
});

const server = serve({
  fetch: app.fetch,
  port: Number(process.env.PORT || 3000),
});

// Initialize WebSocket server (cast to HTTP Server type)
const wsServer = new ExecutionWebSocketServer(server as any);

console.log("Backend running on port", process.env.PORT || 3000);
console.log(
  "WebSocket server running on ws://localhost:" +
    (process.env.PORT || 3000) +
    "/ws"
);

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP and WebSocket servers");
  await wsServer.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT signal received: closing HTTP and WebSocket servers");
  await wsServer.close();
  process.exit(0);
});
