'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, Button, Select } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  CalendarCheck,
  CreditCard,
  Package,
  UserPlus,
  Wrench,
  Filter,
} from 'lucide-react';

interface Notification {
  id: string;
  group_id: string;
  type: 'service_request' | 'booking_confirmed' | 'payment_received' | 'low_stock' | 'new_customer';
  title: string;
  message: string;
  read: boolean;
  data: Record<string, unknown> | null;
  created_at: string;
}

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'service_request', label: 'Service Request' },
  { value: 'booking_confirmed', label: 'Booking Confirmed' },
  { value: 'payment_received', label: 'Payment Received' },
  { value: 'low_stock', label: 'Low Stock Alert' },
  { value: 'new_customer', label: 'New Customer' },
];

const TYPE_ICONS: Record<string, typeof Bell> = {
  service_request: Wrench,
  booking_confirmed: CalendarCheck,
  payment_received: CreditCard,
  low_stock: Package,
  new_customer: UserPlus,
};

const TYPE_COLORS: Record<string, string> = {
  service_request: 'bg-blue-100 text-blue-600',
  booking_confirmed: 'bg-green-100 text-green-600',
  payment_received: 'bg-emerald-100 text-emerald-600',
  low_stock: 'bg-red-100 text-red-600',
  new_customer: 'bg-purple-100 text-purple-600',
};

export default function NotificationsPage() {
  const { groupId, isLoading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    if (!authLoading) fetchNotifications();
  }, [authLoading]);

  // Poll for new notifications every 30s
  useEffect(() => {
    if (!groupId) return;
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [groupId]);

  const fetchNotifications = async () => {
    if (!groupId) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const matchesType = !typeFilter || n.type === typeFilter;
      const matchesRead = !showUnreadOnly || !n.read;
      return matchesType && matchesRead;
    });
  }, [notifications, typeFilter, showUnreadOnly]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const handleToggleRead = async (id: string, currentRead: boolean) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: !currentRead })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setNotifications(notifications.map((n) => (n.id === id ? data : n)));
    } catch (err) {
      console.error('Failed to update notification:', err);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds);

      if (error) throw error;
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('notifications').delete().eq('id', id);

      if (error) throw error;
      setNotifications(notifications.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  if (isLoading || authLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 font-medium">Failed to load notifications</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-500 text-white text-sm font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-gray-600 mt-1">Stay updated on important events</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          options={TYPE_OPTIONS}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-full sm:w-52"
        />
        <Button
          variant={showUnreadOnly ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setShowUnreadOnly(!showUnreadOnly)}
          className="sm:self-center"
        >
          <Filter className="w-4 h-4 mr-1" />
          {showUnreadOnly ? 'Showing Unread' : 'Show Unread Only'}
        </Button>
      </div>

      {/* Notification Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(TYPE_ICONS).map(([type, Icon]) => {
          const count = notifications.filter((n) => n.type === type).length;
          const unread = notifications.filter((n) => n.type === type && !n.read).length;
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                typeFilter === type ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${TYPE_COLORS[type]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-sm font-medium text-gray-900 mt-2">{count}</p>
              <p className="text-xs text-gray-500 capitalize">{type.replace('_', ' ')}</p>
              {unread > 0 && (
                <span className="text-xs text-red-500 font-medium">{unread} unread</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notification Feed */}
      <Card>
        <CardContent className="p-0">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <BellOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-600">
                {typeFilter || showUnreadOnly
                  ? 'Try adjusting your filters'
                  : 'You are all caught up'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => {
                const Icon = TYPE_ICONS[notification.type] || Bell;
                return (
                  <div
                    key={notification.id}
                    className={`p-4 flex items-start gap-3 transition-colors ${
                      notification.read ? 'bg-white' : 'bg-blue-50/50'
                    }`}
                  >
                    <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${TYPE_COLORS[notification.type] || 'bg-gray-100 text-gray-600'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`text-sm ${notification.read ? 'text-gray-900' : 'text-gray-900 font-semibold'}`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-0.5">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{getTimeAgo(notification.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleToggleRead(notification.id, notification.read)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                            title={notification.read ? 'Mark as unread' : 'Mark as read'}
                          >
                            {notification.read ? <Bell className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
