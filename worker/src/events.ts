import { EventEmitter } from "node:events";
import IORedis from "ioredis";

/**
 * Execution Event Types
 */
export interface ExecutionEvents {
  "execution:started": {
    executionId: string;
    workflowId: string;
    timestamp: string;
  };
  "execution:completed": {
    executionId: string;
    status: "completed" | "failed";
    timestamp: string;
    error?: string;
  };
  "node:executing": {
    executionId: string;
    nodeId: string;
    nodeName: string;
    nodeType: string;
    timestamp: string;
  };
  "node:completed": {
    executionId: string;
    nodeId: string;
    nodeName: string;
    status: "success" | "failed" | "skipped";
    output?: any;
    error?: string;
    timestamp: string;
  };
  "execution:log": {
    executionId: string;
    level: "info" | "warn" | "error" | "debug";
    message: string;
    timestamp: string;
    nodeId?: string;
  };
  "execution:progress": {
    executionId: string;
    completedNodes: number;
    totalNodes: number;
    percentage: number;
    timestamp: string;
  };
}

export type ExecutionEventType = keyof ExecutionEvents;
export type ExecutionEventData<T extends ExecutionEventType> =
  ExecutionEvents[T];

/**
 * EventEmitter for execution events
 * Uses Redis pub/sub to communicate between worker and backend
 */
class ExecutionEventEmitter extends EventEmitter {
  private redis: IORedis | null = null;
  private pubClient: IORedis | null = null;

  constructor() {
    super();
    this.setMaxListeners(100); // Allow many listeners
  }

  /**
   * Initialize Redis connection for pub/sub
   */
  initRedis(redisUrl?: string) {
    if (this.redis) return; // Already initialized

    const url = redisUrl || process.env.REDIS_URL || "redis://localhost:6379";

    // Publisher client
    this.pubClient = new IORedis(url, {
      maxRetriesPerRequest: null,
    });

    this.pubClient.on("error", (err) => {
      console.error("[EventEmitter] Redis pub client error:", err.message);
    });

    console.log("[EventEmitter] Redis publisher initialized");
  }

  /**
   * Emit an execution event (publishes to Redis)
   */
  emitExecutionEvent<T extends ExecutionEventType>(
    event: T,
    data: ExecutionEventData<T>
  ) {
    // Emit locally for in-process listeners
    this.emit(event, data);

    // Publish to Redis for cross-process communication
    if (this.pubClient) {
      const message = JSON.stringify({ event, data });
      this.pubClient.publish("execution:events", message).catch((err) => {
        console.error("[EventEmitter] Failed to publish event:", err.message);
      });
    }
  }

  /**
   * Cleanup
   */
  async cleanup() {
    if (this.pubClient) {
      await this.pubClient.quit();
      this.pubClient = null;
    }
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
}

// Singleton instance
export const executionEventEmitter = new ExecutionEventEmitter();

// Helper functions for common events
export const emitExecutionStarted = (
  executionId: string,
  workflowId: string
) => {
  executionEventEmitter.emitExecutionEvent("execution:started", {
    executionId,
    workflowId,
    timestamp: new Date().toISOString(),
  });
};

export const emitExecutionCompleted = (
  executionId: string,
  status: "completed" | "failed",
  error?: string
) => {
  executionEventEmitter.emitExecutionEvent("execution:completed", {
    executionId,
    status,
    timestamp: new Date().toISOString(),
    error,
  });
};

export const emitNodeExecuting = (
  executionId: string,
  nodeId: string,
  nodeName: string,
  nodeType: string
) => {
  executionEventEmitter.emitExecutionEvent("node:executing", {
    executionId,
    nodeId,
    nodeName,
    nodeType,
    timestamp: new Date().toISOString(),
  });
};

export const emitNodeCompleted = (
  executionId: string,
  nodeId: string,
  nodeName: string,
  status: "success" | "failed" | "skipped",
  output?: any,
  error?: string
) => {
  executionEventEmitter.emitExecutionEvent("node:completed", {
    executionId,
    nodeId,
    nodeName,
    status,
    output,
    error,
    timestamp: new Date().toISOString(),
  });
};

export const emitExecutionLog = (
  executionId: string,
  level: "info" | "warn" | "error" | "debug",
  message: string,
  nodeId?: string
) => {
  executionEventEmitter.emitExecutionEvent("execution:log", {
    executionId,
    level,
    message,
    timestamp: new Date().toISOString(),
    nodeId,
  });
};

export const emitExecutionProgress = (
  executionId: string,
  completedNodes: number,
  totalNodes: number
) => {
  const percentage = totalNodes > 0 ? (completedNodes / totalNodes) * 100 : 0;
  executionEventEmitter.emitExecutionEvent("execution:progress", {
    executionId,
    completedNodes,
    totalNodes,
    percentage: Math.round(percentage),
    timestamp: new Date().toISOString(),
  });
};
