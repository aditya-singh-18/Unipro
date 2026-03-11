import { create } from "zustand";
import {
  getMyTeams,
} from "../services/team/team.service";
import {
  getMyInvitations,
} from "../services/team/invitation.service";

/* ================= TYPES (LOCAL & SAFE) ================= */

export interface Team {
  team_id: string;
  team_name: string;
  leader_enrollment_id: string;
  members: {
    enrollment_id: string;
    role: "LEADER" | "MEMBER";
  }[];
}

export interface TeamInvitation {
  invitation_id: number;
  team_id: string;
  team_name: string;
  invited_by: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
}

/* ================= STORE ================= */

interface TeamState {
  team: Team | null;
  invitations: TeamInvitation[];
  loading: boolean;
  error: string | null;

  fetchMyTeam: () => Promise<void>;
  fetchInvitations: () => Promise<void>;
  clearTeam: () => void;
}

export const useTeamStore = create<TeamState>((set) => ({
  team: null,
  invitations: [],
  loading: false,
  error: null,

  /* ===== FETCH TEAM ===== */
  fetchMyTeam: async () => {
    try {
      set({ loading: true, error: null });

      const res = await getMyTeams();
      const team = res?.teams?.[0] ?? null;

      // ✅ no team is NOT an error
      set({ team, loading: false });
    } catch {
      set({
        team: null,
        loading: false,
        error: "Failed to fetch team",
      });
    }
  },

  /* ===== FETCH INVITATIONS ===== */
  fetchInvitations: async () => {
    try {
      const invitations = await getMyInvitations();
      set({ invitations });
    } catch {
      // silent fail (acceptable)
    }
  },

  /* ===== CLEAR ===== */
  clearTeam: () => {
    set({ team: null, invitations: [], error: null });
  },
}));
