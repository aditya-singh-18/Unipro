import express from 'express';
import {
  createTeam,
  getMyTeams,
  searchTeamById,
  removeTeamMember,
  cancelPendingInvitation,
  disbandTeam, 
} from '../controllers/team.controller.js';

import { authenticate } from '../middlewares/auth.middleware.js';
import { allowRoles } from '../middlewares/role.middleware.js';
import { leaveTeam } from '../controllers/team.controller.js';

const router = express.Router();

/* =========================
   CREATE TEAM
========================= */
router.post(
  '/create',
  authenticate,
  allowRoles('STUDENT'),
  createTeam
);

/* =========================
   GET MY TEAMS (ALL)
========================= */
router.get(
  '/my-teams',
  authenticate,
  allowRoles('STUDENT'),
  getMyTeams
);

/* =========================
   SEARCH TEAM BY TEAM ID
========================= */
router.get(
  '/search/:teamId',
  authenticate,
  allowRoles('STUDENT', 'MENTOR', 'ADMIN'),
  searchTeamById
);

/* =========================
   REMOVE TEAM MEMBER (LEADER ONLY)
========================= */
router.post(
  '/remove-member',
  authenticate,
  allowRoles('STUDENT'),
  removeTeamMember
);

/* =========================
   CANCEL PENDING INVITATION (LEADER ONLY)
========================= */
router.post(
  '/cancel-invite',
  authenticate,
  allowRoles('STUDENT'),
  cancelPendingInvitation
);
/* =========================
   LEAVE TEAM
========================= */
router.post(
  '/leave',
  authenticate,
  allowRoles('STUDENT'),
  leaveTeam
);

/* =========================
   DISBAND TEAM
========================= */
router.post(
  '/disband',
  authenticate,
  allowRoles('STUDENT'),
  disbandTeam
);


export default router;
