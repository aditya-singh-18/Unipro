import { assignMentorToProject, findProjectById } from '../repositories/project.repo.js';
import { getTeamMembers } from '../repositories/team.repo.js';
import { findUserByEnrollmentId, findUserByIdentifier } from '../repositories/user.repo.js';
import { pushNotification } from './notification.service.js';

export const assignProjectMentorService = async ({ projectId, mentorEmployeeId }) => {
  if (!projectId || !mentorEmployeeId) {
    throw new Error('projectId and mentorEmployeeId are required');
  }

  const project = await findProjectById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  if (project.status !== 'PENDING') {
    throw new Error(`Mentor cannot be assigned in status ${project.status}`);
  }

  await assignMentorToProject({
    projectId,
    mentorEmployeeId,
  });

  const members = await getTeamMembers(projectId);
  for (const member of members) {
    const user = await findUserByEnrollmentId(member.enrollment_id);
    if (user?.user_key) {
      await pushNotification({
        userKey: user.user_key,
        role: 'student',
        title: '👨‍🏫 Mentor Assigned',
        message: 'Your project has been assigned to a mentor for review',
      });
    }
  }

  const mentor = await findUserByIdentifier(mentorEmployeeId);
  if (mentor?.user_key) {
    await pushNotification({
      userKey: mentor.user_key,
      role: 'mentor',
      title: '📝 New Project Assigned',
      message: 'You have been assigned a new project to review',
    });
  }

  return {
    project_id: projectId,
    mentor_employee_id: mentorEmployeeId,
    status: 'ASSIGNED_TO_MENTOR',
  };
};