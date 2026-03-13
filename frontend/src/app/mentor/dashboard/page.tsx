"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StatCard from "@/components/dashboard/StatCard";
import { getMentorTrackerDashboard } from "@/services/tracker.service";
import { getMentorAssignedProjects, type MentorAssignedProject } from "@/services/project.service";

const getStatusLabel = (status: string) => {
  if (status === "ASSIGNED_TO_MENTOR") return "New Assignment";
  if (status === "RESUBMITTED") return "Resubmitted";
  if (status === "APPROVED" || status === "ACTIVE") return "Active";
  if (status === "COMPLETED") return "Completed";
  return status;
};

const getStatusBadgeClass = (status: string) => {
  if (status === "ASSIGNED_TO_MENTOR") return "bg-blue-100 text-blue-700";
  if (status === "RESUBMITTED") return "bg-indigo-100 text-indigo-700";
  if (status === "APPROVED" || status === "ACTIVE") return "bg-emerald-100 text-emerald-700";
  if (status === "COMPLETED") return "bg-violet-100 text-violet-700";
  return "bg-slate-100 text-slate-700";
};

const formatTimeAgo = (value: string) => {
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return "Recently";

  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day ago`;

  const months = Math.floor(days / 30);
  return `${months} month ago`;
};

const normalizeTechStack = (techStack?: string[]) => {
  if (!Array.isArray(techStack) || techStack.length === 0) return "-";
  return techStack.slice(0, 3).join(", ");
};

export default function MentorDashboardPage() {
  const router = useRouter();
  const [assignedProjects, setAssignedProjects] = useState<MentorAssignedProject[]>([]);
  const [stats, setStats] = useState({
    assigned_projects: 0,
    review_queue: 0,
    risk_alert_projects: 0,
    approved_weeks: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [dashboard, assigned] = await Promise.all([
          getMentorTrackerDashboard(),
          getMentorAssignedProjects(),
        ]);

        setStats(dashboard);
        setAssignedProjects(assigned.projects || []);
      } catch {
        setStats({
          assigned_projects: 0,
          review_queue: 0,
          risk_alert_projects: 0,
          approved_weeks: 0,
        });
        setAssignedProjects([]);
      }
    };

    void loadStats();
  }, []);

  const recentAssignedFeed = assignedProjects
    .filter((project) => project.status === "ASSIGNED_TO_MENTOR" || project.status === "RESUBMITTED")
    .slice(0, 5);

  return (
    <>
      {/* 🔹 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Projects"
          value={String(stats.assigned_projects)}
          bg="from-blue-400 to-blue-600"
          onClick={() => router.push("/mentor/projects")}
        />
        <StatCard
          title="Review Queue"
          value={String(stats.review_queue)}
          bg="from-emerald-400 to-emerald-600"
        />
        <StatCard
          title="Risk Alerts"
          value={String(stats.risk_alert_projects)}
          bg="from-amber-400 to-amber-600"
        />
        <StatCard
          title="Approved Weeks"
          value={String(stats.approved_weeks)}
          bg="from-indigo-400 to-indigo-600"
        />
      </div>

      {/* 🔹 Recent Assignment Feed */}
      <div className="glass rounded-2xl p-6 mt-6 category-hover">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent Assignment Feed</h2>
          <button
            onClick={() => router.push("/mentor/projects")}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Open Review Queue →
          </button>
        </div>

        {recentAssignedFeed.length === 0 ? (
          <p className="text-sm text-slate-500">No new assignments right now.</p>
        ) : (
          <div className="space-y-3">
            {recentAssignedFeed.map((project) => (
              <div
                key={String(project.project_id)}
                className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{project.title}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Project ID: {project.project_id} · Assigned {formatTimeAgo(project.created_at)}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(project.status)}`}>
                    {getStatusLabel(project.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔹 Assigned Projects */}
      <div className="glass rounded-2xl p-6 mt-6 category-hover">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Assigned Projects</h2>
          <button
            onClick={() => router.push("/mentor/projects")}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View All →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-500 border-b">
              <tr>
                <th className="text-left py-2">Project</th>
                <th className="text-center">Tech Stack</th>
                <th className="text-center">Status</th>
                <th className="text-center">Assigned</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {assignedProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-500">
                    No assigned projects found.
                  </td>
                </tr>
              ) : (
                assignedProjects.slice(0, 6).map((project) => (
                  <ProjectRow
                    key={String(project.project_id)}
                    name={project.title}
                    tech={normalizeTechStack(project.tech_stack)}
                    status={project.status}
                    createdAt={project.created_at}
                    onView={() => router.push("/mentor/projects")}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function ProjectRow({
  name,
  tech,
  status,
  createdAt,
  onView,
}: {
  name: string;
  tech: string;
  status: string;
  createdAt: string;
  onView: () => void;
}) {
  return (
    <tr className="border-b last:border-none hover:bg-black/5 transition">
      <td className="py-3 font-medium">{name}</td>
      <td className="text-center text-gray-600">{tech}</td>
      <td className="text-center">{getStatusLabel(status)}</td>
      <td className="text-center">{formatTimeAgo(createdAt)}</td>
      <td className="text-center text-blue-600 cursor-pointer hover:underline" onClick={onView}>
        View
      </td>
    </tr>
  );
}