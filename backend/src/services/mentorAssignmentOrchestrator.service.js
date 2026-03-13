import pool from '../config/db.js';
import { findUserByEnrollmentId, findUserByIdentifier } from '../repositories/user.repo.js';
import { insertMentorAssignmentAudit } from '../repositories/mentorAssignment.repo.js';
import { getTeamMembers } from '../repositories/team.repo.js';
import { pushNotification } from './notification.service.js';
import { recommendMentorsForProjectService } from './mentorRecommendation.service.js';
import { getAdminSystemSettingsService } from './systemSettings.service.js';
import { assignProjectMentorService } from './projectAssignment.service.js';

const notifyAdmins = async ({ title, message }) => {
  const admins = await pool.query(`SELECT user_key FROM users WHERE LOWER(role) = 'admin'`);

  await Promise.all(
    admins.rows.map((admin) =>
      pushNotification({
        userKey: admin.user_key,
        role: 'admin',
        title,
        message,
      })
    )
  );
};

const notifyStudentsPendingReview = async ({ projectId, title }) => {
  const members = await getTeamMembers(projectId);

  for (const member of members) {
    const user = await findUserByEnrollmentId(member.enrollment_id);
    if (user?.user_key) {
      await pushNotification({
        userKey: user.user_key,
        role: 'student',
        title,
        message: 'Your project is waiting for mentor recommendation approval.',
      });
    }
  }
};

export const runMentorAssignmentOrchestratorService = async ({ projectId, actorUserKey, source }) => {
  if (!projectId) {
    throw new Error('projectId is required');
  }

  const settings = await getAdminSystemSettingsService();
  const assignmentMode = settings.mentor_assignment_mode || 'manual_only';

  if (assignmentMode === 'manual_only') {
    return {
      mode: assignmentMode,
      action: 'manual_only',
      status: 'PENDING',
      recommendations: [],
    };
  }

  const recommendationResult = await recommendMentorsForProjectService({
    projectId,
    persist: true,
    topN: settings.mentor_recommendation_top_n,
  });

  const topRecommendation = recommendationResult.recommendations[0] || null;

  if (
    assignmentMode === 'auto_assign' &&
    topRecommendation &&
    Number(topRecommendation.score) >= Number(settings.mentor_auto_assign_threshold)
  ) {
    const assigned = await assignProjectMentorService({
      projectId,
      mentorEmployeeId: topRecommendation.mentor_employee_id,
    });

    await insertMentorAssignmentAudit({
      projectId,
      mentorEmployeeId: topRecommendation.mentor_employee_id,
      decisionSource: 'auto_assigned',
      recommendedScore: topRecommendation.score,
      approvedBy: actorUserKey || null,
      autoAssigned: true,
      notes: `Auto-assigned from ${source || 'submission'} flow`,
      metadata: {
        source,
        threshold: settings.mentor_auto_assign_threshold,
        recommendation_count: recommendationResult.recommendation_count,
      },
    });

    return {
      mode: assignmentMode,
      action: 'auto_assigned',
      status: assigned.status,
      mentor_employee_id: assigned.mentor_employee_id,
      recommendations: recommendationResult.recommendations,
    };
  }

  await insertMentorAssignmentAudit({
    projectId,
    mentorEmployeeId: topRecommendation?.mentor_employee_id || null,
    decisionSource: assignmentMode === 'auto_assign' ? 'fallback_manual' : 'recommendation_required',
    recommendedScore: topRecommendation?.score || null,
    approvedBy: actorUserKey || null,
    autoAssigned: false,
    notes: assignmentMode === 'auto_assign'
      ? 'Auto-assign threshold not met; admin approval required'
      : 'Recommendation generated for admin approval',
    metadata: {
      source,
      threshold: settings.mentor_auto_assign_threshold,
      recommendation_count: recommendationResult.recommendation_count,
    },
  });

  await notifyAdmins({
    title: '🤖 Mentor Recommendation Ready',
    message: `Project ${projectId} is waiting for mentor approval.`,
  });

  await notifyStudentsPendingReview({
    projectId,
    title: '⏳ Mentor Recommendation Pending',
  });

  return {
    mode: assignmentMode,
    action: assignmentMode === 'auto_assign' ? 'fallback_manual' : 'recommendation_required',
    status: 'PENDING',
    recommendations: recommendationResult.recommendations,
  };
};

export const approveRecommendedMentorService = async ({ projectId, mentorEmployeeId, adminUserKey }) => {
  if (!projectId || !mentorEmployeeId) {
    throw new Error('projectId and mentorEmployeeId are required');
  }

  const recommendationResult = await recommendMentorsForProjectService({
    projectId,
    persist: true,
    topN: 10,
  });
  const selectedRecommendation = recommendationResult.recommendations.find(
    (item) => item.mentor_employee_id === mentorEmployeeId
  );

  const assigned = await assignProjectMentorService({
    projectId,
    mentorEmployeeId,
  });

  await insertMentorAssignmentAudit({
    projectId,
    mentorEmployeeId,
    decisionSource: 'recommended_admin_approved',
    recommendedScore: selectedRecommendation?.score || null,
    approvedBy: adminUserKey || null,
    autoAssigned: false,
    notes: 'Admin approved mentor recommendation',
    metadata: {
      recommendation_count: recommendationResult.recommendation_count,
      selected_rank: selectedRecommendation?.rank_position || null,
    },
  });

  const mentor = await findUserByIdentifier(mentorEmployeeId);
  if (mentor?.user_key) {
    await pushNotification({
      userKey: mentor.user_key,
      role: 'mentor',
      title: '✅ Recommendation Approved',
      message: `You have been approved as mentor for project ${projectId}.`,
    });
  }

  return assigned;
};