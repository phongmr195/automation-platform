import { useQuery } from '@tanstack/react-query';
import { Activity, MessageSquare, Play, CheckCircle2, XCircle, FolderOpen, Share2, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { collaborationApi } from '../../services/collaborationApi';
import type { WorkflowActivity } from '../../services/collaborationApi';

interface ActivityFeedProps {
  workflowId: string;
  limit?: number;
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  WORKFLOW_CREATED: <FolderOpen className="w-4 h-4" />,
  WORKFLOW_UPDATED: <Activity className="w-4 h-4" />,
  WORKFLOW_PUBLISHED: <Share2 className="w-4 h-4" />,
  WORKFLOW_UNPUBLISHED: <Share2 className="w-4 h-4" />,
  WORKFLOW_DELETED: <XCircle className="w-4 h-4" />,
  NODE_ADDED: <Activity className="w-4 h-4" />,
  NODE_UPDATED: <Activity className="w-4 h-4" />,
  NODE_DELETED: <Activity className="w-4 h-4" />,
  CONNECTION_ADDED: <Activity className="w-4 h-4" />,
  CONNECTION_DELETED: <Activity className="w-4 h-4" />,
  EXECUTION_STARTED: <Play className="w-4 h-4" />,
  EXECUTION_COMPLETED: <CheckCircle2 className="w-4 h-4" />,
  EXECUTION_FAILED: <XCircle className="w-4 h-4" />,
  COMMENT_ADDED: <MessageSquare className="w-4 h-4" />,
  COMMENT_RESOLVED: <CheckCircle2 className="w-4 h-4" />,
  COLLABORATOR_ADDED: <Users className="w-4 h-4" />,
  COLLABORATOR_REMOVED: <Users className="w-4 h-4" />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  WORKFLOW_CREATED: 'bg-green-100 text-green-600',
  WORKFLOW_UPDATED: 'bg-blue-100 text-blue-600',
  WORKFLOW_PUBLISHED: 'bg-purple-100 text-purple-600',
  WORKFLOW_UNPUBLISHED: 'bg-gray-100 text-gray-600',
  WORKFLOW_DELETED: 'bg-red-100 text-red-600',
  NODE_ADDED: 'bg-green-100 text-green-600',
  NODE_UPDATED: 'bg-blue-100 text-blue-600',
  NODE_DELETED: 'bg-red-100 text-red-600',
  CONNECTION_ADDED: 'bg-green-100 text-green-600',
  CONNECTION_DELETED: 'bg-red-100 text-red-600',
  EXECUTION_STARTED: 'bg-blue-100 text-blue-600',
  EXECUTION_COMPLETED: 'bg-green-100 text-green-600',
  EXECUTION_FAILED: 'bg-red-100 text-red-600',
  COMMENT_ADDED: 'bg-yellow-100 text-yellow-600',
  COMMENT_RESOLVED: 'bg-green-100 text-green-600',
  COLLABORATOR_ADDED: 'bg-purple-100 text-purple-600',
  COLLABORATOR_REMOVED: 'bg-gray-100 text-gray-600',
};

export const ActivityFeed = ({ workflowId, limit = 50 }: ActivityFeedProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['activity', workflowId, limit],
    queryFn: () => collaborationApi.getActivityFeed(workflowId, { limit }),
    enabled: !!workflowId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const activities = data?.activities || [];

  const getActivityDescription = (activity: WorkflowActivity): string => {
    const metadata = activity.metadata as any;
    
    switch (activity.activityType) {
      case 'WORKFLOW_CREATED':
        return 'created this workflow';
      case 'WORKFLOW_UPDATED':
        return metadata?.changes 
          ? `updated ${metadata.changes}` 
          : 'updated the workflow';
      case 'WORKFLOW_PUBLISHED':
        return 'published the workflow';
      case 'WORKFLOW_UNPUBLISHED':
        return 'unpublished the workflow';
      case 'NODE_ADDED':
        return `added ${metadata?.nodeType || 'a'} node`;
      case 'NODE_UPDATED':
        return `updated ${metadata?.nodeLabel || metadata?.nodeType || 'a'} node`;
      case 'NODE_DELETED':
        return `deleted ${metadata?.nodeLabel || metadata?.nodeType || 'a'} node`;
      case 'CONNECTION_ADDED':
        return 'added a connection';
      case 'CONNECTION_DELETED':
        return 'removed a connection';
      case 'EXECUTION_STARTED':
        return 'started an execution';
      case 'EXECUTION_COMPLETED':
        return 'completed an execution successfully';
      case 'EXECUTION_FAILED':
        return 'execution failed';
      case 'COMMENT_ADDED':
        return metadata?.content 
          ? `commented: "${metadata.content.substring(0, 50)}${metadata.content.length > 50 ? '...' : ''}"`
          : 'added a comment';
      case 'COMMENT_RESOLVED':
        return 'resolved a comment';
      case 'COLLABORATOR_ADDED':
        return `added ${metadata?.userName || 'a collaborator'}`;
      case 'COLLABORATOR_REMOVED':
        return `removed ${metadata?.userName || 'a collaborator'}`;
      default:
        return activity.activityType 
          ? activity.activityType.toLowerCase().replace(/_/g, ' ')
          : 'performed an action';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Activity className="w-12 h-12 mb-2 opacity-20" />
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        const activityType = activity.activityType || activity.type || 'UNKNOWN';
        const icon = ACTIVITY_ICONS[activityType] || <Activity className="w-4 h-4" />;
        const colorClass = ACTIVITY_COLORS[activityType] || 'bg-gray-100 text-gray-600';
        const description = getActivityDescription(activity);

        return (
          <div key={activity.id} className="flex gap-3">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                {icon}
              </div>
              {index < activities.length - 1 && (
                <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
              )}
            </div>

            {/* Activity content */}
            <div className="flex-1 pb-6">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {/* User avatar */}
                    {activity.user?.avatar ? (
                      <img
                        src={activity.user.avatar}
                        alt={activity.user.name || activity.user.email}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                        {(activity.user?.name || activity.user?.email || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    
                    <div>
                      <span className="font-medium text-sm text-gray-900">
                        {activity.user?.name || activity.user?.email || 'Unknown User'}
                      </span>
                      <span className="ml-1 text-sm text-gray-600">
                        {description}
                      </span>
                    </div>
                  </div>

                  {/* Metadata details */}
                  {activity.metadata && typeof activity.metadata === 'object' && (
                    <div className="mt-1 ml-8 text-xs text-gray-500">
                      {Object.entries(activity.metadata as Record<string, any>)
                        .filter(([key]) => !['changes', 'content', 'userName', 'nodeType', 'nodeLabel'].includes(key))
                        .map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>

                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
