import { useEffect, useRef, useState, useCallback } from "react";

export interface ExecutionEvent {
  type: string;
  data?: any;
  timestamp: string;
}

export interface NodeExecutionEvent {
  executionId: string;
  nodeId: string;
  nodeName: string;
  nodeType?: string;
  status?: "success" | "failed" | "skipped";
  output?: any;
  error?: string;
  timestamp: string;
}

export interface ExecutionLogEvent {
  executionId: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  timestamp: string;
  nodeId?: string;
}

export interface ExecutionProgressEvent {
  executionId: string;
  completedNodes: number;
  totalNodes: number;
  percentage: number;
  timestamp: string;
}

export interface UseExecutionMonitorOptions {
  executionId: string | null;
  onExecutionStarted?: (data: any) => void;
  onExecutionCompleted?: (data: any) => void;
  onNodeExecuting?: (data: NodeExecutionEvent) => void;
  onNodeCompleted?: (data: NodeExecutionEvent) => void;
  onLog?: (data: ExecutionLogEvent) => void;
  onProgress?: (data: ExecutionProgressEvent) => void;
  enabled?: boolean;
}

export interface UseExecutionMonitorResult {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  events: ExecutionEvent[];
  logs: ExecutionLogEvent[];
  progress: ExecutionProgressEvent | null;
  clearEvents: () => void;
  clearLogs: () => void;
}

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3000/ws";

/**
 * React hook for monitoring workflow execution in real-time via WebSocket
 */
export function useExecutionMonitor({
  executionId,
  onExecutionStarted,
  onExecutionCompleted,
  onNodeExecuting,
  onNodeCompleted,
  onLog,
  onProgress,
  enabled = true,
}: UseExecutionMonitorOptions): UseExecutionMonitorResult {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [logs, setLogs] = useState<ExecutionLogEvent[]>([]);
  const [progress, setProgress] = useState<ExecutionProgressEvent | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !executionId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setIsConnecting(true);
    setError(null);

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WebSocket] Connected to execution monitor");
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Subscribe to execution updates
        ws.send(
          JSON.stringify({
            type: "subscribe",
            executionId,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const message: ExecutionEvent = JSON.parse(event.data);

          // Add to events list
          setEvents((prev) => [...prev, message]);

          // Handle different event types
          switch (message.type) {
            case "connected":
              console.log(
                "[WebSocket] Connected with client ID:",
                message.data?.clientId
              );
              break;

            case "subscribed":
              console.log(
                "[WebSocket] Subscribed to execution:",
                message.data?.executionId
              );
              break;

            case "execution:started":
              onExecutionStarted?.(message.data);
              break;

            case "execution:completed":
              onExecutionCompleted?.(message.data);
              break;

            case "node:executing":
              onNodeExecuting?.(message.data);
              break;

            case "node:completed":
              onNodeCompleted?.(message.data);
              break;

            case "execution:log":
              setLogs((prev) => [...prev, message.data]);
              onLog?.(message.data);
              break;

            case "execution:progress":
              setProgress(message.data);
              onProgress?.(message.data);
              break;

            case "pong":
              // Keep-alive response
              break;

            default:
              console.log("[WebSocket] Unknown event type:", message.type);
          }
        } catch (err) {
          console.error("[WebSocket] Failed to parse message:", err);
        }
      };

      ws.onerror = (event) => {
        console.error("[WebSocket] Error:", event);
        setError(new Error("WebSocket connection error"));
        setIsConnecting(false);
      };

      ws.onclose = () => {
        console.log("[WebSocket] Connection closed");
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (enabled && executionId && reconnectAttemptsRef.current < 5) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );
          console.log(`[WebSocket] Reconnecting in ${delay}ms...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        }
      };
    } catch (err) {
      console.error("[WebSocket] Connection failed:", err);
      setError(err as Error);
      setIsConnecting(false);
    }
  }, [
    enabled,
    executionId,
    onExecutionStarted,
    onExecutionCompleted,
    onNodeExecuting,
    onNodeCompleted,
    onLog,
    onProgress,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  // Connect when enabled and executionId changes
  useEffect(() => {
    if (enabled && executionId) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, executionId, connect, disconnect]);

  // Send ping every 30 seconds to keep connection alive
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isConnected]);

  return {
    isConnected,
    isConnecting,
    error,
    events,
    logs,
    progress,
    clearEvents,
    clearLogs,
  };
}
