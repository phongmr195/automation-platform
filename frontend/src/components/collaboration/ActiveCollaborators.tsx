import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { collaborationApi } from '../../services/collaborationApi';

interface ActiveCollaboratorsProps {
  workflowId: string;
}

export const ActiveCollaborators = ({ workflowId }: ActiveCollaboratorsProps) => {
  const { data: collaborators = [] } = useQuery({
    queryKey: ['collaborators', workflowId, 'active'],
    queryFn: () => collaborationApi.getActiveCollaborators(workflowId),
    enabled: !!workflowId,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const activeCollaborators = collaborators.filter(c => c.isActive);

  if (activeCollaborators.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
      <Users className="w-4 h-4 text-gray-500" />
      <div className="flex -space-x-2">
        {activeCollaborators.slice(0, 5).map((collaborator) => (
          <div
            key={collaborator.userId}
            className="relative group"
            title={collaborator.user.name || collaborator.user.email}
          >
            {collaborator.user.avatar ? (
              <img
                src={collaborator.user.avatar}
                alt={collaborator.user.name || collaborator.user.email}
                className="w-8 h-8 rounded-full border-2 border-white"
              />
            ) : (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                {(collaborator.user.name || collaborator.user.email).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              {collaborator.user.name || collaborator.user.email}
              {collaborator.permission !== 'VIEW' && (
                <span className="ml-1 text-gray-400">• {collaborator.permission}</span>
              )}
            </div>
          </div>
        ))}
        {activeCollaborators.length > 5 && (
          <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold">
            +{activeCollaborators.length - 5}
          </div>
        )}
      </div>
      <span className="text-sm text-gray-600">
        {activeCollaborators.length} {activeCollaborators.length === 1 ? 'user' : 'users'} active
      </span>
    </div>
  );
};
