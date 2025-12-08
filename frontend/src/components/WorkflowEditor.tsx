import { Save, Play, Calendar, Folder, MessageSquare, Activity } from 'lucide-react';
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
import { ActiveCollaborators, CommentsPanel, ActivityFeed, NotificationCenter, CursorOverlay } from './collaboration';
import { useCollaboration } from '../hooks/collaboration';
import { useCurrentUser } from '../hooks/useCurrentUser';

export default function WorkflowEditor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialFolderId = searchParams.get('folderId');
  const commentId = searchParams.get('commentId'); // Get commentId from URL
  const { workflow, nodes, connections, updateMetadata, setWorkflow, clear } = useWorkflowStore();
  const [showScheduler, setShowScheduler] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId);
  const [showComments, setShowComments] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const currentUser = useCurrentUser();

  // Fetch folders
  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => workflowApi.getFolders(),
  });

  // Collaboration hook - only enable for saved workflows
  const { cursors } = useCollaboration({
    workflowId: workflow?.id || '',
    userId: currentUser?.id || '',
    userName: currentUser?.name || currentUser?.email || 'Anonymous',
    enabled: !!workflow?.id && !!currentUser,
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

  // Auto-open comments panel if commentId is in URL
  useEffect(() => {
    if (commentId && workflow?.id) {
      setShowComments(true);
      
      // Scroll to comment after a short delay to ensure panel is rendered
      setTimeout(() => {
        const commentElement = document.getElementById(`comment-${commentId}`);
        if (commentElement) {
          commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight the comment briefly
          commentElement.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
          setTimeout(() => {
            commentElement.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
          }, 2000);
        }
      }, 500);
    }
  }, [commentId, workflow?.id]);

  const saveWorkflowMutation = useMutation({
    mutationFn: async () => {
      const workflowData = {
        name: workflow?.name || 'New Workflow',
        definition: {
          nodes,
          edges: connections, // Convert connections to edges
        },
        folderId: selectedFolderId || null, // Always include folderId for both create and update
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
            {folders.length > 0 && (
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
          {/* Notification Center */}
          <NotificationCenter />
          
          {/* Active Collaborators - Only show for saved workflows */}
          {workflow?.id && <ActiveCollaborators workflowId={workflow.id} />}
          
          {/* Comments Toggle */}
          {workflow?.id && (
            <button
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                showComments 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Comments"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}
          
          {/* Activity Toggle */}
          {workflow?.id && (
            <button
              onClick={() => setShowActivity(!showActivity)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                showActivity 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Activity"
            >
              <Activity className="w-4 h-4" />
            </button>
          )}
          
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
        <div className="flex-1 relative">
          <WorkflowCanvas />
          {/* Cursor Overlay for real-time collaboration */}
          {workflow?.id && cursors.length > 0 && (
            <CursorOverlay cursors={cursors} />
          )}
        </div>
        
        {/* Comments Panel */}
        {showComments && workflow?.id && currentUser && (
          <div className="w-96 flex flex-col border-l border-gray-200">
            <CommentsPanel 
              workflowId={workflow.id}
              currentUserId={currentUser.id}
              onClose={() => setShowComments(false)}
            />
          </div>
        )}
        
        {/* Activity Panel */}
        {showActivity && workflow?.id && (
          <div className="w-96 border-l border-gray-200 bg-white overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Activity</h3>
              <button
                onClick={() => setShowActivity(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <ActivityFeed workflowId={workflow.id} />
          </div>
        )}
        
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
