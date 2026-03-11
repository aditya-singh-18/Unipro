import express from 'express';
import {
  getMyNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notification.controller.js';

import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', authenticate, getMyNotifications);
router.get('/unread-count', authenticate, getUnreadCount);
router.post('/read', authenticate, markNotificationRead);
router.post('/read-all', authenticate, markAllNotificationsRead);

export default router;
