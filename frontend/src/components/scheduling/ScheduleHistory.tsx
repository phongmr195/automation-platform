import { useQuery } from '@tanstack/react-query';
import { schedulesApi } from '../../services/schedulesApi';
import type { ScheduleLog } from '../../services/schedulesApi';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Filter } from 'lucide-react';
import { useState } from 'react';

interface ScheduleHistoryProps {
  workflowId: string;
}

export default function ScheduleHistory({ workflowId }: ScheduleHistoryProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch history
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['schedule-history', workflowId],
    queryFn: () => schedulesApi.getScheduleHistory(workflowId),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const logs: ScheduleLog[] = data?.data || [];

  // Filter logs
  const filteredLogs = statusFilter === 'all' 
    ? logs 
    : logs.filter(log => log.status === statusFilter);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'EXECUTED':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'SKIPPED':
        return <XCircle className="w-5 h-5 text-gray-600" />;
      case 'DELAYED':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'QUEUED':
        return <AlertTriangle className="w-5 h-5 text-blue-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      EXECUTED: 'bg-green-100 text-green-800',
      SKIPPED: 'bg-gray-100 text-gray-800',
      DELAYED: 'bg-yellow-100 text-yellow-800',
      QUEUED: 'bg-blue-100 text-blue-800',
    }[status] || 'bg-gray-100 text-gray-800';

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}>
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Execution History</h3>
          <p className="text-sm text-gray-600">
            {filteredLogs.length} of {logs.length} executions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="EXECUTED">Executed</option>
            <option value="SKIPPED">Skipped</option>
            <option value="DELAYED">Delayed</option>
            <option value="QUEUED">Queued</option>
          </select>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {['EXECUTED', 'SKIPPED', 'DELAYED', 'QUEUED'].map(status => {
          const count = logs.filter(log => log.status === status).length;
          return (
            <div key={status} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                {getStatusIcon(status)}
                <span className="text-2xl font-semibold text-gray-900">{count}</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">{status}</p>
            </div>
          );
        })}
      </div>

      {/* Timeline */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No execution history yet</p>
          <p className="text-sm text-gray-500 mt-1">
            {statusFilter && statusFilter !== 'all' 
              ? `No ${statusFilter.toLowerCase()} executions found`
              : 'Schedule executions will appear here'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="mt-0.5">
                  {getStatusIcon(log.status)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(log.status)}
                      {log.executionId && (
                        <span className="text-xs text-gray-500">
                          Execution #{log.executionId.slice(0, 8)}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(log.scheduledTime), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Scheduled:</span>{' '}
                      <span className="text-gray-900">
                        {new Date(log.scheduledTime).toLocaleString()}
                      </span>
                    </div>
                    {log.actualTime && (
                      <div>
                        <span className="text-gray-600">Actual:</span>{' '}
                        <span className="text-gray-900">
                          {new Date(log.actualTime).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Reason */}
                  {log.reason && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                      <span className="font-medium">Reason:</span> {log.reason}
                    </div>
                  )}

                  {/* Metadata */}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        View metadata
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Placeholder */}
      {filteredLogs.length >= 50 && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-600">
            Showing most recent 50 executions
          </p>
        </div>
      )}
    </div>
  );
}
