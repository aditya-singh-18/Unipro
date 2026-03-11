/* =========================
   TEAM ROLES
========================= */

export enum TeamRole {
  LEADER = "LEADER",
  MEMBER = "MEMBER",
}

/* =========================
   TEAM MEMBER
========================= */

export interface TeamMember {
  enrollment_id: string;
  role: TeamRole;
}

/* =========================
   TEAM MODEL
========================= */

export interface Team {
  team_id: string;
  team_name: string;
  leader_enrollment_id: string;
  members: TeamMember[];
}

/* =========================
   INVITATION MODEL
========================= */

export interface TeamInvitation {
  invitation_id: number;
  team_id: string;
  team_name: string;
  invited_by: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
}
