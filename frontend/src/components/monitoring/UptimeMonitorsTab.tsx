import React, { useEffect, useState } from 'react';
import {
  Plus,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  TrendingUp,
  Activity,
} from 'lucide-react';
import {
  getMonitors,
  performManualCheck,
} from '../../services/monitoringApi';
import type { UptimeMonitor } from '../../services/monitoringApi';

const UptimeMonitorsTab: React.FC = () => {
  const [monitors, setMonitors] = useState<UptimeMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMonitors = async () => {
    try {
      setError(null);
      const data = await getMonitors();
      setMonitors(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch monitors');
      setMonitors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitors();
  }, []);

  const handleManualCheck = async (monitorId: string) => {
    try {
      await performManualCheck(monitorId);
      await fetchMonitors();
    } catch (err: any) {
      console.error('Manual check failed:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'DEGRADED':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'UNHEALTHY':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Uptime Monitors</h2>
          <p className="text-sm text-gray-600 mt-1">
            {monitors.length} monitor{monitors.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          <Plus className="w-4 h-4" />
          Add Monitor
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Monitors Grid */}
      {monitors.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No monitors configured</h3>
          <p className="text-gray-600 mb-4">Start monitoring your services by adding a monitor</p>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Add Your First Monitor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {monitors.map((monitor) => (
            <MonitorCard
              key={monitor.id}
              monitor={monitor}
              onManualCheck={() => handleManualCheck(monitor.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const MonitorCard: React.FC<{
  monitor: UptimeMonitor;
  onManualCheck: () => void;
}> = ({ monitor, onManualCheck }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return 'border-green-200 bg-green-50';
      case 'DEGRADED':
        return 'border-yellow-200 bg-yellow-50';
      case 'UNHEALTHY':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'DEGRADED':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'UNHEALTHY':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className={`bg-white border-2 rounded-lg p-6 ${getStatusColor(monitor.currentStatus)}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{monitor.serviceName}</h3>
          {monitor.serviceUrl && (
            <p className="text-sm text-gray-600 mt-1">{monitor.serviceUrl}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon(monitor.currentStatus)}
          {monitor.enabled ? (
            <Play className="w-4 h-4 text-green-600" />
          ) : (
            <Pause className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-600 mb-1">Uptime</p>
          <p className="text-2xl font-bold text-gray-900">
            {monitor.uptimePercentage.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">Avg Response</p>
          <p className="text-2xl font-bold text-gray-900">
            {monitor.avgResponseTime.toFixed(0)}ms
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Total Checks:</span>
          <span className="font-medium">{monitor.totalChecks}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Failed Checks:</span>
          <span className="font-medium text-red-600">{monitor.failedChecks}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Check Interval:</span>
          <span className="font-medium">{monitor.checkInterval}s</span>
        </div>
        {monitor.lastCheckAt && (
          <div className="flex justify-between">
            <span className="text-gray-600">Last Check:</span>
            <span className="font-medium">
              {new Date(monitor.lastCheckAt).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Active Incidents */}
      {monitor.incidents && monitor.incidents.length > 0 && (
        <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded">
          <p className="text-sm font-medium text-red-800">
            {monitor.incidents.length} Active Incident{monitor.incidents.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
        <button
          onClick={onManualCheck}
          className="flex-1 px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
        >
          Run Check
        </button>
        <button className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50">
          View Details
        </button>
      </div>
    </div>
  );
};

export default UptimeMonitorsTab;

