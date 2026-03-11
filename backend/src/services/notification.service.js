import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../repositories/notification.repo.js';
import { createNotification } from '../repositories/notification.repo.js';
import { emitNotification } from '../utils/socketEmitter.js';

export const pushNotification = async ({
  userKey,
  role,
  title,
  message,
}) => {
  await createNotification({
    userKey,
    role,
    title,
    message,
  });

  // 🔴 REAL-TIME PUSH
  emitNotification(userKey, {
    title,
    message,
    created_at: new Date(),
  });
};

export const getMyNotificationsService = async (userKey) => {
  return await getUserNotifications(userKey);
};

export const getUnreadCountService = async (userKey) => {
  return await getUnreadNotificationCount(userKey);
};

export const markAsReadService = async (notificationId, userKey) => {
  if (!notificationId) {
    throw new Error('notificationId is required');
  }
  await markNotificationAsRead(notificationId, userKey);
};

export const markAllAsReadService = async (userKey) => {
  await markAllNotificationsAsRead(userKey);
};
