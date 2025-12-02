import { Hono } from "hono";
import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import prisma from "../../shared/prisma";
import { Queue } from "bullmq";
import IORedis from "ioredis";

import { workflowRoutes } from "./routes/workflows";

dotenv.config();

const app = new Hono();

// Redis connection
const redis = new IORedis(process.env.REDIS_URL);
const executionQueue = new Queue("executions", { connection: redis });

// Register routes
app.route("/workflows", workflowRoutes({ prisma, executionQueue }));

// Health check
app.get("/", c => c.text("Backend OK"));

serve({
  fetch: app.fetch,
  port: Number(process.env.PORT || 3000),
});

console.log("Backend running on port", process.env.PORT || 3000);
