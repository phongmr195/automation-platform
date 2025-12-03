import { WebSocketServer, WebSocket } from "ws";
import { Server } from "node:http";
import IORedis from "ioredis";

interface Client {
  ws: WebSocket;
  executionIds: Set<string>;
}

/**
 * WebSocket server for real-time execution monitoring
 */
export class ExecutionWebSocketServer {
  private readonly wss: WebSocketServer;
  private readonly clients: Map<string, Client> = new Map();
  private readonly redis: IORedis;

  constructor(server: Server) {
    // Create WebSocket server
    this.wss = new WebSocketServer({
      server,
      path: "/ws",
    });

    // Initialize Redis subscriber
    this.redis = new IORedis(
      process.env.REDIS_URL || "redis://localhost:6379",
      {
        maxRetriesPerRequest: null,
      }
    );

    this.setupRedisSubscription();
    this.setupWebSocketServer();

    console.log("[WebSocket] Server initialized on /ws");
  }

  /**
   * Setup Redis subscription to listen for execution events
   */
  private setupRedisSubscription() {
    this.redis.subscribe("execution:events", (err) => {
      if (err) {
        console.error("[WebSocket] Failed to subscribe to Redis:", err);
      } else {
        console.log("[WebSocket] Subscribed to execution:events channel");
      }
    });

    this.redis.on("message", (channel, message) => {
      if (channel === "execution:events") {
        try {
          const { event, data } = JSON.parse(message);
          this.broadcastEvent(event, data);
        } catch (err) {
          console.error("[WebSocket] Failed to parse event:", err);
        }
      }
    });

    this.redis.on("error", (err) => {
      console.error("[WebSocket] Redis error:", err.message);
    });
  }

  /**
   * Setup WebSocket server event handlers
   */
  private setupWebSocketServer() {
    this.wss.on("connection", (ws: WebSocket) => {
      const clientId = this.generateClientId();
      const client: Client = {
        ws,
        executionIds: new Set(),
      };
      this.clients.set(clientId, client);

      console.log(
        `[WebSocket] Client ${clientId} connected (total: ${this.clients.size})`
      );

      // Handle incoming messages
      ws.on("message", (data) => {
        try {
          let messageStr: string;
          if (Buffer.isBuffer(data)) {
            messageStr = data.toString("utf-8");
          } else if (typeof data === "string") {
            messageStr = data;
          } else {
            messageStr = JSON.stringify(data);
          }
          const message = JSON.parse(messageStr);
          this.handleClientMessage(clientId, message);
        } catch (err) {
          console.error("[WebSocket] Failed to parse client message:", err);
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Invalid message format",
            })
          );
        }
      });

      // Handle client disconnect
      ws.on("close", () => {
        this.clients.delete(clientId);
        console.log(
          `[WebSocket] Client ${clientId} disconnected (total: ${this.clients.size})`
        );
      });

      // Handle errors
      ws.on("error", (err) => {
        console.error(`[WebSocket] Client ${clientId} error:`, err.message);
      });

      // Send welcome message
      ws.send(
        JSON.stringify({
          type: "connected",
          clientId,
          timestamp: new Date().toISOString(),
        })
      );
    });

    this.wss.on("error", (err) => {
      console.error("[WebSocket] Server error:", err);
    });
  }

  /**
   * Handle messages from clients
   */
  private handleClientMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case "subscribe":
        // Subscribe to specific execution
        if (message.executionId) {
          client.executionIds.add(message.executionId);
          console.log(
            `[WebSocket] Client ${clientId} subscribed to execution ${message.executionId}`
          );
          client.ws.send(
            JSON.stringify({
              type: "subscribed",
              executionId: message.executionId,
              timestamp: new Date().toISOString(),
            })
          );
        }
        break;

      case "unsubscribe":
        // Unsubscribe from specific execution
        if (message.executionId) {
          client.executionIds.delete(message.executionId);
          console.log(
            `[WebSocket] Client ${clientId} unsubscribed from execution ${message.executionId}`
          );
          client.ws.send(
            JSON.stringify({
              type: "unsubscribed",
              executionId: message.executionId,
              timestamp: new Date().toISOString(),
            })
          );
        }
        break;

      case "ping":
        // Respond to ping
        client.ws.send(
          JSON.stringify({
            type: "pong",
            timestamp: new Date().toISOString(),
          })
        );
        break;

      default:
        console.warn(`[WebSocket] Unknown message type: ${message.type}`);
    }
  }

  /**
   * Broadcast execution event to subscribed clients
   */
  private broadcastEvent(event: string, data: any) {
    const executionId = data.executionId;
    if (!executionId) return;

    let sentCount = 0;

    for (const client of this.clients.values()) {
      // Send to clients subscribed to this execution or subscribed to all
      if (
        client.executionIds.has(executionId) ||
        client.executionIds.has("*")
      ) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(
            JSON.stringify({
              type: event,
              data,
              timestamp: new Date().toISOString(),
            })
          );
          sentCount++;
        }
      }
    }

    if (sentCount > 0) {
      console.log(`[WebSocket] Broadcast ${event} to ${sentCount} client(s)`);
    }
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      totalClients: this.clients.size,
      clients: Array.from(this.clients.entries()).map(([id, client]) => ({
        id,
        subscriptions: Array.from(client.executionIds),
        readyState: client.ws.readyState,
      })),
    };
  }

  /**
   * Cleanup and close server
   */
  async close() {
    console.log("[WebSocket] Closing server...");

    // Close all client connections
    for (const client of this.clients.values()) {
      client.ws.close();
    }
    this.clients.clear();

    // Close WebSocket server
    return new Promise<void>((resolve, reject) => {
      this.wss.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    }).then(async () => {
      // Close Redis connection
      await this.redis.quit();
      console.log("[WebSocket] Server closed");
    });
  }
}
