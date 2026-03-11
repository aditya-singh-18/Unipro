"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/sidebar/StudentSidebar";
import Topbar from "@/components/dashboard/Topbar";
import StatCard from "@/components/dashboard/StatCard";
import { useRouter } from "next/navigation";
import { getMyProjects } from "@/services/project.service";
import { getStudentViewMentorProfile } from "@/services/mentor.service";
import { getStudentTrackerDashboard } from "@/services/tracker.service";

type AssignedMentor = {
  employeeId: string;
  fullName: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [assignedMentor, setAssignedMentor] = useState<AssignedMentor | null>(null);
  const [trackerStats, setTrackerStats] = useState({
    total_projects: 0,
    pending_weeks: 0,
    rejected_weeks: 0,
    high_risk_projects: 0,
  });

  useEffect(() => {
    const loadAssignedMentor = async () => {
      try {
        const projectsRes = await getMyProjects();
        const assignedProject = (projectsRes.projects || []).find(
          (project) => Boolean(project.mentor_employee_id)
        );

        if (!assignedProject?.mentor_employee_id) {
          setAssignedMentor(null);
          return;
        }

        const profile = await getStudentViewMentorProfile(assignedProject.mentor_employee_id);

        setAssignedMentor({
          employeeId: profile.employee_id,
          fullName: profile.full_name,
        });
      } catch {
        setAssignedMentor(null);
      }
    };

    void loadAssignedMentor();
  }, []);

  useEffect(() => {
    const loadTrackerStats = async () => {
      try {
        const stats = await getStudentTrackerDashboard();
        setTrackerStats(stats);
      } catch {
        setTrackerStats({
          total_projects: 0,
          pending_weeks: 0,
          rejected_weeks: 0,
          high_risk_projects: 0,
        });
      }
    };

    void loadTrackerStats();
  }, []);

  const mentorCardValue = useMemo(() => {
    return assignedMentor?.fullName || "Mentor Not Assigned";
  }, [assignedMentor]);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-300 text-slate-900">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar title="Student Dashboard" showSearch />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6">
          {/* ================= STATS ================= */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="stat-wrap">
              <StatCard
                title="Project Status"
                value={`${trackerStats.total_projects} Projects`}
                bg="bg-gradient-to-r from-blue-400 to-blue-600"
                onClick={() => router.push("/project")}
              />
            </div>

            <div className="stat-wrap">
              <StatCard
                title="Pending Weeks"
                value={String(trackerStats.pending_weeks)}
                bg="bg-gradient-to-r from-emerald-400 to-emerald-600"
                onClick={() => router.push("/progress")}
              />
            </div>

            <div className="stat-wrap">
              <StatCard
                title="My Mentor"
                value={mentorCardValue}
                bg="bg-gradient-to-r from-indigo-400 to-indigo-600"
                footer={assignedMentor ? "View Profile" : "Pending"}
                onClick={() => {
                  if (!assignedMentor) return;
                  router.push(`/student/mentor/${assignedMentor.employeeId}`);
                }}
              />
            </div>

            <div className="stat-wrap">
              <StatCard
                title="Risk Alerts"
                value={String(trackerStats.high_risk_projects)}
                bg="bg-gradient-to-r from-amber-400 to-amber-600"
                footer={`${trackerStats.rejected_weeks} rejected weeks`}
                onClick={() => router.push("/progress")}
              />
            </div>
          </div>

          {/* ================= CONTENT ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[60vh]">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div
                onClick={() => router.push("/progress")}
                className="glass rounded-2xl p-6 category-hover cursor-pointer flex-1"
              >
                <h3 className="font-semibold mb-4 truncate text-slate-900">
                  Project Progress
                </h3>
                <div className="h-full flex items-center justify-center text-slate-500 truncate">
                  Progress chart - Backend connection left
                </div>
              </div>

              <div
                onClick={() => router.push("/ai")}
                className="glass rounded-2xl p-6 category-hover cursor-pointer"
              >
                <h3 className="font-semibold mb-3 truncate text-slate-900">
                  AI Suggestions
                </h3>

                {[
                  "Finish API integration",
                  "Optimize database queries",
                  "UI best practices",
                ].map((i) => (
                  <div
                    key={i}
                    className="py-3 px-3 mb-2 rounded-lg text-sm bg-white/60 category-hover truncate text-slate-700"
                  >
                    • {i}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div
                onClick={() => router.push("/updates")}
                className="glass rounded-2xl p-6 category-hover cursor-pointer flex-1"
              >
                <h3 className="font-semibold mb-4 truncate text-slate-900">
                  Recent Updates
                </h3>

                {[
                  "Mentor Feedback – Backend connection left",
                  "Team Meeting – Backend connection left",
                  "Upcoming Milestone – Backend connection left",
                ].map((t, i) => (
                  <div
                    key={i}
                    className="py-3 px-3 mb-2 rounded-lg text-sm category-hover bg-white/60 truncate text-slate-700"
                  >
                    {t}
                  </div>
                ))}
              </div>

              <div
                onClick={() => router.push("/team")}
                className="glass rounded-2xl p-5 category-hover cursor-pointer"
              >
                <h3 className="font-medium mb-2 truncate text-slate-900">
                  Team Collaboration
                </h3>
                <div className="text-slate-600 truncate">
                  Chat / tasks - Backend connection left
                </div>
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

        /* ---- StatCard View Button Fix ---- */
        .stat-wrap button {
          margin-block-start: auto;
          padding: 6px 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.28);
          color: #fff;
          font-size: 13px;
          line-height: 1;
          transition: 0.25s ease;
        }

        .stat-wrap button:hover {
          background: rgba(255, 255, 255, 0.38);
        }
      `}</style>
    </div>
  );
}
