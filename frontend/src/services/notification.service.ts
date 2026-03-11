import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

export interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const notificationService = {
  async getMyNotifications(): Promise<Notification[]> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No token found');
        return [];
      }
      console.log('🔔 Fetching notifications from:', `${API_URL}/notifications`);
      const response = await axios.get(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.notifications || [];
    } catch (error) {
      console.error('❌ Failed to fetch notifications:', error);
      return [];
    }
  },

  async getUnreadCount(): Promise<number> {
    try {
      const token = localStorage.getItem('token');
      if (!token) return 0;
      const response = await axios.get(`${API_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.count || 0;
    } catch (error) {
      console.error('❌ Failed to fetch unread count:', error);
      return 0;
    }
  },

  async markAsRead(notificationId: number): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await axios.post(
        `${API_URL}/notifications/read`,
        { notificationId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('❌ Failed to mark as read:', error);
    }
  },

  async markAllAsRead(): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await axios.post(
        `${API_URL}/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('❌ Failed to mark all as read:', error);
    }
  },
};
