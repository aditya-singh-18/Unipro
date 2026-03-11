import { getIO, isSocketInitialized } from '../socket.js';

export const emitAuditEvent = (payload) => {
  if (!isSocketInitialized()) return false;

  const io = getIO();
  io.to('ADMIN_AUDIT_ROOM').emit('audit_event', payload);
  return true;
};
