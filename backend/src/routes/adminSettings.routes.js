import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { allowRoles } from '../middlewares/role.middleware.js';
import {
  getAdminSettingsBundle,
  updateAdminSettingsSection,
  getProjectTypes,
  createProjectType,
  updateProjectType,
  deleteProjectType,
  getTracks,
  createTrack,
  updateTrack,
  deleteTrack,
  createTrackTechnology,
  updateTrackTechnology,
  deleteTrackTechnology,
} from '../controllers/adminSettings.controller.js';

const router = express.Router();

router.use(authenticate, allowRoles('ADMIN'));

router.get('/', getAdminSettingsBundle);
router.put('/section/:sectionKey', updateAdminSettingsSection);

router.get('/project-types', getProjectTypes);
router.post('/project-types', createProjectType);
router.put('/project-types/:projectTypeKey', updateProjectType);
router.delete('/project-types/:projectTypeKey', deleteProjectType);

router.get('/tracks', getTracks);
router.post('/tracks', createTrack);
router.put('/tracks/:trackKey', updateTrack);
router.delete('/tracks/:trackKey', deleteTrack);

router.post('/tracks/:trackKey/technologies', createTrackTechnology);
router.put('/tracks/:trackKey/technologies/:technologyId', updateTrackTechnology);
router.delete('/tracks/:trackKey/technologies/:technologyId', deleteTrackTechnology);

export default router;
