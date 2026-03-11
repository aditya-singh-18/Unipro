import { createProjectService } from '../services/project.service.js';
import { mentorReviewProjectService } from '../services/project.service.js';
import { getPendingProjectsService } from '../services/project.service.js';
import { adminAssignMentorService } from '../services/project.service.js';
import { getMentorAssignedProjectsService } from '../services/project.service.js';
import { getMentorRejectedProjectsHistoryService } from '../services/project.service.js';
import { revokeRejectedProjectDecisionService } from '../services/project.service.js';
import { resubmitProjectService } from '../services/project.service.js';
import { editProjectService } from '../services/project.service.js';
import { activateProjectService } from '../services/project.service.js';
import { getMyProjectsService } from '../services/project.service.js';
import { getProjectDetailService } from '../services/project.service.js';


export const createProject = async (req, res) => {
  try {
    const {
      teamId,
      title,
      description,
      track,        // ✅ ADD THIS
      techStack
    } = req.body;

    const requesterEnrollmentId = req.user.user_key;

    const result = await createProjectService({
      teamId,
      title,
      description,
      track,        // ✅ PASS FORWARD
      techStack,
      requesterEnrollmentId,
    });

    return res.status(201).json({
      message: 'Project submitted successfully',
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};


export const getPendingProjects = async (req, res) => {
  try {
    const projects = await getPendingProjectsService();

    return res.status(200).json({
      count: projects.length,
      projects,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch pending projects',
    });
  }
};


export const mentorReviewProject = async (req, res) => {
  try {
    const { projectId, action, mentorFeedback } = req.body;
    const mentorEmployeeId = req.user.user_key;

    const result = await mentorReviewProjectService({
      projectId,
      action,
      mentorFeedback,
      mentorEmployeeId,
    });

    return res.status(200).json({
      message: `Project ${result.status.toLowerCase()}`,
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};



export const adminAssignMentor = async (req, res) => {
  try {
    const { projectId, mentorEmployeeId } = req.body;

    const result = await adminAssignMentorService({
      projectId,
      mentorEmployeeId,
    });

    return res.status(200).json({
      message: 'Mentor assigned successfully',
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};



export const getMentorAssignedProjects = async (req, res) => {
  try {
    const mentorEmployeeId = req.user.user_key;

    const projects = await getMentorAssignedProjectsService(
      mentorEmployeeId
    );

    return res.status(200).json({
      count: projects.length,
      projects,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

export const getMentorRejectedProjectsHistory = async (req, res) => {
  try {
    const mentorEmployeeId = req.user.user_key;

    const projects = await getMentorRejectedProjectsHistoryService(
      mentorEmployeeId
    );

    return res.status(200).json({
      count: projects.length,
      projects,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

export const revokeRejectedDecision = async (req, res) => {
  try {
    const mentorEmployeeId = req.user.user_key;
    const { projectId } = req.params;

    const result = await revokeRejectedProjectDecisionService({
      projectId,
      mentorEmployeeId,
    });

    return res.status(200).json({
      message: 'Rejection decision revoked successfully',
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};


export const resubmitProject = async (req, res) => {
  try {
    const { projectId, title, description, track, techStack, requestMentorChange } = req.body;
    const requesterEnrollmentId = req.user.user_key;

    const result = await resubmitProjectService({
      projectId,
      title,
      description,
      track,
      techStack,
      requestMentorChange,
      requesterEnrollmentId,
    });

    return res.status(200).json({
      message: 'Project resubmitted successfully',
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};


export const activateProject = async (req, res) => {
  try {
    const { projectId } = req.body;

    const result = await activateProjectService({ projectId });

    return res.status(200).json({
      message: 'Project activated successfully',
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

/* =========================
   STUDENT: GET MY PROJECTS
========================= */
export const getMyProjects = async (req, res) => {
  try {
    const enrollmentId = req.user.user_key;

    const projects = await getMyProjectsService(enrollmentId);

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


/* =========================
   STUDENT: PROJECT DETAIL
========================= */
export const getProjectDetail = async (req, res) => {
  try {
    const { projectId } = req.params;
    const enrollmentId = req.user.user_key;

    const result = await getProjectDetailService({
      projectId,
      enrollmentId,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   STUDENT: EDIT PROJECT
========================= */
export const editProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, track, techStack } = req.body;
    const requesterEnrollmentId = req.user.user_key;

    const result = await editProjectService({
      projectId,
      title,
      description,
      track,
      techStack,
      requesterEnrollmentId,
    });

    return res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
