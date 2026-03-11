import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });

  // 🔐 JWT AUTH MIDDLEWARE
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      // attach user to socket
      socket.user = {
        user_key: decoded.user_key,
        role: decoded.role,
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
    if (role === 'admin') {
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
