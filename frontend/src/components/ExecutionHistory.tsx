import { memo, useState, useEffect } from 'react';
import { Play, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, Filter, Search } from 'lucide-react';
import { engineApi } from '../services/api';
import { toast } from '../utils/alerts';

interface Execution {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'error' | 'aborted';
  input?: any;
  output?: any;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
}

interface ExecutionHistoryProps {
  workflowId: string;
  onReplay?: (execution: Execution) => void;
  onRetry?: (execution: Execution) => void;
}

function ExecutionHistory({ workflowId, onReplay, onRetry }: ExecutionHistoryProps) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchExecutions();
  }, [workflowId, filter, page]);

  async function fetchExecutions() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(filter !== 'all' && { status: filter }),
      });
      
      const response = await engineApi.get(`/workflows/${workflowId}/executions?${params}`);
      setExecutions(response.data.executions || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch executions:', error);
      toast.error('Failed to load execution history');
    } finally {
      setLoading(false);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'aborted':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'aborted':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function formatDuration(startedAt?: string, finishedAt?: string) {
    if (!startedAt) return '-';
    if (!finishedAt) return 'Running...';
    
    const start = new Date(startedAt).getTime();
    const end = new Date(finishedAt).getTime();
    const duration = end - start;
    
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`;
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    return date.toLocaleString();
  }

  const filteredExecutions = executions.filter(exec => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return exec.id.toLowerCase().includes(query) ||
             exec.status.toLowerCase().includes(query) ||
             (exec.error && exec.error.toLowerCase().includes(query));
    }
    return true;
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Execution History</h2>
        <button
          onClick={fetchExecutions}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search executions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="running">Running</option>
            <option value="aborted">Aborted</option>
          </select>
        </div>
      </div>

      {/* Executions List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading executions...</div>
      ) : filteredExecutions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchQuery ? 'No executions found matching your search' : 'No executions yet'}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {filteredExecutions.map((execution) => (
              <div
                key={execution.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(execution.status)}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-gray-600">{execution.id}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(execution.status)}`}>
                          {execution.status}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-4">
                          <span>
                            <Clock className="inline w-4 h-4 mr-1" />
                            {formatDate(execution.createdAt)}
                          </span>
                          <span>
                            Duration: {formatDuration(execution.startedAt, execution.finishedAt)}
                          </span>
                        </div>
                        
                        {execution.error && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                            <strong>Error:</strong> {execution.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 ml-4">
                    {execution.status === 'error' && onRetry && (
                      <button
                        onClick={() => onRetry(execution)}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded transition-colors"
                        title="Retry execution"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                    
                    {onReplay && execution.status !== 'running' && (
                      <button
                        onClick={() => onReplay(execution)}
                        className="p-2 hover:bg-green-50 text-green-600 rounded transition-colors"
                        title="Replay execution"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default memo(ExecutionHistory);
