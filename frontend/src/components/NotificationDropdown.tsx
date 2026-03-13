"use client";

import { Bell, Check, CheckCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { notificationService, Notification } from "@/services/notification.service";
import { socketService } from "@/services/socket.service";

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load notifications
  const loadNotifications = async () => {
    try {
      const data = await notificationService.getMyNotifications();
      setNotifications(data);
      
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  // Initialize socket and load data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      socketService.connect(token);
      void Promise.resolve().then(() => loadNotifications());

      // Listen for real-time notifications
      const handleNewNotification = (data: unknown) => {
        const notification = data as { title: string; message: string; created_at: Date };

        setNotifications((prev) => [
          {
            id: Date.now(),
            title: notification.title,
            message: notification.message,
            is_read: false,
            created_at: new Date(notification.created_at).toISOString(),
          },
          ...prev,
        ]);
        setUnreadCount((prev) => prev + 1);

        // Show floating toast for real-time alerts
        const isDeadline =
          notification.title?.toLowerCase().includes('deadline') ||
          notification.title?.toLowerCase().includes('reminder') ||
          notification.title?.toLowerCase().includes('due');

        if (isDeadline) {
          toast.warning(notification.title, {
            description: notification.message,
          });
        } else {
          toast.info(notification.title, {
            description: notification.message,
          });
        }
      };

      socketService.on('notification', handleNewNotification);

      return () => {
        socketService.off('notification', handleNewNotification);
      };
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative hover:opacity-80 transition-opacity"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-xs rounded-full px-1.5 py-0.5 min-w-5 text-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white text-gray-700 rounded-lg shadow-xl overflow-hidden z-50 max-h-96 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{notification.title}</p>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0"></span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatTime(notification.created_at)}</p>
                    </div>
                    {!notification.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        className="text-blue-600 hover:text-blue-800 shrink-0"
                      >
                        <Check size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
