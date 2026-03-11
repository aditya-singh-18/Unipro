import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  getMyProfile,
  updateMyProfile,
  deleteMySocialLink
} from '../controllers/profile.controller.js';

const router = express.Router();

router.get('/me', authenticate, getMyProfile);
router.put('/me', authenticate, updateMyProfile);

router.delete(
  '/me/social-links/:platform',
  authenticate,
  deleteMySocialLink
);

export default router;
