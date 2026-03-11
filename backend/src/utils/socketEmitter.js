import { getIO, isSocketInitialized } from '../socket.js';

export const emitNotification = (userKey, payload) => {
  if (!isSocketInitialized()) return false;

  const io = getIO();
  io.to(userKey).emit('notification', payload);
  return true;
};
