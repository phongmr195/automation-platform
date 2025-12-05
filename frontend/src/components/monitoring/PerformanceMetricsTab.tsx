import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Clock, Zap } from 'lucide-react';
import { getAggregatedMetrics } from '../../services/monitoringApi';

const PerformanceMetricsTab: React.FC = () => {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week'>('day');

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        const data = await getAggregatedMetrics('api_response_time', {
          startDate,
          endDate,
          groupBy: timeRange,
        });
        setMetrics(data || []);
      } catch (err) {
        console.error('Failed to fetch metrics:', err);
        setMetrics([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [timeRange]);

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
        <h2 className="text-xl font-semibold text-gray-900">Performance Metrics</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          <option value="hour">Hourly</option>
          <option value="day">Daily</option>
          <option value="week">Weekly</option>
        </select>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Avg Response Time"
          value={
            metrics.length > 0
              ? `${(metrics.reduce((sum, m) => sum + m.avg, 0) / metrics.length).toFixed(0)}ms`
              : 'N/A'
          }
          icon={<Clock className="w-6 h-6 text-blue-500" />}
          trend="+5%"
        />
        <MetricCard
          title="P95 Response Time"
          value={
            metrics.length > 0
              ? `${(metrics.reduce((sum, m) => sum + m.p95, 0) / metrics.length).toFixed(0)}ms`
              : 'N/A'
          }
          icon={<TrendingUp className="w-6 h-6 text-green-500" />}
          trend="-2%"
        />
        <MetricCard
          title="Total Requests"
          value={
            metrics.length > 0
              ? metrics.reduce((sum, m) => sum + m.count, 0).toLocaleString()
              : 'N/A'
          }
          icon={<Zap className="w-6 h-6 text-yellow-500" />}
          trend="+12%"
        />
        <MetricCard
          title="Peak Response"
          value={
            metrics.length > 0
              ? `${Math.max(...metrics.map((m) => m.max)).toFixed(0)}ms`
              : 'N/A'
          }
          icon={<BarChart3 className="w-6 h-6 text-red-500" />}
          trend="-8%"
        />
      </div>

      {/* Chart Placeholder */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Time Trends</h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
          <p className="text-gray-500">Chart visualization would go here</p>
        </div>
      </div>

      {/* Metrics Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Requests
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg (ms)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                P50 (ms)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                P95 (ms)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                P99 (ms)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {metrics.map((metric, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {metric.timestamp}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {metric.count.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {metric.avg.toFixed(0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {metric.p50.toFixed(0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {metric.p95.toFixed(0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {metric.p99.toFixed(0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
}> = ({ title, value, icon, trend }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-between mb-2">
      {icon}
      <span
        className={`text-sm font-medium ${
          trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {trend}
      </span>
    </div>
    <p className="text-sm text-gray-600 mb-1">{title}</p>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

export default PerformanceMetricsTab;

