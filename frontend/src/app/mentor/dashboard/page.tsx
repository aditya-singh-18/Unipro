"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StatCard from "@/components/dashboard/StatCard";
import { getMentorTrackerDashboard } from "@/services/tracker.service";

export default function MentorDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    assigned_projects: 0,
    review_queue: 0,
    risk_alert_projects: 0,
    approved_weeks: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await getMentorTrackerDashboard();
        setStats(data);
      } catch {
        setStats({
          assigned_projects: 0,
          review_queue: 0,
          risk_alert_projects: 0,
          approved_weeks: 0,
        });
      }
    };

    void loadStats();
  }, []);

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
                <th className="text-center">Skill Match</th>
                <th className="text-center">Progress</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              <ProjectRow
                name="Smart LMS"
                tech="React, Node"
                skill={88}
                progress={75}
              />
              <ProjectRow
                name="ML Attendance"
                tech="Python, ML"
                skill={91}
                progress={42}
              />
              <ProjectRow
                name="Campus ERP"
                tech="Next.js, PostgreSQL"
                skill={79}
                progress={60}
              />
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
  skill,
  progress,
}: {
  name: string;
  tech: string;
  skill: number;
  progress: number;
}) {
  return (
    <tr className="border-b last:border-none hover:bg-black/5 transition">
      <td className="py-3 font-medium">{name}</td>
      <td className="text-center text-gray-600">{tech}</td>
      <td className="text-center">{skill}%</td>
      <td className="text-center">{progress}%</td>
      <td className="text-center text-blue-600 cursor-pointer hover:underline">
        View
      </td>
    </tr>
  );
}