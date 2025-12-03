import { Worker } from "bullmq";
import IORedis from "ioredis";
import dotenv from "dotenv";
import { runWorkflowExecution } from "./engine";
import { runLotteryPrediction } from "./jobs/lotteryPredictionJob";

dotenv.config();

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
const concurrency = Number(process.env.WORKER_CONCURRENCY || 5);

const worker = new Worker(
  "executions",
  async (job) => {
    if (job.name === "execute-workflow") {
      await runWorkflowExecution(job.data.executionId);
    } else if (job.name === "lottery-prediction") {
      await runLotteryPrediction(job.data);
    }
  },
  { connection, concurrency }
);

worker.on("completed", (job) => {
  console.log(`[worker] execution ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] execution ${job?.id} failed`, err?.message);
});

console.log(`Worker Engine v2 ready (concurrency=${concurrency}) - supports workflow & lottery prediction`);
