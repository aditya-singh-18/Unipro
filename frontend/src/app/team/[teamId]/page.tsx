"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Sidebar from "@/components/sidebar/StudentSidebar";
import Topbar from "@/components/dashboard/Topbar";
import { getTeamById, removeTeamMember } from "@/services/team/team.service";
import { Users } from "lucide-react";

/* ================= TYPES ================= */

type TeamMember = {
  enrollment_id: string;
  is_leader: boolean;
};

type ApiTeamResponse = {
  team_id: string;
  team_name?: string | null;
  department: string;
  max_team_size: number;
  leader_enrollment_id: string;
  project_title?: string | null;
  created_at?: string;
  members: TeamMember[];
  projects?: Record<string, unknown>[];
};

/* ================= PAGE ================= */

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = params?.teamId as string | undefined;
  const router = useRouter();

  const [team, setTeam] = useState<ApiTeamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [confirmMember, setConfirmMember] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);

  const [myId, setMyId] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const id = localStorage.getItem("enrollmentId");
      setMyId((id || "").trim());
    }
  }, []);

  useEffect(() => {
    if (!teamId) return;
    fetchTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const fetchTeam = async () => {
    if (!teamId || typeof teamId !== "string") return;
    try {
      const res = await getTeamById(teamId);
      const data = res?.data ?? res;

      const normalized: ApiTeamResponse = {
        ...data.team,
        members: data.members || [],
        projects: data.projects || [],
      };

      setTeam(normalized);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string } | null;
      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load team details"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!team || !confirmMember) return;

    try {
      setRemoving(true);
      await removeTeamMember(team.team_id, confirmMember.enrollment_id);
      setConfirmMember(null);
      fetchTeam();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string } | null;
      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to remove member"
      );
    } finally {
      setRemoving(false);
    }
  };

  const isLeader =
    !!team &&
    !!myId &&
    team.leader_enrollment_id.trim() === myId;

  const locked = !!team?.projects?.length;

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-900 text-[#1f2a44]">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar title={teamId ? `Team ${teamId}` : "Team"} showSearch />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/team/my-teams")}
              className="px-5 py-2 rounded-full font-medium text-sm bg-white text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-sm hover:shadow-md transition-all"
            >
              ← Back
            </button>
          </div>


          {loading && <div className="text-slate-400">Loading team...</div>}

          {error && (
            <div className="rounded-xl border border-red-300 bg-red-100 p-4 text-red-700">
              {error}
            </div>
          )}

          {!loading && team && (
            <div className="space-y-6">
              {/* Main Team Card */}
              <div className="glass rounded-2xl p-8 space-y-6 category-hover border border-white/20">
                <div className="flex justify-between items-start gap-6">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                      {team.team_name || `Team ${team.team_id}`}
                    </h1>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm text-slate-600 font-medium bg-blue-50 px-3 py-1 rounded-lg">
                        ID: {team.team_id}
                      </span>
                      <span className="text-sm text-slate-600 font-medium bg-purple-50 px-3 py-1 rounded-lg">
                        {team.department}
                      </span>
                      <span className={`text-sm font-medium px-3 py-1 rounded-lg ${
                        team.project_title 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {team.project_title ? '✓ Project Active' : '○ No Project'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-100 to-blue-100 p-4 rounded-xl shrink-0">
                    <Users className="text-indigo-600" size={32} />
                  </div>
                </div>

                {/* Project Info */}
                {team.project_title && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide mb-1">Project</p>
                    <p className="text-lg font-bold text-emerald-900">
                      📋 {team.project_title}
                    </p>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Team Size</p>
                    <p className="text-2xl font-bold text-slate-800">
                      {team.members.length}/{team.max_team_size}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Status</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {locked ? '✓ Locked' : '● Active'}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Members</p>
                    <p className="text-2xl font-bold text-slate-800">
                      {team.members.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Team Members Section */}
              <div className="glass rounded-2xl p-8 category-hover border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">Team Members</h2>
                  {isLeader && !locked && (
                    <button
                      onClick={() => setEditMode((v) => !v)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        editMode
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {editMode ? '✕ Cancel' : '✏️ Edit'}
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {team.members.map((m) => {
                    const canRemove =
                      editMode && isLeader && !locked && !m.is_leader;

                    return (
                      <div
                        key={m.enrollment_id}
                        onClick={() =>
                          canRemove && setConfirmMember(m)
                        }
                        className={`p-4 rounded-xl border-2 transition ${
                          m.is_leader
                            ? 'bg-indigo-50 border-indigo-300'
                            : 'bg-slate-50 border-slate-200'
                        } ${
                          canRemove
                            ? 'cursor-pointer hover:bg-red-100 hover:border-red-400 ring-2 ring-red-200'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {m.enrollment_id}
                            </p>
                            {m.is_leader && (
                              <p className="text-xs text-indigo-600 font-bold mt-1">👑 Team Leader</p>
                            )}
                          </div>
                          {canRemove && (
                            <span className="text-xs text-red-600 font-bold">Click to remove</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {confirmMember && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-90 space-y-4 animate-pop">
            <h3 className="text-lg font-semibold text-slate-800">
              Remove Member?
            </h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to remove{" "}
              <b>{confirmMember.enrollment_id}</b> from this team?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmMember(null)}
                className="px-4 py-2 rounded-lg border text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                onClick={handleRemove}
                disabled={removing}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
              >
                {removing ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .glass {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
        }

        .category-hover {
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .category-hover:hover {
          transform: translateY(-6px);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.12);
        }

        .animate-pop {
          animation: pop 0.25s ease-out;
        }

        @keyframes pop {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

