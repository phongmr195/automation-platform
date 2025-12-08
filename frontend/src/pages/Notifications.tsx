import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { collaborationApi } from '../services/collaborationApi';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, Trash2, CheckCheck, Filter } from 'lucide-react';
import { toast } from 'sonner';

type FilterType = 'all' | 'unread' | 'read';

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => collaborationApi.getNotifications(),
    refetchInterval: 30000, // Refetch every 30s
  });

  // Handle both array and object response formats
  const notifications = Array.isArray(data) ? data : (data?.notifications || []);

  const markAsReadMutation = useMutation({
    mutationFn: collaborationApi.markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: collaborationApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  const dismissMutation = useMutation({
    mutationFn: collaborationApi.dismissNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification dismissed');
    },
  });

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDismiss = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    dismissMutation.mutate(notificationId);
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'read') return notification.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
              <p className="text-gray-600 mt-1">
                {unreadCount > 0 ? (
                  <>
                    You have <span className="font-semibold">{unreadCount}</span> unread{' '}
                    {unreadCount === 1 ? 'notification' : 'notifications'}
                  </>
                ) : (
                  'All caught up!'
                )}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all as read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            {(['all', 'unread', 'read'] as FilterType[]).map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-4 py-2 font-medium capitalize transition-colors ${
                  filter === filterType
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {filterType}
                {filterType === 'unread' && unreadCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
            </h3>
            <p className="text-gray-600">
              {filter === 'unread'
                ? 'All your notifications have been read'
                : 'You don\'t have any notifications yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`group relative p-4 rounded-lg border transition-all cursor-pointer ${
                  notification.read
                    ? 'bg-white border-gray-200 hover:border-gray-300'
                    : 'bg-blue-50 border-blue-200 hover:border-blue-300 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      notification.read ? 'bg-gray-100' : 'bg-blue-100'
                    }`}
                  >
                    <Bell
                      className={`w-5 h-5 ${
                        notification.read ? 'text-gray-600' : 'text-blue-600'
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4
                          className={`text-sm font-semibold ${
                            notification.read ? 'text-gray-900' : 'text-gray-900'
                          }`}
                        >
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      </div>

                      {/* Dismiss button */}
                      <button
                        onClick={(e) => handleDismiss(e, notification.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
                        title="Dismiss"
                      >
                        <Trash2 className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </span>

                      {!notification.read && (
                        <span className="flex items-center gap-1 text-xs text-blue-600">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          Unread
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Read indicator */}
                {!notification.read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsReadMutation.mutate(notification.id);
                    }}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-100 rounded transition-all"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4 text-blue-600" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Load More (if pagination needed in future) */}
        {filteredNotifications.length > 0 && (
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              Showing {filteredNotifications.length} of {notifications.length} notifications
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
