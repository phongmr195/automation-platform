import React, { useEffect, useState } from 'react';
import { Bug, AlertCircle, CheckCircle, Filter, Search } from 'lucide-react';
import { getErrors, resolveError, type ErrorLog } from '../../services/monitoringApi';

const ErrorTrackingTab: React.FC = () => {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const fetchErrors = async () => {
    try {
      const result = await getErrors({
        resolved: filter === 'unresolved' ? false : filter === 'resolved' ? true : undefined,
        severity: severityFilter !== 'all' ? (severityFilter as any) : undefined,
        limit: 50,
      });
      setErrors(result?.errors || []);
    } catch (err) {
      console.error('Failed to fetch errors:', err);
      setErrors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, [filter, severityFilter]);

  const handleResolve = async (errorId: string) => {
    try {
      await resolveError(errorId);
      await fetchErrors();
    } catch (err) {
      console.error('Failed to resolve error:', err);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'ERROR':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Error Tracking</h2>
          <p className="text-sm text-gray-600 mt-1">{errors.length} errors found</p>
        </div>

        <div className="flex gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="unresolved">Unresolved</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="ERROR">Error</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>
        </div>
      </div>

      {/* Errors List */}
      {errors.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Bug className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No errors found</h3>
          <p className="text-gray-600">
            {filter === 'unresolved'
              ? 'All errors have been resolved!'
              : 'No errors match the current filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {errors.map((error) => (
            <ErrorCard key={error.id} error={error} onResolve={() => handleResolve(error.id)} />
          ))}
        </div>
      )}
    </div>
  );
};

const ErrorCard: React.FC<{
  error: ErrorLog;
  onResolve: () => void;
}> = ({ error, onResolve }) => {
  const [expanded, setExpanded] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'ERROR':
        return 'bg-orange-100 text-orange-800';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(
                error.severity
              )}`}
            >
              {error.severity}
            </span>
            <span className="text-sm text-gray-600">{error.errorType}</span>
            {error.resolved && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" />
                Resolved
              </span>
            )}
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">{error.message}</h3>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Occurrences: {error.occurrences}</span>
            <span>First: {new Date(error.firstSeenAt).toLocaleString()}</span>
            <span>Last: {new Date(error.lastSeenAt).toLocaleString()}</span>
          </div>
        </div>

        {!error.resolved && (
          <button
            onClick={onResolve}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            Resolve
          </button>
        )}
      </div>

      {error.stack && (
        <div className="mt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-indigo-600 hover:text-indigo-700"
          >
            {expanded ? 'Hide' : 'Show'} Stack Trace
          </button>

          {expanded && (
            <pre className="mt-2 p-4 bg-gray-50 rounded text-xs overflow-x-auto">
              {error.stack}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorTrackingTab;

