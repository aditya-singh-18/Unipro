import {
  getMyProfileService,
  updateMyProfileService,
  deleteMySocialLinkService
} from '../services/profile.service.js';

/* =========================
   GET MY PROFILE
========================= */
export const getMyProfile = async (req, res, next) => {
  try {
    const { user_key, role } = req.user;

    const profile = await getMyProfileService({
      userKey: user_key,
      role
    });

    // ✅ Include role in the response
    res.json({
      ...profile,
      role
    });
  } catch (err) {
    next(err);
  }
};

/* =========================
   UPDATE MY PROFILE
========================= */
export const updateMyProfile = async (req, res, next) => {
  try {
    const result = await updateMyProfileService(req);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/* =========================
   DELETE SOCIAL LINK
========================= */
export const deleteMySocialLink = async (req, res, next) => {
  try {
    const { platform } = req.params;

    const result = await deleteMySocialLinkService(req, platform);

    res.json(result);
  } catch (err) {
    next(err);
  }
};
