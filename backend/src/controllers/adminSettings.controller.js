import {
  getAdminSettingsBundleService,
  updateAdminSettingsSectionService,
  listProjectTypesService,
  createProjectTypeService,
  updateProjectTypeService,
  deleteProjectTypeService,
  listTracksService,
  createTrackService,
  updateTrackService,
  deleteTrackService,
  createTrackTechnologyService,
  updateTrackTechnologyService,
  deleteTrackTechnologyService,
} from '../services/adminSettings.service.js';

export const getAdminSettingsBundle = async (req, res, next) => {
  try {
    const settings = await getAdminSettingsBundleService();
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
};

export const updateAdminSettingsSection = async (req, res, next) => {
  try {
    const data = await updateAdminSettingsSectionService({
      sectionKey: req.params.sectionKey,
      payload: req.body,
      updatedBy: req.user?.user_key,
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getProjectTypes = async (req, res, next) => {
  try {
    const data = await listProjectTypesService();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createProjectType = async (req, res, next) => {
  try {
    const data = await createProjectTypeService({
      projectTypeKey: req.body?.project_type_key,
      payload: req.body,
      updatedBy: req.user?.user_key,
    });

    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateProjectType = async (req, res, next) => {
  try {
    const data = await updateProjectTypeService({
      projectTypeKey: req.params.projectTypeKey,
      payload: req.body,
      updatedBy: req.user?.user_key,
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteProjectType = async (req, res, next) => {
  try {
    const data = await deleteProjectTypeService(req.params.projectTypeKey);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getTracks = async (req, res, next) => {
  try {
    const data = await listTracksService();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createTrack = async (req, res, next) => {
  try {
    const data = await createTrackService({
      trackKey: req.body?.track_key,
      payload: req.body,
      updatedBy: req.user?.user_key,
    });

    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateTrack = async (req, res, next) => {
  try {
    const data = await updateTrackService({
      trackKey: req.params.trackKey,
      payload: req.body,
      updatedBy: req.user?.user_key,
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteTrack = async (req, res, next) => {
  try {
    const data = await deleteTrackService(req.params.trackKey);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createTrackTechnology = async (req, res, next) => {
  try {
    const data = await createTrackTechnologyService({
      trackKey: req.params.trackKey,
      payload: req.body,
      updatedBy: req.user?.user_key,
    });

    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateTrackTechnology = async (req, res, next) => {
  try {
    const data = await updateTrackTechnologyService({
      trackKey: req.params.trackKey,
      technologyId: req.params.technologyId,
      payload: req.body,
      updatedBy: req.user?.user_key,
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteTrackTechnology = async (req, res, next) => {
  try {
    const data = await deleteTrackTechnologyService(req.params.technologyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
