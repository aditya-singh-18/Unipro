// src/services/team/team.service.ts
import api from "@/lib/axios";

/**
 * Already existing
 */
export const getMyTeams = async () => {
  const res = await api.get("/team/my-teams");
  return res.data;
};

/**
 * 🔴 REQUIRED for /team/[teamId]
 * Uses backend API: GET /api/team/search/:teamId
 */
export const getTeamById = async (teamId: string) => {
  if (!teamId) {
    throw new Error("teamId is required");
  }

  const res = await api.get(`/team/search/${teamId}`);
  return res.data;
};

// src/services/team/team.service.ts
export const createTeam = async (
  department: string,
  maxTeamSize: number
) => {
  const res = await api.post("/team/create", {
    department,
    maxTeamSize,
  });
  return res.data;
};

// in team.service.ts
export const removeTeamMember = (teamId: string, memberEnrollmentId: string) =>
  api.post("/team/remove-member", { teamId, memberEnrollmentId });
