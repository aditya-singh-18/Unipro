"use client";

import BaseModal from "@/components/modals/BaseModal";
import type { MentorEffectivenessDetail } from "@/services/tracker.service";

type MentorEffectivenessDetailModalProps = {
  open: boolean;
  loading: boolean;
  detail: MentorEffectivenessDetail | null;
  onClose: () => void;
};

const formatHours = (value: number | null) => {
  if (!value) return "—";
  return `${(value / (1000 * 60 * 60)).toFixed(1)}h`;
};

export default function MentorEffectivenessDetailModal({
  open,
  loading,
  detail,
  onClose,
}: MentorEffectivenessDetailModalProps) {
  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={detail ? `Mentor Detail - ${detail.mentorName}` : "Mentor Detail"}
      className="max-w-3xl"
    >
      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">Loading mentor detail...</div>
      ) : !detail ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Mentor detail is not available.
        </div>
      ) : (
        <div className="space-y-5">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Reviews" value={detail.metrics.reviewCount} />
            <MetricCard label="Recent 7 Days" value={detail.metrics.recentReviewCount} />
            <MetricCard label="Active Projects" value={detail.metrics.activeProjectCount} />
            <MetricCard label="Workload" value={detail.metrics.workloadBand} tone={detail.metrics.workloadBand} />
          </section>

          <section className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Turnaround Distribution</h3>
              <p className="text-xs text-slate-500">Average, median, and p95 review completion times.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-3">
              <MetricCard label="Average" value={formatHours(detail.metrics.avgTurnaroundMs)} />
              <MetricCard label="Median" value={formatHours(detail.metrics.medianTurnaroundMs)} />
              <MetricCard label="P95" value={formatHours(detail.metrics.p95TurnaroundMs)} />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Feedback Quality</h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Average depth</span>
                  <span className="font-semibold text-slate-900">{detail.metrics.avgFeedbackDepth} chars</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Rich feedback ratio</span>
                  <span className="font-semibold text-slate-900">{detail.metrics.richFeedbackRatioPercent.toFixed(1)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ inlineSize: `${Math.max(0, Math.min(100, detail.metrics.richFeedbackRatioPercent))}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Operational Snapshot</h3>
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <p>Mentor ID: <span className="font-semibold text-slate-900">{detail.mentorId}</span></p>
                <p>Workload band: <span className="font-semibold text-slate-900">{detail.metrics.workloadBand}</span></p>
                <p>Review cadence: <span className="font-semibold text-slate-900">{detail.metrics.recentReviewCount > 0 ? "Active in last 7 days" : "No recent reviews"}</span></p>
              </div>
            </div>
          </section>
        </div>
      )}
    </BaseModal>
  );
}

function MetricCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "healthy" | "warning" | "critical";
}) {
  const tones = {
    neutral: "border-slate-200 bg-white text-slate-900",
    healthy: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    critical: "border-rose-200 bg-rose-50 text-rose-900",
  };

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
