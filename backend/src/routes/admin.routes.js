import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { allowRoles } from '../middlewares/role.middleware.js';
import {
  getAdminProfile,
  getAdminSkills,
  addAdminSkill,
  updateAdminSkill,
  adminRegisterUser,
  updateAdminProfile,
  deleteAdminSkill,
  getUserStatistics,
  getAllStudents,
  getAllMentors,
  getAllUsers
} from '../controllers/admin.controller.js';
const router = express.Router();

// admin profile
router.get(
  '/profile',
  authenticate,
  allowRoles('ADMIN'),
  getAdminProfile
);

// admin skills
router.get(
  '/skills',
  authenticate,
  allowRoles('ADMIN'),
  getAdminSkills
);

router.post(
  '/skills',
  authenticate,
  allowRoles('ADMIN'),
  addAdminSkill
);

router.put(
  '/skills/:id',
  authenticate,
  allowRoles('ADMIN'),
  updateAdminSkill
);
router.put(
  '/profile',
  authenticate,
  allowRoles('ADMIN'),
  updateAdminProfile
);

// DELETE admin skill
router.delete(
  '/skills/:id',
  authenticate,
  allowRoles('ADMIN'),
  deleteAdminSkill
);

// REGISTER USER (ADMIN ONLY)
router.post(
  '/register-user',
  authenticate,
  allowRoles('ADMIN'),
  adminRegisterUser
);

// USER MANAGEMENT ROUTES
router.get(
  '/users/statistics',
  authenticate,
  allowRoles('ADMIN'),
  getUserStatistics
);

router.get(
  '/users/students',
  authenticate,
  allowRoles('ADMIN'),
  getAllStudents
);

router.get(
  '/users/mentors',
  authenticate,
  allowRoles('ADMIN'),
  getAllMentors
);

router.get(
  '/users',
  authenticate,
  allowRoles('ADMIN'),
  getAllUsers
);

export default router;
