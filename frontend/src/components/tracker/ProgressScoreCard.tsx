"use client";

import type { ProgressScore } from "@/services/tracker.service";

type ProgressScoreCardProps = {
  score: ProgressScore | null;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export default function ProgressScoreCard({ score, loading = false, error = "", onRefresh, refreshing = false }: ProgressScoreCardProps) {
  const riskPalette: Record<string, string> = {
    low: "bg-emerald-100 text-emerald-700 border-emerald-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    high: "bg-orange-100 text-orange-700 border-orange-200",
    critical: "bg-rose-100 text-rose-700 border-rose-200",
  };

  if (loading) {
    return (
      <section className="rounded-3xl border border-sky-100 bg-white/90 p-5 shadow-[0_14px_30px_rgba(42,74,128,0.12)]">
        <p className="text-sm text-slate-500">Loading score...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-sky-100 bg-white/90 p-5 shadow-[0_14px_30px_rgba(42,74,128,0.12)]">
        <p className="text-sm text-rose-600">{error}</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-sky-100 bg-white/90 p-5 shadow-[0_14px_30px_rgba(42,74,128,0.12)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Progress Score</h3>
          <p className="text-xs text-slate-500">Composite score from commits, tasks, submissions, and logs</p>
        </div>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing || !score}
            className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Recalculate"}
          </button>
        ) : null}
      </div>

      {!score ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          No score data yet. Submit daily logs and weekly updates to start score tracking.
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <Metric label="Total" value={`${score.total_score}`} strong />
            <Metric label="Progress" value={`${score.progress_pct}%`} />
            <Metric label="Streak" value={`${score.streak_days}d`} />
            <Metric label="Days No Commit" value={`${score.days_since_commit}`} />
            <Metric label="Overdue Tasks" value={`${score.overdue_task_count}`} />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric label="Git" value={`${score.git_score}`} subtle />
            <Metric label="Tasks" value={`${score.task_score}`} subtle />
            <Metric label="Submission" value={`${score.submission_score}`} subtle />
            <Metric label="Daily Logs" value={`${score.log_score}`} subtle />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${riskPalette[score.risk_level] ?? riskPalette.medium}`}>
              Risk: {score.risk_level}
            </span>
            <span className="text-xs text-slate-500">
              Calculated {new Date(score.calculated_at).toLocaleString()}
            </span>
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ label, value, strong = false, subtle = false }: { label: string; value: string; strong?: boolean; subtle?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${subtle ? "border-slate-200 bg-slate-50" : "border-sky-200 bg-sky-50/70"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg ${strong ? "font-bold text-slate-900" : "font-semibold text-slate-800"}`}>{value}</p>
    </div>
  );
}
