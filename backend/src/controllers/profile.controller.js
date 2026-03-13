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
    
    console.log(`📋 [Profile] Fetching ${role} profile for user_key=${user_key}`);

    const profile = await getMyProfileService({
      userKey: user_key,
      role
    });

    if (!profile) {
      console.warn(`⚠️  [Profile] No profile found for ${role}/${user_key}`);
      return res.status(404).json({
        message: 'Profile not found'
      });
    }

    console.log(`✅ [Profile] Profile fetched for ${role}/${user_key}`, { enrollmentId: profile.enrollment_id, employeeId: profile.employee_id });

    // ✅ Include role in the response
    res.json({
      ...profile,
      role
    });
  } catch (err) {
    console.error(`❌ [Profile] Error fetching profile:`, err.message);
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
