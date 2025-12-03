import { useExecutionMonitor } from "../hooks/useExecutionMonitor";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import { useState } from "react";

interface ExecutionMonitorProps {
  readonly executionId: string | null;
  readonly onComplete?: () => void;
}

export function ExecutionMonitor({
  executionId,
  onComplete,
}: ExecutionMonitorProps) {
  const [executionStatus, setExecutionStatus] = useState<
    "running" | "completed" | "failed" | null
  >(null);
  const [currentNode, setCurrentNode] = useState<string | null>(null);

  const { isConnected, isConnecting, error, logs, progress, clearLogs } =
    useExecutionMonitor({
      executionId,
      enabled: !!executionId,
      onExecutionStarted: (data) => {
        console.log("Execution started:", data);
        setExecutionStatus("running");
        clearLogs();
      },
      onExecutionCompleted: (data) => {
        console.log("Execution completed:", data);
        setExecutionStatus(
          data.status === "completed" ? "completed" : "failed"
        );
        setCurrentNode(null);
        onComplete?.();
      },
      onNodeExecuting: (data) => {
        console.log("Node executing:", data);
        setCurrentNode(data.nodeName);
      },
      onNodeCompleted: (data) => {
        console.log("Node completed:", data);
      },
      onProgress: (data) => {
        console.log("Progress:", data);
      },
    });

  if (!executionId) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="space-y-4">
        {/* Header with Connection Status */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Execution Monitor
          </h3>
          <div className="flex items-center gap-2">
            {isConnecting && (
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </span>
            )}
            {isConnected && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <Wifi className="w-4 h-4" />
                Live
              </span>
            )}
            {!isConnected && !isConnecting && (
              <span className="flex items-center gap-1 text-sm text-red-600">
                <WifiOff className="w-4 h-4" />
                Disconnected
              </span>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">
                Connection Error
              </p>
              <p className="text-sm text-red-700 mt-1">{error.message}</p>
            </div>
          </div>
        )}

        {/* Execution Status */}
        {executionStatus && (
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {executionStatus === "running" && (
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              )}
              {executionStatus === "completed" && (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              )}
              {executionStatus === "failed" && (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {executionStatus === "running" && "Execution in progress..."}
                {executionStatus === "completed" &&
                  "Execution completed successfully"}
                {executionStatus === "failed" && "Execution failed"}
              </p>
              {currentNode && executionStatus === "running" && (
                <p className="text-sm text-gray-600 mt-0.5">
                  Current: {currentNode}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {progress && executionStatus === "running" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium text-gray-900">
                {progress.completedNodes} / {progress.totalNodes} nodes (
                {progress.percentage}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900">
              Execution Logs
            </h4>
            <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
              <div className="p-3 space-y-1.5">
                {logs.map((log) => {
                  const logKey = `${log.timestamp}-${log.nodeId || "general"}-${log.message.substring(0, 20)}`;
                  let textColor = "text-gray-700";
                  if (log.level === "error") {
                    textColor = "text-red-700";
                  } else if (log.level === "warn") {
                    textColor = "text-yellow-700";
                  }

                  return (
                    <div
                      key={logKey}
                      className="flex items-start gap-2 text-sm font-mono"
                    >
                      <span className="text-gray-400 text-xs flex-shrink-0 mt-0.5">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <div className="flex-shrink-0 mt-0.5">
                        {log.level === "info" && (
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        {log.level === "warn" && (
                          <AlertCircle className="w-3.5 h-3.5 text-yellow-600" />
                        )}
                        {log.level === "error" && (
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                        )}
                        {log.level === "debug" && (
                          <Clock className="w-3.5 h-3.5 text-gray-600" />
                        )}
                      </div>
                      <span className={`flex-1 ${textColor}`}>
                        {log.message}
                        {log.nodeId && (
                          <span className="text-gray-500 ml-2">
                            [Node: {log.nodeId}]
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!executionStatus && !isConnecting && isConnected && (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm">Waiting for execution to start...</p>
          </div>
        )}
      </div>
    </div>
  );
}
