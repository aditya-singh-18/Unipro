import {
  getAdminProfileService,
  getAdminSkillsService,
  addAdminSkillService,
  updateAdminSkillService,
  updateAdminProfileService,
  deleteAdminSkillService,
  adminRegisterUserService,
  getUserStatisticsService,
  getAllStudentsService,
  getAllMentorsService,
  getAllUsersService
} from '../services/admin.service.js';


export const getAdminProfile = async (req, res, next) => {
  try {
    const employeeId = req.user.user_key;

    const profile = await getAdminProfileService(employeeId);

    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};

export const getAdminSkills = async (req, res, next) => {
  try {
    const employeeId = req.user.user_key;

    const skills = await getAdminSkillsService(employeeId);

    res.json({ success: true, data: skills });
  } catch (err) {
    next(err);
  }
};

export const addAdminSkill = async (req, res, next) => {
  try {
    const employeeId = req.user.user_key;
    const { skill_name, skill_type } = req.body;

    const skill = await addAdminSkillService(
      employeeId,
      skill_name,
      skill_type
    );

    res.status(201).json({ success: true, data: skill });
  } catch (err) {
    next(err);
  }
};

export const updateAdminSkill = async (req, res, next) => {
  try {
    const employeeId = req.user.user_key;
    const { id } = req.params;
    const { skill_name } = req.body;

    const skill = await updateAdminSkillService(
      employeeId,
      id,
      skill_name
    );

    res.json({ success: true, data: skill });
  } catch (err) {
    next(err);
  }
};
export const updateAdminProfile = async (req, res, next) => {
  try {
    const employeeId = req.user.user_key;
    const {
      full_name,
      department,
      designation,
      contact_number
    } = req.body;

    const profile = await updateAdminProfileService(
      employeeId,
      full_name,
      department,
      designation,
      contact_number
    );

    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};

export const deleteAdminSkill = async (req, res, next) => {
  try {
    const employeeId = req.user.user_key;
    const { id } = req.params;

    await deleteAdminSkillService(employeeId, id);

    res.json({ success: true, message: 'Skill deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const adminRegisterUser = async (req, res, next) => {
  try {
    const result = await adminRegisterUserService(req.body);

    res.status(201).json({
      message: 'User registered successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

// /* =========================
//    ADMIN PROFILE
// ========================= */
// export const getAdminProfile = async (req, res, next) => {
//   try {
//     const { employeeId } = req.params;

//     const data = await getAdminProfileService(employeeId);
//     res.json(data);
//   } catch (err) {
//     next(err);
//   }
// };

// /* =========================
//    ASSIGN MENTOR TO PROJECT
// ========================= */
// export const assignMentorController = async (req, res, next) => {
//   try {
//     const { projectId, mentorEmployeeId } = req.body;

//     const result = await assignMentorService({
//       projectId,
//       mentorEmployeeId
//     });

//     res.json({
//       message: 'Mentor assigned successfully',
//       data: result
//     });
//   } catch (err) {
//     next(err);
//   }
// };

/* =========================
   USER MANAGEMENT: GET STATISTICS
========================= */
export const getUserStatistics = async (req, res, next) => {
  try {
    const stats = await getUserStatisticsService();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

/* =========================
   USER MANAGEMENT: GET ALL STUDENTS
========================= */
export const getAllStudents = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await getAllStudentsService(page, limit);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/* =========================
   USER MANAGEMENT: GET ALL MENTORS
========================= */
export const getAllMentors = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await getAllMentorsService(page, limit);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/* =========================
   USER MANAGEMENT: GET ALL USERS
========================= */
export const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await getAllUsersService(page, limit);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
