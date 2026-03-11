import { adminOverrideService } from '../services/adminOverride.service.js';

export const adminOverride = async (req, res) => {
  try {
    const { projectId, action, reason, mentorEmployeeId } = req.body;
    const adminUserKey = req.user.user_key;

    const result = await adminOverrideService({
      projectId,
      action,
      reason,
      mentorEmployeeId,
      adminUserKey,
    });

    return res.status(200).json({
      message: 'Admin override applied successfully',
      ...result,
    });
  } catch (err) {
    return res.status(400).json({
      message: err.message,
    });
  }
};
