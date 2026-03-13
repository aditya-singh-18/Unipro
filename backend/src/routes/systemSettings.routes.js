import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { allowRoles } from '../middlewares/role.middleware.js';
import {
  activateProjectCycle,
  createProjectCycle,
  getAdminSystemSettings,
  getProjectCycles,
  getPublicSystemAccess,
  updateAdminSystemSettings,
  updateProjectCycle,
} from '../controllers/systemSettings.controller.js';

const router = express.Router();

router.get('/public/system-access', getPublicSystemAccess);

router.get('/admin/system-settings', authenticate, allowRoles('ADMIN'), getAdminSystemSettings);
router.put('/admin/system-settings', authenticate, allowRoles('ADMIN'), updateAdminSystemSettings);

router.get('/admin/system-settings/project-cycles', authenticate, allowRoles('ADMIN'), getProjectCycles);
router.post('/admin/system-settings/project-cycles', authenticate, allowRoles('ADMIN'), createProjectCycle);
router.put('/admin/system-settings/project-cycles/:cycleId', authenticate, allowRoles('ADMIN'), updateProjectCycle);
router.patch('/admin/system-settings/project-cycles/:cycleId/activate', authenticate, allowRoles('ADMIN'), activateProjectCycle);

export default router;
