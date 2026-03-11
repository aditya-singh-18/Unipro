import { getMentorProfileService } from '../services/mentor.service.js';
import {
  updateMentorProfileService,
  getMentorSkillsService,
  addMentorSkillService,
  updateMentorSkillService,
  deleteMentorSkillService,
  getActiveMentorsService,
  getMentorProfileForStudentService,
} from '../services/mentor.service.js';

export const getMentorProfile = async (req, res, next) => {
  try {
    const employeeId = req.user.user_key; // ✅ JWT se

    const profile = await getMentorProfileService(employeeId);

    return res.json({
      success: true,
      data: profile,
    });
  } catch (err) {
    next(err);
  }
};




export const getMentorSkills = async (req, res, next) => {
  try {
    const employeeId = req.user.user_key;
    const skills = await getMentorSkillsService(employeeId);
    res.json({ success: true, data: skills });
  } catch (err) {
    next(err);
  }
};

export const updateMentorProfile = async (req, res, next) => {
  try {
    const employeeId = req.user.user_key;
    const {
      department,
      designation,
      contact_number,
      primary_track,
      secondary_tracks,
    } = req.body;

    const profile = await updateMentorProfileService(employeeId, {
      department,
      designation,
      contact_number,
      primary_track,
      secondary_tracks,
    });

    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};

export const addMentorSkill = async (req, res, next) => {
  try {
    const employeeId = req.user.user_key;
    const { tech_stack, track, skill_type, proficiency_level } = req.body;

    const skill = await addMentorSkillService(
      employeeId,
      tech_stack,
      track,
      skill_type,
      proficiency_level
    );

    res.status(201).json({ success: true, data: skill });
  } catch (err) {
    next(err);
  }
};

export const updateMentorSkill = async (req, res, next) => {
  try {
    const employeeId = req.user.user_key;
    const { id } = req.params;
    const { tech_stack, track, skill_type, proficiency_level } = req.body;

    const skill = await updateMentorSkillService(
      employeeId,
      id,
      {
        tech_stack,
        track,
        skill_type,
        proficiency_level,
      }
    );

    res.json({ success: true, data: skill });
  } catch (err) {
    next(err);
  }
};

export const deleteMentorSkill = async (req, res, next) => {
  try {
    const employeeId = req.user.user_key;
    const { id } = req.params;

    const skill = await deleteMentorSkillService(
      employeeId,
      id
    );

    res.json({ success: true, data: skill, message: 'Skill deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const getActiveMentors = async (req, res, next) => {
  try {
    const mentors = await getActiveMentorsService();
    res.json({ 
      success: true, 
      data: mentors,
      count: mentors.length 
    });
  } catch (err) {
    next(err);
  }
};

export const getAssignedMentorProfileForStudent = async (req, res, next) => {
  try {
    const studentEnrollmentId = req.user.user_key;
    const { employeeId } = req.params;

    const profile = await getMentorProfileForStudentService(studentEnrollmentId, employeeId);

    res.json({
      success: true,
      data: profile,
    });
  } catch (err) {
    next(err);
  }
};
