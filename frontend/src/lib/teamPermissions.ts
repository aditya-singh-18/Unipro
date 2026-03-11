import { Team } from "../types/team.types";

export const isLeader = (
  team: Team | null,
  myEnrollmentId: string
): boolean => {
  if (!team) return false;
  return team.leader_enrollment_id === myEnrollmentId;
};

export const canInviteMembers = (
  team: Team | null,
  myEnrollmentId: string
): boolean => {
  return isLeader(team, myEnrollmentId);
};

export const canRemoveMember = (
  team: Team | null,
  myEnrollmentId: string,
  targetEnrollmentId: string
): boolean => {
  if (!team) return false;
  if (team.leader_enrollment_id !== myEnrollmentId) return false;
  if (targetEnrollmentId === myEnrollmentId) return false;
  return true;
};
