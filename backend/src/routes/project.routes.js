import express from 'express';
import { createProject } from '../controllers/project.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { allowRoles } from '../middlewares/role.middleware.js';
import { mentorReviewProject } from '../controllers/project.controller.js';
import { getPendingProjects } from '../controllers/project.controller.js';
import { adminAssignMentor } from '../controllers/project.controller.js';
import { getMentorAssignedProjects } from '../controllers/project.controller.js';
import { getMentorRejectedProjectsHistory } from '../controllers/project.controller.js';
import { revokeRejectedDecision } from '../controllers/project.controller.js';
import { resubmitProject } from '../controllers/project.controller.js';
import { activateProject } from '../controllers/project.controller.js';
import { getMyProjects } from '../controllers/project.controller.js';
import { getProjectDetail } from '../controllers/project.controller.js';
import { editProject } from '../controllers/project.controller.js';





const router = express.Router();

router.post(
  '/create',
  authenticate,
  allowRoles('STUDENT'),
  createProject
);
router.get(
  '/admin/pending',
  authenticate,
  allowRoles('ADMIN'),
  getPendingProjects
);

router.post(
  '/mentor/review',
  authenticate,
  allowRoles('MENTOR'),
  mentorReviewProject
);


router.post(
  '/admin/assign-mentor',
  authenticate,
  allowRoles('ADMIN'),
  adminAssignMentor
);
router.get(
  '/mentor/assigned',
  authenticate,
  allowRoles('MENTOR'),
  getMentorAssignedProjects
);
router.get(
  '/mentor/rejected-history',
  authenticate,
  allowRoles('MENTOR'),
  getMentorRejectedProjectsHistory
);
router.post(
  '/mentor/rejected/:projectId/revoke',
  authenticate,
  allowRoles('MENTOR'),
  revokeRejectedDecision
);
router.post(
  '/resubmit',
  authenticate,
  allowRoles('STUDENT'),
  resubmitProject
);
router.post(
  '/admin/activate',
  authenticate,
  allowRoles('ADMIN'),
  activateProject
);

router.get(
  '/my-projects',
  authenticate,
  allowRoles('STUDENT'),
  getMyProjects
);

router.get(
  '/:projectId',
  authenticate,
  allowRoles('STUDENT'),
  getProjectDetail
);

router.put(
  '/:projectId/edit',
  authenticate,
  allowRoles('STUDENT'),
  editProject
);

export default router;
