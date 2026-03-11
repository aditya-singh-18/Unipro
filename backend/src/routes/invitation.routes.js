import express from 'express';
import { sendInvite } from '../controllers/invitation.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { allowRoles } from '../middlewares/role.middleware.js';
import { listInvitations } from '../controllers/invitation.controller.js';
import { respondToInvite } from '../controllers/invitation.controller.js';

const router = express.Router();

router.post(
  '/invite',
  authenticate,
  allowRoles('STUDENT'),
  sendInvite
);
router.get(
  '/invitations',
  authenticate,
  allowRoles('STUDENT'),
  listInvitations
);
router.post(
  '/invite/respond',
  authenticate,
  allowRoles('STUDENT'),
  respondToInvite
);
export default router;
