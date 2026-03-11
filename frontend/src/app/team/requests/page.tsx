"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/sidebar/StudentSidebar";
import Topbar from "@/components/dashboard/Topbar";

import { getMyTeams } from "@/services/team/team.service";
import { sendTeamInvite } from "@/services/team/invitation.service";

type Team = {
  team_id: string;
  team_name?: string;
};

export default function SendInvitePage() {
  const router = useRouter();

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  const [enrollmentId, setEnrollmentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await getMyTeams();
      setTeams(res?.teams || []);
    } catch {
      setError("Failed to load your teams");
    } finally {
      setPageLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamId || !enrollmentId) {
      setError("Team and Enrollment ID are required");
      return;
    }

    setLoading(true);
    setSuccess("");
    setError("");

    try {
      await sendTeamInvite(teamId, enrollmentId);
      setSuccess("Invitation sent successfully!");
      setEnrollmentId("");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? // @ts-expect-error Axios error shape
            err.response?.data?.message
          : null;
      setError(message || "Failed to send invite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gradient-to-br from-slate-200 to-blue-200 text-[#1f2a44]">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar title="Send Team Invite" showSearch />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6">
          
            {/* Left */}
            <div className="flex items-center gap-4">

             <button
              onClick={() => router.push("/team")}
              className="uiverse-back-btn"
            >
              ← Back
            </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[60vh]">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="glass rounded-2xl p-8 category-hover">
                <h2 className="font-semibold text-xl mb-6 truncate text-blue-800">
                  Invite Student to Your Team
                </h2>

                {pageLoading ? (
                  <p className="text-sm text-gray-600">Loading teams...</p>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="field-hover">
                      <label className="text-sm font-medium text-slate-700">
                        Select Team
                      </label>
                      <select
                        value={teamId}
                        onChange={(e) => setTeamId(e.target.value)}
                        className="mt-1 w-full p-3 rounded-xl border border-blue-300 bg-white/70 focus:outline-none"
                      >
                        <option value="">-- Select Team --</option>
                        {teams.map((t) => (
                          <option key={t.team_id} value={t.team_id}>
                            {t.team_name || t.team_id}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field-hover">
                      <label className="text-sm font-medium text-slate-700">
                        Student Enrollment ID
                      </label>
                      <input
                        type="text"
                        value={enrollmentId}
                        onChange={(e) => setEnrollmentId(e.target.value)}
                        placeholder="Enter Enrollment ID"
                        className="mt-1 w-full p-3 rounded-xl border border-blue-300 bg-white/70 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || teams.length === 0}
                      className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-300 category-hover disabled:opacity-60"
                    >
                      {loading ? "Sending..." : "Send Invite"}
                    </button>

                    {success && (
                      <p className="text-green-600 text-sm">{success}</p>
                    )}
                    {error && (
                      <p className="text-red-600 text-sm">{error}</p>
                    )}
                  </form>
                )}
              </div>
            </div>

            {/* Right */}
            <div className="flex flex-col gap-6">
              <div
                onClick={() => router.push("/team/my-teams")}
                className="glass rounded-xl p-4 category-hover cursor-pointer"
              >
                <h3 className="font-medium mb-1 truncate text-slate-800">
                  My Teams
                </h3>
                <p className="text-sm text-slate-600 truncate">
                  View and manage your teams
                </p>
              </div>

              <div
                onClick={() => router.push("/team/invitations")}
                className="glass rounded-xl p-4 category-hover cursor-pointer"
              >
                <h3 className="font-medium mb-1 truncate text-slate-800">
                  Invitations
                </h3>
                <p className="text-sm text-slate-600 truncate">
                  Check pending invites
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>

      <style jsx global>{`
        .glass {
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(180, 200, 255, 0.6);
          box-shadow: 0 20px 40px rgba(30, 60, 120, 0.15);
        }

        .category-hover {
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .category-hover:hover {
          transform: translateY(-6px) scale(1.03);
          box-shadow: 0 30px 60px rgba(30, 60, 120, 0.25);
        }

        .field-hover {
          transition: all 0.3s ease;
        }

        .field-hover:hover {
          transform: translateY(-2px);
        }

        /* ===== Custom Select Styling ===== */
        select {
          color: #1f2a44;
          transition: all 0.25s ease;
        }

        select:focus {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.35);
          transform: translateY(-1px);
        }

        select option {
          color: #1f2a44;
          background: #f8fafc;
          padding: 10px;
        }

        select option:hover {
          background: #dbeafe;
          color: #1e3a8a;
        }

        select option:checked {
          background: #3b82f6;
          color: white;
        }
            .uiverse-back-btn,
        .uiverse-create-btn {
          padding: 1em 2.5em;
          font-size: 12px;
          letter-spacing: 2.5px;
          font-weight: 500;
          color: #000;
          background-color: #fff;
          border: none;
          border-radius: 45px;
          box-shadow: 0px 8px 15px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .uiverse-back-btn:hover {
          background-color: #dc2626;
          box-shadow: 0px 15px 20px rgba(220, 38, 38, 0.45);
          color: #fff;
          transform: translateY(-7px);
        }
      `}</style>
    </div>
  );
}
