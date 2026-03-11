import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { allowRoles } from '../middlewares/role.middleware.js';
import {
  createMeeting,
  getMentorMeetings,
  getProjectMeetings,
  getMeetingDetails,
  updateMeeting,
  deleteMeeting,
  submitMeetingMinutes,
  uploadMeetingAttachment,
  getMeetingAttachments,
  updateMeetingStatus,
  getStudentMeetings,
  getMeetingMinutes,
} from '../controllers/meeting.controller.js';

const router = express.Router();

router.post('/meetings', authenticate, allowRoles('MENTOR'), createMeeting);
router.get('/meetings/mentor/:mentorId', authenticate, allowRoles('MENTOR', 'ADMIN'), getMentorMeetings);
router.get('/meetings/student/my-meetings', authenticate, allowRoles('STUDENT'), getStudentMeetings);
router.get('/projects/:projectId/meetings', authenticate, allowRoles('MENTOR', 'STUDENT', 'ADMIN'), getProjectMeetings);
router.get('/meetings/:meetingId', authenticate, allowRoles('MENTOR', 'STUDENT', 'ADMIN'), getMeetingDetails);
router.put('/meetings/:meetingId', authenticate, allowRoles('MENTOR'), updateMeeting);
router.delete('/meetings/:meetingId', authenticate, allowRoles('MENTOR'), deleteMeeting);
router.post('/meetings/:meetingId/minutes', authenticate, allowRoles('MENTOR', 'STUDENT'), submitMeetingMinutes);
router.get('/meetings/:meetingId/minutes', authenticate, allowRoles('MENTOR', 'STUDENT', 'ADMIN'), getMeetingMinutes);
router.post('/meetings/:meetingId/attachments', authenticate, allowRoles('MENTOR', 'STUDENT'), uploadMeetingAttachment);
router.get('/meetings/:meetingId/attachments', authenticate, allowRoles('MENTOR', 'STUDENT', 'ADMIN'), getMeetingAttachments);
router.patch('/meetings/:meetingId/status', authenticate, allowRoles('MENTOR'), updateMeetingStatus);

export default router;
