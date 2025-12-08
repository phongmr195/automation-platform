import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collaborationApi } from '../../services/collaborationApi';

interface MentionAutocompleteProps {
  workflowId: string;
  searchQuery: string;
  position: { top: number; left: number };
  onSelect: (username: string, userEmail: string) => void;
  onClose: () => void;
}

export const MentionAutocomplete = ({
  workflowId,
  searchQuery,
  position,
  onSelect,
  onClose,
}: MentionAutocompleteProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch collaborators for the workflow
  const { data: collaborators = [], isLoading, error } = useQuery({
    queryKey: ['collaborators', workflowId],
    queryFn: () => collaborationApi.getCollaborators(workflowId),
    enabled: !!workflowId,
  });

  // Filter collaborators based on search query
  const filteredUsers = collaborators.filter((collab) => {
    const query = searchQuery.toLowerCase();
    const name = (collab.user.name || '').toLowerCase();
    const email = collab.user.email.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < filteredUsers.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredUsers[selectedIndex]) {
          handleSelect(filteredUsers[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, filteredUsers, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (menuRef.current) {
      const selectedElement = menuRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleSelect = (collab: any) => {
    const username = collab.user.email.split('@')[0]; // Use email prefix as username
    onSelect(username, collab.user.email);
  };

  if (isLoading) {
    return (
      <div
        ref={menuRef}
        className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4"
        style={{
          bottom: `${window.innerHeight - position.top}px`,
          left: `${position.left}px`,
          minWidth: '250px',
        }}
      >
        <div className="text-sm text-gray-500">Loading users...</div>
      </div>
    );
  }

  if (filteredUsers.length === 0) {
    return (
      <div
        ref={menuRef}
        className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4"
        style={{
          bottom: `${window.innerHeight - position.top}px`,
          left: `${position.left}px`,
          minWidth: '250px',
        }}
      >
        <div className="text-sm text-gray-500">
          {collaborators.length === 0 
            ? 'No collaborators found. Add collaborators to this workflow first.' 
            : `No users matching "${searchQuery}"`
          }
        </div>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto"
      style={{
        bottom: `${window.innerHeight - position.top}px`,
        left: `${position.left}px`,
        minWidth: '280px',
      }}
    >
      {filteredUsers.map((collab, index) => (
        <button
          key={collab.userId}
          onClick={() => handleSelect(collab)}
          className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
            index === selectedIndex
              ? 'bg-blue-50 text-blue-700'
              : 'hover:bg-gray-50 text-gray-700'
          }`}
        >
          {/* Avatar */}
          {collab.user.avatar ? (
            <img
              src={collab.user.avatar}
              alt={collab.user.name || collab.user.email}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
              {(collab.user.name || collab.user.email).charAt(0).toUpperCase()}
            </div>
          )}

          {/* User info */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">
              {collab.user.name || collab.user.email.split('@')[0]}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {collab.user.email}
            </div>
          </div>

          {/* Permission badge */}
          <span className="text-xs text-gray-400 uppercase">
            {collab.permission}
          </span>
        </button>
      ))}
    </div>
  );
};
