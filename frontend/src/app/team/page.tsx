"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/sidebar/StudentSidebar";
import Topbar from "@/components/dashboard/Topbar";

import { getMyTeams } from "@/services/team/team.service";
import { getMyInvitations } from "@/services/team/invitation.service";

export default function TeamDashboard() {
  const router = useRouter();

  const [teamCount, setTeamCount] = useState<number>(0);
  const [inviteCount, setInviteCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      const teamRes = await getMyTeams();
      setTeamCount(teamRes?.count ?? teamRes?.teams?.length ?? 0);

      const inviteRes = await getMyInvitations();
      setInviteCount(inviteRes?.count ?? inviteRes?.invitations?.length ?? 0);
    } catch (err) {
      console.error("Failed to fetch team stats", err);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      t: "My Teams",
      v: loading ? "…" : teamCount,
      g: "from-blue-400 to-blue-600",
      p: "/team/my-teams",
    },
    {
      t: "New Invitations",
      v: loading ? "…" : inviteCount,
      g: "from-emerald-400 to-emerald-600",
      p: "/team/invitations",
    },
    {
      t: "Send Invite",
      v: "Invite member", // next phase
      g: "from-amber-400 to-amber-600",
      p: "/team/requests",
    },
    {
      t: "Meeting in $ Hr",
      v: "1", // later
      g: "from-indigo-400 to-indigo-600",
      p: "/meetings",
    },
  ];

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-300 text-[#1f2a44]">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar title="Team & Collaboration" showSearch />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6">
          {/* ================= STATS ================= */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {stats.map((c) => (
              <div
                key={c.t}
                onClick={() => router.push(c.p)}
                className={`cursor-pointer rounded-2xl p-4 text-white bg-gradient-to-r ${c.g} category-hover truncate`}
              >
                <div className="text-sm opacity-80 truncate">{c.t}</div>
                <div className="text-3xl font-bold truncate">{c.v}</div>
                <button className="mt-3 bg-white/20 px-3 py-1 rounded-lg text-sm hover:bg-white/30">
                  View
                </button>
              </div>
            ))}
          </div>

          {/* ================= CONTENT (UNCHANGED) ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[60vh]">
            {/* Left Column */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div
                onClick={() => router.push("/project")}
                className="glass rounded-2xl p-6 category-hover cursor-pointer"
              >
                <h2 className="font-semibold text-lg mb-1 truncate">
                  AI Study Helper
                </h2>
                <p className="text-sm text-gray-600 truncate">
                  Develop an AI assistant to help students with their studies.
                </p>
                <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  View Details
                </button>
              </div>

              <div
                onClick={() => router.push("/team/activity")}
                className="glass rounded-2xl p-6 category-hover cursor-pointer flex-1"
              >
                <h3 className="font-semibold mb-4 truncate">
                  Activity Feed
                </h3>

                {[
                  "Vikram Patel requested to join a team",
                  "Priya Singh uploaded files",
                  "Rohan Das created a new team",
                  "Aditya Mehta accepted invite",
                ].map((t, i) => (
                  <div
                    key={i}
                    className="py-3 px-3 mb-2 rounded-lg text-sm category-hover bg-white/40 truncate"
                  >
                    {t}
                  </div>
                ))}

                <button className="mt-3 text-blue-600 text-sm hover:underline">
                  View All Activity →
                </button>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-6">
              <div
                onClick={() => router.push("/team/groups")}
                className="glass rounded-xl p-4 category-hover cursor-pointer"
              >
                <h3 className="font-medium mb-2 truncate">
                  Group Study
                </h3>
                <div className="flex justify-between items-center gap-2">
                  <span className="truncate">
                    Algorithm & Data Structures
                  </span>
                  <button className="bg-amber-500 text-white px-3 py-1 rounded-lg shrink-0">
                    Join
                  </button>
                </div>
              </div>

              <div className="glass rounded-xl p-4 category-hover">
                <h3 className="font-medium mb-3 truncate">
                  Quick Links
                </h3>

                {[
                  { t: "Schedule Meeting", p: "/meetings" },
                  { t: "Collaborate Tasks", p: "/team/tasks" },
                  { t: "Browse Projects", p: "/project" },
                ].map((i) => (
                  <div
                    key={i.t}
                    onClick={() => router.push(i.p)}
                    className="cursor-pointer flex justify-between items-center py-3 px-3 mb-2 rounded-lg text-sm bg-white/40 category-hover"
                  >
                    <span className="truncate">{i.t}</span>
                    <button className="text-blue-600 hover:underline shrink-0">
                      Manage
                    </button>
                  </div>
                ))}
              </div>

              <div
                onClick={() => router.push("/team/ratings")}
                className="glass rounded-xl p-4 category-hover cursor-pointer"
              >
                <h3 className="font-medium mb-3 truncate">
                  Peer Ratings
                </h3>

                {[
                  { n: "Rahul Sharma", r: "4.8" },
                  { n: "Anjali Kapoor", r: "4.7" },
                  { n: "Sneha Verma", r: "4.6" },
                ].map((u) => (
                  <div
                    key={u.n}
                    className="flex justify-between items-center py-3 px-3 mb-2 rounded-lg text-sm bg-white/40 category-hover"
                  >
                    <span className="truncate">{u.n}</span>
                    <span className="text-amber-500 font-medium shrink-0">
                      {u.r}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      <style jsx global>{`
        .glass {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
        }

        .category-hover {
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .category-hover:hover {
          transform: translateY(-6px) scale(1.03);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.18);
        }
      `}</style>
    </div>
  );
}
