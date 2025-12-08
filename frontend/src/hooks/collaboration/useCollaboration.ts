import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface CollaborationEvent {
  type: string;
  workflowId: string;
  data: any;
  timestamp: string;
}

export interface CursorPosition {
  userId: string;
  userName: string;
  x: number;
  y: number;
  color: string;
}

export interface ActiveUser {
  userId: string;
  userName: string;
  color: string;
  lastActivity: string;
}

interface UseCollaborationOptions {
  workflowId: string;
  userId: string;
  userName: string;
  onEvent?: (event: CollaborationEvent) => void;
  enabled?: boolean;
}

export const useCollaboration = ({
  workflowId,
  userId,
  userName,
  onEvent,
  enabled = true,
}: UseCollaborationOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    if (!enabled || !workflowId) return;

    // Connect to backend WebSocket server
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_API_URL?.replace(/^https?:\/\//, '') || 'localhost:3000';
    const wsUrl = `${protocol}//${host}/ws`;
    
    console.log('[WebSocket] Connecting to:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected for collaboration');
      setIsConnected(true);
      
      // Join workflow room
      ws.send(JSON.stringify({
        type: 'join_workflow',
        workflowId,
        userId,
        userName,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle collaboration events
        if (message.type?.startsWith('collaborator.') || 
            message.type?.startsWith('comment.') ||
            message.type?.startsWith('activity.') ||
            message.type?.startsWith('notification.') ||
            message.type?.startsWith('presence.')) {
          
          handleCollaborationEvent(message);
          onEvent?.(message);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Attempt to reconnect after 3 seconds
      if (enabled) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      }
    };
  }, [workflowId, userId, userName, enabled, onEvent]);

  const handleCollaborationEvent = useCallback((event: CollaborationEvent) => {
    const { type, data } = event;
    console.log('[Collaboration Event]', type, data);

    switch (type) {
      case 'collaborator.added':
      case 'collaborator.removed':
      case 'presence.updated':
        // Invalidate collaborators query
        queryClient.invalidateQueries({ 
          queryKey: ['collaborators', workflowId] 
        });
        
        if (type === 'presence.updated' && data.activeUsers) {
          setActiveUsers(data.activeUsers);
        }
        break;

      case 'comment.created':
      case 'comment.updated':
      case 'comment.deleted':
      case 'comment.resolved':
      case 'comment.reaction_added':
        // Invalidate comments query
        queryClient.invalidateQueries({ 
          queryKey: ['comments', workflowId] 
        });
        break;

      case 'activity.created':
        // Invalidate activity feed
        queryClient.invalidateQueries({ 
          queryKey: ['activity', workflowId] 
        });
        break;

      case 'notification.created':
        // Invalidate notifications
        queryClient.invalidateQueries({ 
          queryKey: ['notifications'] 
        });
        break;

      case 'presence.cursor_moved':
        if (data.userId !== userId) {
          setCursors(prev => {
            const next = new Map(prev);
            next.set(data.userId, {
              userId: data.userId,
              userName: data.userName,
              x: data.x,
              y: data.y,
              color: data.color || getRandomColor(data.userId),
            });
            return next;
          });

          // Remove cursor after 3 seconds of inactivity
          setTimeout(() => {
            setCursors(prev => {
              const next = new Map(prev);
              next.delete(data.userId);
              return next;
            });
          }, 3000);
        }
        break;
    }
  }, [queryClient, workflowId, userId]);

  const sendCursorPosition = useCallback((x: number, y: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'cursor_move',
        workflowId,
        userId,
        userName,
        x,
        y,
      }));
    }
  }, [workflowId, userId, userName]);

  const updatePresence = useCallback((status: 'active' | 'away') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'presence_update',
        workflowId,
        userId,
        status,
      }));
    }
  }, [workflowId, userId]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        // Leave workflow room before closing
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'leave_workflow',
            workflowId,
            userId,
          }));
        }
        wsRef.current.close();
      }
    };
  }, [connect, workflowId, userId]);

  return {
    isConnected,
    activeUsers,
    cursors: Array.from(cursors.values()),
    sendCursorPosition,
    updatePresence,
  };
};

// Helper function to generate consistent colors for users
const getRandomColor = (userId: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8B739', '#52BE80', '#EC7063', '#5DADE2'
  ];
  
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
};
