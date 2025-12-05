import React, { useState } from 'react';
import { Activity, Server, AlertTriangle, BarChart3, Bug, GitBranch } from 'lucide-react';
import SystemHealthTab from '../components/monitoring/SystemHealthTab';
import UptimeMonitorsTab from '../components/monitoring/UptimeMonitorsTab';
import PerformanceMetricsTab from '../components/monitoring/PerformanceMetricsTab';
import ErrorTrackingTab from '../components/monitoring/ErrorTrackingTab';

type TabType = 'health' | 'uptime' | 'performance' | 'errors';

const Monitoring: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('health');

  const tabs: Array<{
    id: TabType;
    label: string;
    icon: React.ReactNode;
    description: string;
  }> = [
    {
      id: 'health',
      label: 'System Health',
      icon: <Activity className="w-5 h-5" />,
      description: 'Monitor system components health status',
    },
    {
      id: 'uptime',
      label: 'Uptime Monitors',
      icon: <Server className="w-5 h-5" />,
      description: 'Track service availability and incidents',
    },
    {
      id: 'performance',
      label: 'Performance Metrics',
      icon: <BarChart3 className="w-5 h-5" />,
      description: 'View performance metrics and trends',
    },
    {
      id: 'errors',
      label: 'Error Tracking',
      icon: <Bug className="w-5 h-5" />,
      description: 'Track and manage application errors',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <GitBranch className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">System Monitoring</h1>
          </div>
          <p className="text-gray-600">
            Monitor system health, uptime, performance, and errors in real-time
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm
                    transition-colors duration-200
                    ${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Description */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              {tabs.find((t) => t.id === activeTab)?.description}
            </p>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'health' && <SystemHealthTab />}
          {activeTab === 'uptime' && <UptimeMonitorsTab />}
          {activeTab === 'performance' && <PerformanceMetricsTab />}
          {activeTab === 'errors' && <ErrorTrackingTab />}
        </div>
      </div>
    </div>
  );
};

export default Monitoring;

