import {
  getStudentProfileService,
  updateStudentBioService,
  getStudentSkillsService,
  addStudentSkillService,
  deleteStudentSkillService,
} from "../services/student.service.js";

// GET student profile with bio
export const getStudentProfile = async (req, res, next) => {
  try {
    const enrollmentId = req.user.user_key;
    const profile = await getStudentProfileService(enrollmentId);
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};

// UPDATE bio
export const updateStudentBio = async (req, res, next) => {
  try {
    const enrollmentId = req.user.user_key;
    const { bio } = req.body;

    if (!bio || bio.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Bio cannot be empty",
      });
    }

    if (bio.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Bio must be less than 500 characters",
      });
    }

    const updated = await updateStudentBioService(enrollmentId, bio);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// GET skills
export const getStudentSkills = async (req, res, next) => {
  try {
    const enrollmentId = req.user.user_key;
    const skills = await getStudentSkillsService(enrollmentId);
    res.json({ success: true, data: skills });
  } catch (err) {
    next(err);
  }
};

// ADD skill
export const addStudentSkill = async (req, res, next) => {
  try {
    const enrollmentId = req.user.user_key;
    const { skill_name } = req.body;

    if (!skill_name || skill_name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Skill name is required",
      });
    }

    const skill = await addStudentSkillService(enrollmentId, skill_name);
    res.status(201).json({ success: true, data: skill });
  } catch (err) {
    next(err);
  }
};

// DELETE skill
export const deleteStudentSkill = async (req, res, next) => {
  try {
    const enrollmentId = req.user.user_key;
    const { id } = req.params;

    await deleteStudentSkillService(enrollmentId, id);
    res.json({ success: true, message: "Skill deleted successfully" });
  } catch (err) {
    next(err);
  }
};
