import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Database,
  Server,
  Cpu,
  Zap,
} from 'lucide-react';
import { getSystemHealth, type SystemHealth, type ComponentHealth } from '../../services/monitoringApi';

const SystemHealthTab: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealth = async () => {
    try {
      setError(null);
      const data = await getSystemHealth();
      setHealth(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch system health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();

    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case 'DEGRADED':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'UNHEALTHY':
        return <XCircle className="w-6 h-6 text-red-500" />;
      default:
        return <HelpCircle className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'DEGRADED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'UNHEALTHY':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getComponentIcon = (component: string) => {
    switch (component) {
      case 'database':
        return <Database className="w-5 h-5" />;
      case 'redis':
        return <Zap className="w-5 h-5" />;
      case 'worker':
        return <Cpu className="w-5 h-5" />;
      case 'api':
        return <Server className="w-5 h-5" />;
      default:
        return <Server className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">{error}</p>
        </div>
        <button
          onClick={fetchHealth}
          className="mt-3 text-sm text-red-600 hover:text-red-700 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!health) return null;

  return (
    <div className="space-y-6">
      {/* Overall Status Card */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Overall System Status</h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Auto-refresh
            </label>
            <button
              onClick={fetchHealth}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {getStatusIcon(health.status)}
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {health.status === 'HEALTHY'
                ? 'All Systems Operational'
                : health.status === 'DEGRADED'
                ? 'Degraded Performance'
                : 'System Issues Detected'}
            </p>
            <p className="text-sm text-gray-500">
              Last checked: {new Date(health.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Components Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {health.components.map((component) => (
          <ComponentCard key={component.component} component={component} />
        ))}
      </div>
    </div>
  );
};

const ComponentCard: React.FC<{ component: ComponentHealth }> = ({ component }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'DEGRADED':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'UNHEALTHY':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <HelpCircle className="w-5 h-5 text-gray-400" />;
    }
  };

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

  const getComponentIcon = (componentName: string) => {
    switch (componentName) {
      case 'database':
        return <Database className="w-5 h-5 text-blue-500" />;
      case 'redis':
        return <Zap className="w-5 h-5 text-red-500" />;
      case 'worker':
        return <Cpu className="w-5 h-5 text-purple-500" />;
      case 'api':
        return <Server className="w-5 h-5 text-green-500" />;
      default:
        return <Server className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className={`bg-white border-2 rounded-lg p-6 ${getStatusColor(component.status)}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getComponentIcon(component.component)}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 capitalize">
              {component.component}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {getStatusIcon(component.status)}
              <span className="text-sm font-medium text-gray-700">{component.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-2">
        {component.responseTime !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Response Time:</span>
            <span className="font-medium text-gray-900">
              {component.responseTime.toFixed(0)}ms
            </span>
          </div>
        )}

        {component.uptime !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Uptime:</span>
            <span className="font-medium text-gray-900">
              {component.uptime.toFixed(2)} hours
            </span>
          </div>
        )}

        {component.errorMessage && (
          <div className="mt-3 p-2 bg-red-100 rounded text-sm text-red-700">
            <strong>Error:</strong> {component.errorMessage}
          </div>
        )}

        {component.metadata && (
          <details className="mt-3">
            <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
              View Details
            </summary>
            <div className="mt-2 p-3 bg-gray-100 rounded text-xs">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(component.metadata, null, 2)}
              </pre>
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

export default SystemHealthTab;

