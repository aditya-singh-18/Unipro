import express from 'express';
import { adminOverride } from '../controllers/adminOverride.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { allowRoles } from '../middlewares/role.middleware.js';

const router = express.Router();

router.post(
  '/admin/override',
  authenticate,
  allowRoles('ADMIN'),
  adminOverride
);

export default router;
