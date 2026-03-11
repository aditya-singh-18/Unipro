"use client";

import { useEffect, useState } from "react";
import {
  getAdminDepartmentLeaderboard,
  type AdminDepartmentLeaderboardItem,
} from "@/services/tracker.service";

export default function AdminDepartmentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<AdminDepartmentLeaderboardItem[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError("");
        setItems(await getAdminDepartmentLeaderboard(25));
      } catch {
        setError("Failed to load department leaderboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Department Performance</h1>
        <p className="mt-1 text-sm text-slate-500">
          Department-wise tracker pressure, health, and review lag leaderboard for administrative follow-up.
        </p>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          title="Departments Tracked"
          value={items.length}
          subtitle="Visible in leaderboard"
          tone="neutral"
        />
        <SummaryCard
          title="Critical Departments"
          value={items.filter((item) => item.department_band === "critical").length}
          subtitle="Immediate attention"
          tone="critical"
        />
        <SummaryCard
          title="Healthy Departments"
          value={items.filter((item) => item.department_band === "healthy").length}
          subtitle="Stable performance"
          tone="healthy"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Leaderboard</h2>
          <p className="text-sm text-slate-500">Sorted by pressure score, review queue, and average health.</p>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">Loading department analytics...</div>
        ) : items.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">No department analytics available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Projects</th>
                  <th className="px-4 py-3 text-left">Pressure</th>
                  <th className="px-4 py-3 text-left">Review Queue</th>
                  <th className="px-4 py-3 text-left">High Risk</th>
                  <th className="px-4 py-3 text-left">Missed</th>
                  <th className="px-4 py-3 text-left">Avg Health</th>
                  <th className="px-4 py-3 text-left">Avg Review Age</th>
                  <th className="px-4 py-3 text-left">Band</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.department} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.department}</td>
                    <td className="px-4 py-3 text-slate-700">{item.total_projects}</td>
                    <td className="px-4 py-3 text-slate-700">{item.pressure_score}</td>
                    <td className="px-4 py-3 text-slate-700">{item.review_queue}</td>
                    <td className="px-4 py-3 text-slate-700">{item.high_risk_projects}</td>
                    <td className="px-4 py-3 text-slate-700">{item.missed_weeks}</td>
                    <td className="px-4 py-3 text-slate-700">{Number(item.avg_health_score).toFixed(1)}</td>
                    <td className="px-4 py-3 text-slate-700">{Number(item.avg_review_age_hours).toFixed(1)}h</td>
                    <td className="px-4 py-3"><BandBadge band={item.department_band} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string;
  value: number;
  subtitle: string;
  tone: "neutral" | "healthy" | "critical";
}) {
  const tones = {
    neutral: "border-slate-200 bg-white text-slate-900",
    healthy: "border-emerald-200 bg-emerald-50 text-emerald-900",
    critical: "border-rose-200 bg-rose-50 text-rose-900",
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs opacity-80">{subtitle}</p>
    </div>
  );
}

function BandBadge({ band }: { band: "healthy" | "warning" | "critical" }) {
  const tones = {
    healthy: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    critical: "bg-rose-100 text-rose-700",
  };

  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${tones[band]}`}>{band}</span>;
}
