import {
  getMyNotificationsService,
  getUnreadCountService,
  markAsReadService,
  markAllAsReadService,
} from '../services/notification.service.js';

export const getMyNotifications = async (req, res) => {
  try {
    const userKey = req.user.user_key;

    const notifications = await getMyNotificationsService(userKey);

    return res.status(200).json({
      notifications,
    });
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to fetch notifications',
    });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const userKey = req.user.user_key;

    const count = await getUnreadCountService(userKey);

    return res.status(200).json({ count });
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to fetch unread count',
    });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.body;
    const userKey = req.user.user_key;

    await markAsReadService(notificationId, userKey);

    return res.status(200).json({
      message: 'Notification marked as read',
    });
  } catch (err) {
    return res.status(400).json({
      message: err.message,
    });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const userKey = req.user.user_key;

    await markAllAsReadService(userKey);

    return res.status(200).json({
      message: 'All notifications marked as read',
    });
  } catch (err) {
    return res.status(500).json({
      message: 'Failed to update notifications',
    });
  }
};
