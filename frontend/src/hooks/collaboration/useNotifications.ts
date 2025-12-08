import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collaborationApi } from '../../services/collaborationApi';

export const useNotifications = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => collaborationApi.getNotifications(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const notifications = data?.notifications || [];
  const unreadCount = notifications.filter(n => !n.isRead && !n.read).length;

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      collaborationApi.markNotificationAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => collaborationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const dismissNotificationMutation = useMutation({
    mutationFn: (notificationId: string) =>
      collaborationApi.dismissNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    dismissNotification: dismissNotificationMutation.mutate,
  };
};
