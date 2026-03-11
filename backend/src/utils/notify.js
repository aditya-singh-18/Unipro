import { emitNotification } from './socketEmitter.js';
import { sendEmail } from '../services/email.service.js';

export const notifyUser = async ({
  userKey,
  email,
  socketPayload,
  emailSubject,
  emailHtml,
}) => {
  // 🔔 real-time
  emitNotification(userKey, socketPayload);

  // 📧 backup email
  if (email && emailSubject) {
    await sendEmail({
      to: email,
      subject: emailSubject,
      html: emailHtml,
    });
  }
};
