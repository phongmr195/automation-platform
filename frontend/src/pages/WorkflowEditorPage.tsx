import { useState } from 'react';
import { Play, History, Code, Bug } from 'lucide-react';
import WorkflowCanvas from '../components/WorkflowCanvas';
import ExecutionHistory from '../components/ExecutionHistory';
import VariableInspector from '../components/VariableInspector';
import DebugControls from '../components/DebugControls';
import NodePalette from '../components/NodePalette';
import NodeConfigPanel from '../components/NodeConfigPanel';
import { useWorkflowStore } from '../stores/workflowStore';
import { engineApi } from '../services/api';
import { toast } from '../utils/alerts';

type Tab = 'canvas' | 'history' | 'inspector' | 'debug';

interface NodeData {
  nodeId: string;
  nodeName: string;
  input?: any;
  output?: any;
  error?: string;
  duration?: number;
  status: 'pending' | 'running' | 'success' | 'error';
}

export default function WorkflowEditorPage() {
  const [activeTab, setActiveTab] = useState<Tab>('canvas');
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [debugState, setDebugState] = useState<'idle' | 'running' | 'paused' | 'stopped'>('idle');
  const [breakpoints, setBreakpoints] = useState<Set<string>>(new Set());
  const [currentNodeId, setCurrentNodeId] = useState<string>();
  const [executionData, setExecutionData] = useState<NodeData[]>([]);
  
  const { workflow, nodes } = useWorkflowStore();

  function handleToggleBreakpoint(nodeId: string) {
    const newBreakpoints = new Set(breakpoints);
    if (newBreakpoints.has(nodeId)) {
      newBreakpoints.delete(nodeId);
    } else {
      newBreakpoints.add(nodeId);
    }
    setBreakpoints(newBreakpoints);
  }

  async function handleExecute() {
    if (!workflow?.id) return;

    try {
      toast.info('Executing workflow...');
      const response = await engineApi.post(`/workflows/${workflow.id}/execute`, {});
      
      if (response.data.execution) {
        toast.success('Workflow executed successfully');
        
        // Convert node results to execution data
        const nodeResults = response.data.execution.nodeResults || {};
        const execData: NodeData[] = Object.entries(nodeResults).map(([nodeId, result]: [string, any]) => {
          const node = nodes.find(n => n.id === nodeId);
          return {
            nodeId,
            nodeName: node?.name || nodeId,
            output: result,
            status: 'success' as const,
          };
        });
        setExecutionData(execData);
        setActiveTab('inspector');
      }
    } catch (error: any) {
      console.error('Execution failed:', error);
      toast.error(error.response?.data?.error || 'Execution failed');
    }
  }

  async function handleRetry(execution: any) {
    try {
      toast.info('Retrying execution...');
      const response = await engineApi.post(`/executions/${execution.id}/retry`, {});
      toast.success('Execution retried successfully');
      
      // Update execution data
      if (response.data.execution?.nodeResults) {
        const nodeResults = response.data.execution.nodeResults;
        const execData: NodeData[] = Object.entries(nodeResults).map(([nodeId, result]: [string, any]) => {
          const node = nodes.find(n => n.id === nodeId);
          return {
            nodeId,
            nodeName: node?.name || nodeId,
            output: result,
            status: 'success' as const,
          };
        });
        setExecutionData(execData);
        setActiveTab('inspector');
      }
    } catch (error: any) {
      console.error('Retry failed:', error);
      toast.error(error.response?.data?.error || 'Retry failed');
    }
  }

  async function handleReplay(execution: any) {
    try {
      toast.info('Replaying execution...');
      const response = await engineApi.post(`/executions/${execution.id}/replay`, {});
      toast.success('Execution replayed successfully');
      
      // Update execution data
      if (response.data.execution?.nodeResults) {
        const nodeResults = response.data.execution.nodeResults;
        const execData: NodeData[] = Object.entries(nodeResults).map(([nodeId, result]: [string, any]) => {
          const node = nodes.find(n => n.id === nodeId);
          return {
            nodeId,
            nodeName: node?.name || nodeId,
            output: result,
            status: 'success' as const,
          };
        });
        setExecutionData(execData);
        setActiveTab('inspector');
      }
    } catch (error: any) {
      console.error('Replay failed:', error);
      toast.error(error.response?.data?.error || 'Replay failed');
    }
  }

  // Debug Controls Handlers
  function handleToggleDebugMode() {
    setIsDebugMode(!isDebugMode);
    if (isDebugMode) {
      setDebugState('idle');
      setCurrentNodeId(undefined);
    }
  }

  function handleDebugPlay() {
    setDebugState('running');
    // Implement step-by-step execution logic
    toast.info('Debug mode: Running...');
  }

  function handleDebugPause() {
    setDebugState('paused');
    toast.info('Debug mode: Paused');
  }

  function handleDebugStep() {
    // Execute one node at a time
    toast.info('Debug mode: Stepping to next node');
  }

  function handleDebugStop() {
    setDebugState('stopped');
    setCurrentNodeId(undefined);
    toast.info('Debug mode: Stopped');
  }

  function handleDebugReset() {
    setDebugState('idle');
    setCurrentNodeId(undefined);
    setExecutionData([]);
    toast.info('Debug mode: Reset');
  }

  const tabs = [
    { id: 'canvas' as Tab, label: 'Canvas', icon: Play },
    { id: 'history' as Tab, label: 'History', icon: History },
    { id: 'inspector' as Tab, label: 'Variables', icon: Code },
    { id: 'debug' as Tab, label: 'Debug', icon: Bug },
  ];

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">{workflow?.name || 'Workflow Editor'}</h1>
            {workflow?.description && (
              <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
            )}
          </div>
          
          <button
            onClick={handleExecute}
            disabled={!workflow?.id || nodes.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5" />
            Execute Workflow
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'canvas' && (
          <div className="flex-1 flex">
            <div className="w-64 border-r border-gray-200 overflow-y-auto">
              <NodePalette />
            </div>
            
            <div className="flex-1 relative">
              <WorkflowCanvas />
            </div>
            
            <div className="w-80 border-l border-gray-200 overflow-y-auto">
              <NodeConfigPanel />
            </div>
          </div>
        )}

        {activeTab === 'history' && workflow?.id && (
          <div className="flex-1 overflow-y-auto p-6">
            <ExecutionHistory
              workflowId={workflow.id}
              onRetry={handleRetry}
              onReplay={handleReplay}
            />
          </div>
        )}

        {activeTab === 'inspector' && (
          <div className="flex-1 overflow-y-auto p-6">
            <VariableInspector
              executionData={executionData}
              selectedNodeId={currentNodeId}
              onSelectNode={setCurrentNodeId}
            />
          </div>
        )}

        {activeTab === 'debug' && (
          <div className="flex-1 flex">
            <div className="w-80 border-r border-gray-200 p-4 overflow-y-auto">
              <DebugControls
                isDebugMode={isDebugMode}
                debugState={debugState}
                currentNodeId={currentNodeId}
                breakpoints={breakpoints}
                onToggleDebugMode={handleToggleDebugMode}
                onPlay={handleDebugPlay}
                onPause={handleDebugPause}
                onStep={handleDebugStep}
                onStop={handleDebugStop}
                onReset={handleDebugReset}
                onToggleBreakpoint={handleToggleBreakpoint}
              />
            </div>
            
            <div className="flex-1 p-6">
              <div className="grid grid-cols-2 gap-6 h-full">
                <div className="overflow-hidden">
                  <WorkflowCanvas />
                </div>
                <div className="overflow-y-auto">
                  <VariableInspector
                    executionData={executionData}
                    selectedNodeId={currentNodeId}
                    onSelectNode={setCurrentNodeId}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
