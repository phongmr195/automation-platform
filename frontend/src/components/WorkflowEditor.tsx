import { Save, Play, Calendar, Folder } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { workflowApi } from '../services/api';
import { useWorkflowStore } from '../stores/workflowStore';
import { toast } from '../utils/alerts';
import NodePalette from './NodePalette';
import WorkflowCanvas from './WorkflowCanvas';
import NodeConfigPanel from './NodeConfigPanel';
import AdvancedScheduler from './AdvancedScheduler';
import { VersionControlToolbar } from './version-control';

export default function WorkflowEditor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialFolderId = searchParams.get('folderId');
  const { workflow, nodes, connections, updateMetadata, setWorkflow, clear } = useWorkflowStore();
  const [showScheduler, setShowScheduler] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId);

  // Fetch folders
  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => workflowApi.getFolders(),
  });

  // Load workflow if editing existing one
  const { data: existingWorkflow } = useQuery({
    queryKey: ['workflow', id],
    queryFn: () => workflowApi.getWorkflow(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (existingWorkflow) {
      setWorkflow(existingWorkflow);
      setSelectedFolderId(existingWorkflow.folderId || null);
    } else if (!id) {
      clear();
    }
  }, [existingWorkflow, id, setWorkflow, clear]);

  const saveWorkflowMutation = useMutation({
    mutationFn: async () => {
      const workflowData = {
        name: workflow?.name || 'New Workflow',
        definition: {
          nodes,
          edges: connections, // Convert connections to edges
        },
        ...(selectedFolderId && !workflow?.id && { folderId: selectedFolderId }) // Add folderId only when creating new workflow
      };

      if (workflow?.id) {
        return workflowApi.updateWorkflow(workflow.id, workflowData);
      } else {
        return workflowApi.createWorkflow(workflowData);
      }
    },
    onSuccess: () => {
      toast.success('Workflow đã được lưu thành công!');
    },
    onError: (error) => {
      toast.error('Lỗi lưu workflow: ' + String(error));
    },
  });

  const executeWorkflowMutation = useMutation({
    mutationFn: async () => {
      // Auto-save first if no ID
      let workflowId = workflow?.id;
      
      if (!workflowId) {
        const workflowData = {
          name: workflow?.name || 'New Workflow',
          definition: {
            nodes,
            edges: connections,
          }
        };
        
        const result = await workflowApi.createWorkflow(workflowData);
        workflowId = result.workflow.id;
      }
      
      return workflowApi.executeWorkflow(workflowId);
    },
    onSuccess: () => {
      toast.success('Workflow đã được thực thi thành công!');
    },
    onError: (error) => {
      toast.error('Lỗi thực thi workflow: ' + String(error));
    },
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={workflow?.name || 'Build Workflow'}
              onChange={(e) => updateMetadata({ name: e.target.value })}
              className="text-xl font-semibold border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
            />
            
            {/* Folder Selector */}
            {!workflow?.id && folders.length > 0 && (
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-gray-400" />
                <select
                  value={selectedFolderId || ''}
                  onChange={(e) => setSelectedFolderId(e.target.value || null)}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No folder</option>
                  {folders.map((folder: any) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Show current folder for existing workflows */}
            {workflow?.id && selectedFolderId && (
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded text-sm text-gray-700">
                <Folder className="w-4 h-4" />
                <span>{folders.find((f: any) => f.id === selectedFolderId)?.name || 'Unknown folder'}</span>
              </div>
            )}
          </div>
          
          <input
            type="text"
            value={workflow?.description || ''}
            onChange={(e) => updateMetadata({ description: e.target.value })}
            placeholder="Add description..."
            className="block text-sm text-gray-500 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 mt-1"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {/* Version Control Toolbar - Only show if workflow is saved */}
          {workflow?.id && (
            <VersionControlToolbar 
              workflowId={workflow.id}
              currentNodes={nodes}
              currentConnections={connections}
              currentSettings={workflow?.settings}
              currentTriggers={workflow?.triggers || []}
            />
          )}
          
          {/* Schedule Button - Only show if workflow is saved */}
          {workflow?.id && (
            <button
              onClick={() => setShowScheduler(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
              title="Configure advanced scheduling"
            >
              <Calendar className="w-4 h-4" />
              Schedule
            </button>
          )}
          
          <button
            onClick={() => executeWorkflowMutation.mutate()}
            disabled={executeWorkflowMutation.isPending || nodes.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            {executeWorkflowMutation.isPending ? 'Running...' : 'Run'}
          </button>
          
          <button
            onClick={() => saveWorkflowMutation.mutate()}
            disabled={saveWorkflowMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saveWorkflowMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <NodePalette />
        <div className="flex-1">
          <WorkflowCanvas />
        </div>
        <NodeConfigPanel />
      </div>

      {/* Advanced Scheduler Modal */}
      {showScheduler && workflow?.id && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-auto m-4">
            <AdvancedScheduler 
              workflowId={workflow.id}
              onClose={() => setShowScheduler(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
