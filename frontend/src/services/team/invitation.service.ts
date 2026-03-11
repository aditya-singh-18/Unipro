// src/services/team/invitation.service.ts
import api from "@/lib/axios";

export const getMyInvitations = async () => {
  const res = await api.get("/team/invitations");
  return res.data; 
  // { invitations: [], count: number }
};

export const respondToInvite = async (
  inviteId: number,
  action: "ACCEPT" | "REJECT"
) => {
  const res = await api.post("/team/invite/respond", {
    inviteId,
    action,
  });
  return res.data;
};
// src/services/team/invitation.service.ts

export async function sendTeamInvite(
  teamId: string,
  invitedEnrollmentId: string
) {
  const res = await api.post("/team/invite", {
    teamId,
    invitedEnrollmentId,
  });

  return res.data;
}
