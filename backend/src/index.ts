import dotenv from "dotenv";
// Load .env first (main config)
dotenv.config();

// Initialize Sentry (must be before other imports)
// import { initSentry, captureException } from "./lib/sentry";
// initSentry();

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
import templateRoutes from "./routes/templates";
import marketplaceRoutes from "./routes/marketplace";
import customNodesRoutes from "./routes/custom-nodes";
import analyticsRoutes from "./routes/analytics";
import alertsRoutes from "./routes/alerts";
import monitoringRoutes from "./routes/monitoring";
import schedulesRoutes from "./routes/schedules";
import authRoutes from "./routes/auth";
import oauthRoutes from "./routes/oauth";
import organizationRoutes from "./routes/organizations";
import versionControlRoutes from "./routes/versionControl";
import { ExecutionWebSocketServer } from "./websocket";

// Import workflow engine to auto-register nodes
import "./workflow/index";

// Import health check scheduler
import HealthCheckScheduler from "./services/healthCheckScheduler";

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
app.route("/auth/oauth", oauthRoutes);
app.route("/organizations", organizationRoutes);
app.route("/workflows", workflowRoutes({ prisma, executionQueue }));
app.route("/workflow-version", workflowVersioning);
app.route("/credentials", credentialRoute);
app.route("/lottery", lotteryRoutes({ prisma, executionQueue }));
app.route("/football", footballRoutes({ prisma, executionQueue }));
app.route("/engine", workflowEngineRoutes);
app.route("/templates", templateRoutes);
app.route("/marketplace", marketplaceRoutes);
app.route("/custom-nodes", customNodesRoutes);
app.route("/analytics", analyticsRoutes);
app.route("/alerts", alertsRoutes);
app.route("/schedules", schedulesRoutes);
app.route("/version-control", versionControlRoutes);
app.route("/monitoring", monitoringRoutes); // Error logging endpoint - no auth required

// Health check
app.get("/", (c) => c.text("Automation Platform API"));

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  
  // Capture exception in Sentry
  // captureException(err, {
  //   tags: {
  //     path: c.req.path,
  //     method: c.req.method,
  //   },
  //   extra: {
  //     headers: Object.fromEntries(c.req.raw.headers.entries()),
  //   },
  // });

  return c.json({
    success: false,
    error: err.message || 'Internal server error',
  }, 500);
});

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

// Start health check scheduler
HealthCheckScheduler.start();
HealthCheckScheduler.scheduleCleanup();

console.log("Backend running on port", process.env.PORT || 3000);
console.log(
  "WebSocket server running on ws://localhost:" +
    (process.env.PORT || 3000) +
    "/ws"
);

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP and WebSocket servers");
  HealthCheckScheduler.stop();
  await wsServer.close();
  // const { flush } = await import("./lib/sentry");
  // await flush();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT signal received: closing HTTP and WebSocket servers");
  HealthCheckScheduler.stop();
  await wsServer.close();
  // const { flush } = await import("./lib/sentry");
  // await flush();
  process.exit(0);
});
