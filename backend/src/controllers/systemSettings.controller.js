import {
  activateProjectCycleService,
  createProjectCycleService,
  getAdminSystemSettingsService,
  getPublicSystemAccessService,
  listProjectCyclesService,
  updateAdminSystemSettingsService,
  updateProjectCycleService,
} from '../services/systemSettings.service.js';

export const getAdminSystemSettings = async (req, res, next) => {
  try {
    const settings = await getAdminSystemSettingsService();
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
};

export const updateAdminSystemSettings = async (req, res, next) => {
  try {
    const settings = await updateAdminSystemSettingsService({
      payload: req.body,
      actorUserKey: req.user.user_key,
    });

    res.json({ success: true, data: settings, message: 'System settings updated successfully' });
  } catch (err) {
    next(err);
  }
};

export const getProjectCycles = async (_req, res, next) => {
  try {
    const cycles = await listProjectCyclesService();
    res.json({ success: true, data: cycles });
  } catch (err) {
    next(err);
  }
};

export const createProjectCycle = async (req, res, next) => {
  try {
    const created = await createProjectCycleService({
      payload: req.body,
      actorUserKey: req.user.user_key,
    });

    res.status(201).json({ success: true, data: created, message: 'Project cycle created successfully' });
  } catch (err) {
    next(err);
  }
};

export const updateProjectCycle = async (req, res, next) => {
  try {
    const cycleId = Number(req.params.cycleId);
    const updated = await updateProjectCycleService({
      cycleId,
      payload: req.body,
      actorUserKey: req.user.user_key,
    });

    res.json({ success: true, data: updated, message: 'Project cycle updated successfully' });
  } catch (err) {
    next(err);
  }
};

export const activateProjectCycle = async (req, res, next) => {
  try {
    const cycleId = Number(req.params.cycleId);
    const activated = await activateProjectCycleService({
      cycleId,
      actorUserKey: req.user.user_key,
    });

    res.json({ success: true, data: activated, message: 'Project cycle activated successfully' });
  } catch (err) {
    next(err);
  }
};

export const getPublicSystemAccess = async (_req, res, next) => {
  try {
    const access = await getPublicSystemAccessService();
    res.json({ success: true, data: access });
  } catch (err) {
    next(err);
  }
};
