import pool from '../config/db.js';

/* =========================
   CREATE NOTIFICATION (internal)
========================= */
export const createNotification = async ({
  userKey,
  role,
  title,
  message,
}) => {
  const q = `
    INSERT INTO notifications (
      user_key,
      role,
      title,
      message
    )
    VALUES ($1, $2, $3, $4)
  `;
  await pool.query(q, [userKey, role, title, message]);
};

/* =========================
   GET USER NOTIFICATIONS
========================= */
export const getUserNotifications = async (userKey) => {
  const q = `
    SELECT id, title, message, is_read, created_at
    FROM notifications
    WHERE user_key = $1
    ORDER BY created_at DESC
  `;
  const r = await pool.query(q, [userKey]);
  return r.rows;
};

/* =========================
   UNREAD COUNT
========================= */
export const getUnreadNotificationCount = async (userKey) => {
  const q = `
    SELECT COUNT(*)::int AS count
    FROM notifications
    WHERE user_key = $1
      AND is_read = false
  `;
  const r = await pool.query(q, [userKey]);
  return r.rows[0].count;
};

/* =========================
   MARK ONE AS READ
========================= */
export const markNotificationAsRead = async (notificationId, userKey) => {
  const q = `
    UPDATE notifications
    SET is_read = true
    WHERE id = $1 AND user_key = $2
  `;
  await pool.query(q, [notificationId, userKey]);
};

/* =========================
   MARK ALL AS READ
========================= */
export const markAllNotificationsAsRead = async (userKey) => {
  const q = `
    UPDATE notifications
    SET is_read = true
    WHERE user_key = $1
  `;
  await pool.query(q, [userKey]);
};
