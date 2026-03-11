"use client";

import { useEffect, useState } from "react";
import { getMyTeams } from "@/services/team/team.service";
import Sidebar from "@/components/sidebar/StudentSidebar";
import Topbar from "@/components/dashboard/Topbar";
import { Users } from "lucide-react";
import { useRouter } from "next/navigation";

type Team = {
  team_id: string;
  team_name?: string | null;
  department: string;
  max_team_size: number;
  leader_enrollment_id: string;
  project_title?: string | null;
  created_at?: string;
  members: {
    enrollment_id: string;
    is_leader: boolean;
  }[];
};

export default function MyTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await getMyTeams();
      setTeams(res.teams || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-900 text-slate-900">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar title="My Teams" showSearch />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6">
          {/* Back + Create Buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/team")}
              className="uiverse-back-btn"
            >
              ← Back
            </button>

            <button
              onClick={() => router.push("/team/create")}
              className="uiverse-create-btn"
            >
              + Create Team
            </button>
          </div>

          {loading && (
            <div className="text-slate-300">Loading teams...</div>
          )}

          {!loading && teams.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center text-slate-700">
              You are not part of any team yet.
            </div>
          )}

          {!loading && teams.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {teams.map((team) => {
                const leader = team.members.find((m) => m.is_leader);

                return (
                  <div
                    key={team.team_id}
                    className="glass rounded-2xl p-6 category-hover flex flex-col gap-4 border border-white/20"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200/30">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-lg truncate text-slate-900">
                          {team.team_name || `Team ${team.team_id}`}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-1 truncate">
                          ID: {team.team_id}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-100 to-indigo-100 p-2 rounded-lg shrink-0">
                        <Users className="text-blue-600" size={20} />
                      </div>
                    </div>

                    {/* Info Grid */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Department</p>
                        <p className="text-sm font-medium text-slate-800">{team.department}</p>
                      </div>

                      {team.project_title && (
                        <div>
                          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Project</p>
                          <p className="text-sm font-medium text-emerald-700 truncate">
                            📋 {team.project_title}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-slate-500 font-semibold">Team Size</p>
                          <p className="text-sm font-bold text-slate-800 mt-1">
                            {team.members.length}/{team.max_team_size}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-semibold">Status</p>
                          <p className="text-sm font-bold mt-1">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              team.project_title 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {team.project_title ? '✓ Active' : '○ Pending'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Members Preview */}
                    <div className="pt-2">
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Leader</p>
                      <div className="bg-indigo-50 rounded-lg px-3 py-2">
                        <p className="text-sm font-medium text-indigo-700">
                          {leader?.enrollment_id || "-"}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto pt-3 flex gap-2">
                      <button
                        onClick={() => router.push(`/team/${team.team_id}`)}
                        className="flex-1 open-pill-btn"
                      >
                        Open
                      </button>

                      <button
                        onClick={() =>
                          router.push(`/team/${team.team_id}/chat`)
                        }
                        className="flex-1 chat-pill-btn"
                      >
                        Chat
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

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

        .uiverse-back-btn,
        .uiverse-create-btn {
          padding: 0.75em 2em;
          font-size: 13px;
          letter-spacing: 1.5px;
          font-weight: 600;
          color: #fff;
          border: none;
          border-radius: 50px;
          box-shadow: 0px 8px 15px rgba(0, 0, 0, 0.12);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .uiverse-back-btn {
          background: linear-gradient(135deg, #64748b 0%, #475569 100%);
        }

        .uiverse-back-btn:hover {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          transform: translateY(-4px);
          box-shadow: 0px 12px 24px rgba(220, 38, 38, 0.4);
        }

        .uiverse-create-btn {
          background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
        }

        .uiverse-create-btn:hover {
          transform: translateY(-4px);
          box-shadow: 0px 12px 24px rgba(22, 163, 74, 0.4);
        }

        .open-pill-btn {
          padding: 0.65em 1.4em;
          border-radius: 50px;
          border: 2px solid #2563eb;
          font-size: 13px;
          font-weight: 600;
          background: #ffffff;
          color: #2563eb;
          cursor: pointer;
          box-shadow: 0px 4px 12px rgba(37, 99, 235, 0.15);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .open-pill-btn:hover {
          background-color: #2563eb;
          color: #fff;
          transform: translateY(-3px);
          box-shadow: 0px 12px 24px rgba(37, 99, 235, 0.4);
        }

        .chat-pill-btn {
          padding: 0.65em 1.4em;
          border-radius: 50px;
          border: 2px solid #6366f1;
          font-size: 13px;
          font-weight: 600;
          background: #eef2ff;
          color: #4f46e5;
          cursor: pointer;
          box-shadow: 0px 4px 12px rgba(99, 102, 241, 0.15);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .chat-pill-btn:hover {
          background-color: #6366f1;
          color: #fff;
          transform: translateY(-3px);
          box-shadow: 0px 12px 24px rgba(99, 102, 241, 0.4);
        }
      `}</style>
    </div>
  );
}
