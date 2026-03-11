"use client";

import { useMemo, useState } from "react";
import {
  downloadProgressReport,
  getProgressReportPreview,
  type ProgressReportPreview,
} from "@/services/tracker.service";

const initialPreview: ProgressReportPreview = {
  generated_at: "",
  filters: {
    projectId: null,
    teamId: null,
    weekStart: null,
    weekEnd: null,
  },
  summary: {
    totalRows: 0,
    totalProjects: 0,
    totalWeeks: 0,
    pendingWeeks: 0,
    submittedWeeks: 0,
    underReviewWeeks: 0,
    approvedWeeks: 0,
    rejectedWeeks: 0,
    missedWeeks: 0,
  },
  rows: [],
};

export default function AdminReportsPage() {
  const [projectId, setProjectId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [downloading, setDownloading] = useState<"" | "csv" | "pdf">("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState<ProgressReportPreview>(initialPreview);

  const filters = useMemo(
    () => ({
      projectId: projectId.trim() || undefined,
      teamId: teamId.trim() || undefined,
      weekStart: weekStart ? Number(weekStart) : undefined,
      weekEnd: weekEnd ? Number(weekEnd) : undefined,
    }),
    [projectId, teamId, weekStart, weekEnd]
  );

  const validateWeekRange = () => {
    if (filters.weekStart && filters.weekEnd && filters.weekStart > filters.weekEnd) {
      setError("Week start cannot be greater than week end.");
      return false;
    }
    return true;
  };

  const loadPreview = async () => {
    if (!validateWeekRange()) return;

    try {
      setLoadingPreview(true);
      setError("");
      setSuccess("");
      const data = await getProgressReportPreview(filters);
      setPreview(data);
      setSuccess(`Preview generated. ${data.summary.totalRows} row(s) validated.`);
    } catch {
      setError("Failed to generate report preview. Please retry.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = async (format: "csv" | "pdf") => {
    if (!validateWeekRange()) return;

    try {
      setDownloading(format);
      setError("");
      setSuccess("");

      const blob = await downloadProgressReport(format, filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tracker-progress-report.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);

      setSuccess(`Progress report downloaded in ${format.toUpperCase()} format.`);
    } catch {
      setError("Report download failed. Please retry.");
    } finally {
      setDownloading("");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Phase 6 Reports and Exports</h1>
        <p className="mt-1 text-sm text-slate-600">
          Generate filtered project progress reports by project, team, and week range. Validate data before download.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Report Filters</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            placeholder="Project ID (optional)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={teamId}
            onChange={(event) => setTeamId(event.target.value)}
            placeholder="Team ID (optional)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={1}
            value={weekStart}
            onChange={(event) => setWeekStart(event.target.value)}
            placeholder="Week start"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={1}
            value={weekEnd}
            onChange={(event) => setWeekEnd(event.target.value)}
            placeholder="Week end"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadPreview()}
            disabled={loadingPreview}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            {loadingPreview ? "Validating..." : "Validate Accuracy (Preview)"}
          </button>
          <button
            type="button"
            onClick={() => void handleDownload("csv")}
            disabled={downloading !== ""}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {downloading === "csv" ? "Downloading..." : "Download CSV"}
          </button>
          <button
            type="button"
            onClick={() => void handleDownload("pdf")}
            disabled={downloading !== ""}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {downloading === "pdf" ? "Downloading..." : "Download PDF"}
          </button>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        {success ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <SummaryCard label="Rows" value={preview.summary.totalRows} />
        <SummaryCard label="Projects" value={preview.summary.totalProjects} />
        <SummaryCard label="Weeks" value={preview.summary.totalWeeks} />
        <SummaryCard label="Approved" value={preview.summary.approvedWeeks} />
        <SummaryCard label="Rejected" value={preview.summary.rejectedWeeks} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Report Preview (Top 15 Rows)</h2>
          <p className="text-sm text-slate-500">Use this to validate report accuracy before exporting.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-left">Week</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Risk</th>
                <th className="px-4 py-3 text-left">Health</th>
                <th className="px-4 py-3 text-left">Review</th>
                <th className="px-4 py-3 text-left">Mentor</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    No preview rows yet. Click Validate Accuracy to load filtered report data.
                  </td>
                </tr>
              ) : (
                preview.rows.slice(0, 15).map((row, index) => (
                  <tr key={`${String(row.project_id || "-")}-${String(row.week_id || index)}`} className="border-t border-slate-100">
                    <td className="px-4 py-2">{String(row.project_id || "-")}</td>
                    <td className="px-4 py-2">{String(row.week_number || "-")}</td>
                    <td className="px-4 py-2">{String(row.week_status || "-")}</td>
                    <td className="px-4 py-2">{String(row.risk_level || "-")}</td>
                    <td className="px-4 py-2">{String(row.health_score || "-")}</td>
                    <td className="px-4 py-2">{String(row.latest_review_action || "-")}</td>
                    <td className="px-4 py-2">{String(row.mentor_name || row.mentor_employee_id || "-")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
