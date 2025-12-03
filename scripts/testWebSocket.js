#!/usr/bin/env node

/**
 * WebSocket Test Client
 * Tests the execution monitoring WebSocket connection
 */

const WebSocket = require("ws");

const WS_URL = process.env.WS_URL || "ws://localhost:3000/ws";
const EXECUTION_ID = process.argv[2] || "test-execution-123";

console.log("🔌 Connecting to WebSocket:", WS_URL);
console.log("📊 Monitoring execution:", EXECUTION_ID);
console.log("---");

const ws = new WebSocket(WS_URL);

ws.on("open", () => {
  console.log("✅ Connected to WebSocket server");

  // Subscribe to execution
  ws.send(
    JSON.stringify({
      type: "subscribe",
      executionId: EXECUTION_ID,
    })
  );

  console.log("📡 Subscribed to execution:", EXECUTION_ID);
  console.log("---");
  console.log("Waiting for events...\n");

  // Send ping every 30 seconds
  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping" }));
    }
  }, 30000);
});

ws.on("message", (data) => {
  try {
    const message = JSON.parse(data.toString());

    switch (message.type) {
      case "connected":
        console.log("🎉 Connection established");
        console.log("   Client ID:", message.clientId);
        break;

      case "subscribed":
        console.log("✅ Subscription confirmed for:", message.executionId);
        break;

      case "execution:started":
        console.log("\n🚀 Execution Started");
        console.log("   Execution ID:", message.data.executionId);
        console.log("   Workflow ID:", message.data.workflowId);
        console.log(
          "   Time:",
          new Date(message.data.timestamp).toLocaleTimeString()
        );
        break;

      case "execution:completed":
        console.log("\n🏁 Execution Completed");
        console.log("   Status:", message.data.status);
        console.log(
          "   Time:",
          new Date(message.data.timestamp).toLocaleTimeString()
        );
        if (message.data.error) {
          console.log("   Error:", message.data.error);
        }
        break;

      case "node:executing":
        console.log("\n⚙️  Node Executing");
        console.log("   Node:", message.data.nodeName);
        console.log("   Type:", message.data.nodeType);
        console.log("   ID:", message.data.nodeId);
        break;

      case "node:completed":
        console.log("\n✓  Node Completed");
        console.log("   Node:", message.data.nodeName);
        console.log("   Status:", message.data.status);
        if (message.data.error) {
          console.log("   Error:", message.data.error);
        }
        break;

      case "execution:log": {
        const icons = { info: "ℹ️ ", warn: "⚠️ ", error: "❌", debug: "🔍" };
        console.log(
          `\n${icons[message.data.level] || ""} Log [${message.data.level}]`
        );
        console.log("   ", message.data.message);
        if (message.data.nodeId) {
          console.log("   Node:", message.data.nodeId);
        }
        break;
      }

      case "execution:progress": {
        const bar =
          "█".repeat(Math.floor(message.data.percentage / 5)) +
          "░".repeat(20 - Math.floor(message.data.percentage / 5));
        console.log(`\n📊 Progress: [${bar}] ${message.data.percentage}%`);
        console.log(
          `   Nodes: ${message.data.completedNodes}/${message.data.totalNodes}`
        );
        break;
      }

      case "pong":
        // Keep-alive response
        break;

      default:
        console.log("\n📨 Unknown event:", message.type);
        console.log("   Data:", JSON.stringify(message.data, null, 2));
    }
  } catch (err) {
    console.error("❌ Failed to parse message:", err);
  }
});

ws.on("error", (error) => {
  console.error("❌ WebSocket error:", error.message);
});

ws.on("close", () => {
  console.log("\n👋 Disconnected from WebSocket server");
  process.exit(0);
});

// Handle Ctrl+C
process.on("SIGINT", () => {
  console.log("\n\n👋 Closing connection...");
  ws.close();
});

console.log("💡 Tip: Run a workflow execution to see real-time events");
console.log("💡 Press Ctrl+C to exit\n");
