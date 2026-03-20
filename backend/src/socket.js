import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { isTokenRevoked } from './utils/tokenBlacklist.js';
import pool from './config/db.js';

let io;

export const initSocket = (httpServer) => {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
  ].filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin && process.env.NODE_ENV !== 'production') return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`Socket CORS blocked: origin '${origin}' not allowed`));
      },
      credentials: true,
    },
  });

  // 🔐 JWT AUTH MIDDLEWARE
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      if (decoded?.jti) {
        const revoked = await isTokenRevoked(decoded.jti);
        if (revoked) {
          return next(new Error('Token has been revoked'));
        }
      }

      if (decoded?.token_version !== undefined && decoded?.user_key) {
        const versionResult = await pool.query(
          'SELECT token_version FROM users WHERE user_key = $1 LIMIT 1',
          [decoded.user_key]
        );

        if (versionResult.rowCount === 0) {
          return next(new Error('Invalid token user'));
        }

        const currentVersion = Number(versionResult.rows[0].token_version || 0);
        if (Number(decoded.token_version) !== currentVersion) {
          return next(new Error('Token has been invalidated'));
        }
      }

      // attach user to socket
      socket.user = {
        user_key: decoded.user_key,
        role: decoded.role,
        is_super_admin: decoded.is_super_admin === true,
      };

      return next();
    } catch (err) {
      return next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { user_key, role } = socket.user;

    // 👤 Auto join personal room
    socket.join(user_key);

    // ✅ ADMIN ROOM JOIN (YAHI LINE POORI QUERY KA ANSWER HAI)
    if (String(role).toUpperCase() === 'ADMIN') {
      socket.join('ADMIN_AUDIT_ROOM');
    }

    console.log(
      `🔌 Socket connected: ${socket.id} | user=${user_key} | role=${role}`
    );

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

export const isSocketInitialized = () => Boolean(io);
