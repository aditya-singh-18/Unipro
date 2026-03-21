"use client";

import { useMemo, useState } from "react";
import {
  downloadProgressReport,
  getProgressReportPreview,
  sendGithubWebhookPayload,
  updateProjectGithubConfig,
  updateUserGithubUsername,
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
  const [previewRiskFilter, setPreviewRiskFilter] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [previewSortBy, setPreviewSortBy] = useState<"warning" | "health" | "week">("warning");
  const [setupProjectId, setSetupProjectId] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [githubWebhookSecret, setGithubWebhookSecret] = useState("");
  const [mapUserKey, setMapUserKey] = useState("");
  const [mapGithubUsername, setMapGithubUsername] = useState("");
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [setupSuccess, setSetupSuccess] = useState("");

  const filters = useMemo(
    () => ({
      projectId: projectId.trim() || undefined,
      teamId: teamId.trim() || undefined,
      weekStart: weekStart ? Number(weekStart) : undefined,
      weekEnd: weekEnd ? Number(weekEnd) : undefined,
    }),
    [projectId, teamId, weekStart, weekEnd]
  );

  const protrackInsights = useMemo(() => {
    const rows = preview.rows || [];
    const total = rows.length || 1;

    const atRisk = rows.filter((row) => {
      const risk = String(row.risk_level || "").toLowerCase();
      return risk === "high" || risk === "critical";
    }).length;

    const approved = rows.filter((row) => String(row.week_status || "").toLowerCase() === "approved").length;
    const rejected = rows.filter((row) => String(row.week_status || "").toLowerCase() === "rejected").length;
    const pendingReview = rows.filter((row) => {
      const status = String(row.week_status || "").toLowerCase();
      return status === "submitted" || status === "under_review";
    }).length;

    const avgHealth = rows.reduce((sum, row) => sum + Number(row.health_score || 0), 0) / total;

    return {
      atRisk,
      approvedRate: Math.round((approved / total) * 100),
      rejectionRate: Math.round((rejected / total) * 100),
      pendingReview,
      avgHealth: Number.isFinite(avgHealth) ? Math.round(avgHealth) : 0,
    };
  }, [preview.rows]);

  const filteredPreviewRows = useMemo(() => {
    const normalized = (preview.rows || []).map((row) => ({
      row,
      risk: String(row.risk_level || "").toLowerCase(),
      week: Number(row.week_number || 0),
      warning: Number(row.predictive_warning_score || 0),
      health: Number(row.health_score || 0),
    }));

    const filtered = normalized.filter((item) => {
      if (previewRiskFilter === "all") return true;
      return item.risk === previewRiskFilter;
    });

    const sorted = [...filtered].sort((left, right) => {
      if (previewSortBy === "health") return left.health - right.health;
      if (previewSortBy === "week") return right.week - left.week;
      return right.warning - left.warning;
    });

    return sorted;
  }, [preview.rows, previewRiskFilter, previewSortBy]);

  const setupChecklist = useMemo(() => {
    const projectReady = setupProjectId.trim().length > 0;
    const repoReady = githubRepoUrl.trim().startsWith("https://github.com/");
    const secretReady = githubWebhookSecret.trim().length >= 12;
    const mappingReady = mapUserKey.trim().length > 0 && mapGithubUsername.trim().length > 0;

    return {
      projectReady,
      repoReady,
      secretReady,
      mappingReady,
      readyForTest: projectReady && repoReady,
    };
  }, [setupProjectId, githubRepoUrl, githubWebhookSecret, mapUserKey, mapGithubUsername]);

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

  const configureProjectGithub = async () => {
    if (!setupProjectId.trim()) {
      setSetupError("Project ID is required for GitHub config.");
      return;
    }

    try {
      setSetupBusy(true);
      setSetupError("");
      setSetupSuccess("");

      const config = await updateProjectGithubConfig(setupProjectId.trim(), {
        github_repo_url: githubRepoUrl.trim() || undefined,
        github_webhook_secret: githubWebhookSecret.trim() || undefined,
      });

      setSetupSuccess(
        `GitHub config saved for project ${config.project_id}. Secret set: ${config.github_webhook_secret_set ? "Yes" : "No"}`
      );
    } catch {
      setSetupError("Failed to save project GitHub configuration.");
    } finally {
      setSetupBusy(false);
    }
  };

  const mapGithubUser = async () => {
    if (!mapUserKey.trim() || !mapGithubUsername.trim()) {
      setSetupError("Both user key and GitHub username are required.");
      return;
    }

    try {
      setSetupBusy(true);
      setSetupError("");
      setSetupSuccess("");

      const user = await updateUserGithubUsername(
        mapUserKey.trim().toUpperCase(),
        mapGithubUsername.trim()
      );

      setSetupSuccess(`Mapped ${user.user_key} -> ${user.github_username}`);
    } catch {
      setSetupError("Failed to map GitHub username to user.");
    } finally {
      setSetupBusy(false);
    }
  };

  const testWebhook = async () => {
    if (!setupProjectId.trim()) {
      setSetupError("Project ID is required for webhook test.");
      return;
    }

    try {
      setSetupBusy(true);
      setSetupError("");
      setSetupSuccess("");

      const payload = {
        ref: "refs/heads/main",
        repository: {
          html_url: githubRepoUrl.trim() || "https://github.com/example-org/example-repo",
        },
        commits: [
          {
            id: "0000000000000000000000000000000000000001",
            message: "test: webhook sync",
            timestamp: new Date().toISOString(),
            author: {
              username: mapGithubUsername.trim() || "unknown-user",
            },
            added: ["README.md"],
            removed: [],
          },
        ],
      };

      const result = await sendGithubWebhookPayload(
        setupProjectId.trim(),
        payload,
        githubWebhookSecret.trim() || undefined
      );
      setSetupSuccess(
        `Webhook test complete. Stored commits: ${result.summary.storedCommits}, recalculated: ${result.summary.recalculatedFor}`
      );
    } catch {
      setSetupError("Webhook test failed. Check repo URL/secret/user mapping.");
    } finally {
      setSetupBusy(false);
    }
  };

  const generateWebhookSecret = () => {
    const bytes = new Uint8Array(24);
    window.crypto.getRandomValues(bytes);
    const generated = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
    setGithubWebhookSecret(generated);
    setSetupSuccess("Generated a secure webhook secret. Save GitHub config to persist it.");
    setSetupError("");
  };

  const runGuidedGithubSetup = async () => {
    if (!setupProjectId.trim()) {
      setSetupError("Project ID is required before running guided setup.");
      return;
    }

    const logs: string[] = [];
    try {
      setSetupBusy(true);
      setSetupError("");
      setSetupSuccess("");

      const projectConfig = await updateProjectGithubConfig(setupProjectId.trim(), {
        github_repo_url: githubRepoUrl.trim() || undefined,
        github_webhook_secret: githubWebhookSecret.trim() || undefined,
      });
      logs.push(
        `Config saved (repo: ${projectConfig.github_repo_url || "not set"}, secret: ${projectConfig.github_webhook_secret_set ? "set" : "not set"}).`
      );

      if (mapUserKey.trim() && mapGithubUsername.trim()) {
        const mapped = await updateUserGithubUsername(mapUserKey.trim().toUpperCase(), mapGithubUsername.trim());
        logs.push(`Mapped ${mapped.user_key} to @${mapped.github_username}.`);
      }

      const payload = {
        ref: "refs/heads/main",
        repository: {
          html_url: githubRepoUrl.trim() || "https://github.com/example-org/example-repo",
        },
        commits: [
          {
            id: "0000000000000000000000000000000000000001",
            message: "test: webhook sync",
            timestamp: new Date().toISOString(),
            author: {
              username: mapGithubUsername.trim() || "unknown-user",
            },
            added: ["README.md"],
            removed: [],
          },
        ],
      };

      const result = await sendGithubWebhookPayload(
        setupProjectId.trim(),
        payload,
        githubWebhookSecret.trim() || undefined
      );
      logs.push(
        `Webhook test stored ${result.summary.storedCommits} commit(s) and recalculated ${result.summary.recalculatedFor} score(s).`
      );

      setSetupSuccess(logs.join(" "));
    } catch {
      setSetupError("Guided setup failed. Verify project ID, repo URL, and user mapping details.");
    } finally {
      setSetupBusy(false);
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

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Pending" value={preview.summary.pendingWeeks} />
        <SummaryCard label="Submitted" value={preview.summary.submittedWeeks} />
        <SummaryCard label="Under Review" value={preview.summary.underReviewWeeks} />
        <SummaryCard label="Missed" value={preview.summary.missedWeeks} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">ProTrack Analytics Snapshot</h2>
        <p className="mt-1 text-xs text-slate-500">Derived from current preview rows for quick monitoring.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <InsightCard label="At-Risk Rows" value={`${protrackInsights.atRisk}`} tone="rose" />
          <InsightCard label="Approval Rate" value={`${protrackInsights.approvedRate}%`} tone="emerald" />
          <InsightCard label="Rejection Rate" value={`${protrackInsights.rejectionRate}%`} tone="amber" />
          <InsightCard label="Pending Review" value={`${protrackInsights.pendingReview}`} tone="blue" />
          <InsightCard label="Avg Health" value={`${protrackInsights.avgHealth}`} tone="slate" />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">GitHub Sync Setup</h2>
        <p className="mt-1 text-xs text-slate-500">
          Configure project repository + webhook secret, map user GitHub usernames, and run a quick webhook sync test.
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Readiness Checklist</p>
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            <ChecklistItem label="Project ID provided" ready={setupChecklist.projectReady} />
            <ChecklistItem label="Repo URL looks valid" ready={setupChecklist.repoReady} />
            <ChecklistItem label="Secret has minimum strength" ready={setupChecklist.secretReady} />
            <ChecklistItem label="User mapping provided (optional)" ready={setupChecklist.mappingReady} optional />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            value={setupProjectId}
            onChange={(event) => setSetupProjectId(event.target.value)}
            placeholder="Project ID"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={githubRepoUrl}
            onChange={(event) => setGithubRepoUrl(event.target.value)}
            placeholder="https://github.com/org/repo"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
          />
          <input
            value={githubWebhookSecret}
            onChange={(event) => setGithubWebhookSecret(event.target.value)}
            placeholder="GitHub webhook secret"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-3"
          />
        </div>

        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={generateWebhookSecret}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            Generate Secure Secret
          </button>
          <p className="text-xs text-slate-500">Recommended length: at least 24 characters.</p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void configureProjectGithub()}
            disabled={setupBusy}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Save Project GitHub Config
          </button>
          <button
            type="button"
            onClick={() => void testWebhook()}
            disabled={setupBusy}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            Run Webhook Test
          </button>
          <button
            type="button"
            onClick={() => void runGuidedGithubSetup()}
            disabled={setupBusy || !setupChecklist.readyForTest}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Run Guided Setup
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            value={mapUserKey}
            onChange={(event) => setMapUserKey(event.target.value)}
            placeholder="User key (e.g. STU1001)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={mapGithubUsername}
            onChange={(event) => setMapGithubUsername(event.target.value)}
            placeholder="GitHub username"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void mapGithubUser()}
            disabled={setupBusy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Map Username
          </button>
        </div>

        {setupError ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{setupError}</p>
        ) : null}

        {setupSuccess ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{setupSuccess}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Report Preview (Top 15 Rows)</h2>
              <p className="text-sm text-slate-500">Use this to validate report accuracy before exporting.</p>
            </div>
            <div className="flex gap-2">
              <select
                value={previewRiskFilter}
                onChange={(event) => setPreviewRiskFilter(event.target.value as "all" | "critical" | "high" | "medium" | "low")}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              >
                <option value="all">All risk levels</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select
                value={previewSortBy}
                onChange={(event) => setPreviewSortBy(event.target.value as "warning" | "health" | "week")}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              >
                <option value="warning">Sort by warning score</option>
                <option value="health">Sort by health (low to high)</option>
                <option value="week">Sort by latest week</option>
              </select>
            </div>
          </div>
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
              {filteredPreviewRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    No preview rows for the active filter. Click Validate Accuracy or adjust filters.
                  </td>
                </tr>
              ) : (
                filteredPreviewRows.slice(0, 15).map(({ row }, index) => (
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

function InsightCard({ label, value, tone }: { label: string; value: string; tone: "rose" | "emerald" | "amber" | "blue" | "slate" }) {
  const toneClass: Record<string, string> = {
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <div className={`rounded-xl border px-3 py-3 ${toneClass[tone] || toneClass.slate}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function ChecklistItem({ label, ready, optional = false }: { label: string; ready: boolean; optional?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs ${ready ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}`}>
      <span className="font-semibold">{ready ? "Ready" : optional ? "Optional" : "Pending"}</span>
      <span className="ml-2">{label}</span>
    </div>
  );
}
