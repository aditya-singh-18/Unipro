"use client";

import BaseModal from "@/components/modals/BaseModal";
import type { EscalationDetailResponse, EscalationFollowUpPayload } from "@/services/tracker.service";

type EscalationDetailModalProps = {
  open: boolean;
  loading: boolean;
  saving: boolean;
  detail: EscalationDetailResponse | null;
  resolutionState: EscalationFollowUpPayload["resolutionState"];
  resolutionNotes: string;
  onClose: () => void;
  onStateChange: (state: EscalationFollowUpPayload["resolutionState"]) => void;
  onNotesChange: (value: string) => void;
  onSubmit: () => void;
};

const stateOptions: Array<EscalationFollowUpPayload["resolutionState"]> = [
  "acknowledged",
  "in_follow_up",
  "resolved",
  "deferred",
];

export default function EscalationDetailModal({
  open,
  loading,
  saving,
  detail,
  resolutionState,
  resolutionNotes,
  onClose,
  onStateChange,
  onNotesChange,
  onSubmit,
}: EscalationDetailModalProps) {
  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={detail ? `Escalation Detail - ${detail.detail.project_id}` : "Escalation Detail"}
      className="max-w-4xl"
    >
      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">Loading escalation detail...</div>
      ) : !detail ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Escalation detail could not be loaded.
        </div>
      ) : (
        <div className="space-y-5">
          <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <StatCard label="Week" value={`Week ${detail.detail.week_number}`} />
            <StatCard label="Type" value={detail.detail.escalation_type.replace(/_/g, " ")} />
            <StatCard label="Overdue" value={`${Number(detail.detail.overdue_hours).toFixed(1)}h`} />
            <StatCard label="State" value={detail.currentState.replace(/_/g, " ")} tone={detail.currentState === "resolved" ? "healthy" : detail.currentState === "deferred" ? "warning" : "neutral"} />
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">Risk {detail.detail.risk_level}</span>
              <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">Severity {detail.detail.escalation_severity}</span>
              <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">Mentor {detail.detail.mentor_name || detail.detail.mentor_employee_id || "Unassigned"}</span>
            </div>
            <p className="mt-3 text-sm text-slate-700">{detail.detail.title || detail.detail.project_id}</p>
          </section>

          <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-900">Timeline</h3>
              </div>
              <div className="max-h-90 overflow-auto p-4">
                <div className="space-y-3">
                  {detail.timeline.length === 0 ? (
                    <div className="text-sm text-slate-500">No follow-up timeline has been recorded yet.</div>
                  ) : (
                    detail.timeline.map((item) => (
                      <div key={item.timelineId} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">{item.eventType.replace(/_/g, " ")}</p>
                          <span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Actor: {item.actorUserKey || "system"} {item.actorRole ? `(${item.actorRole})` : ""}</p>
                        {item.meta?.note ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{String(item.meta.note)}</p> : null}
                        {item.meta?.resolution_notes ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{String(item.meta.resolution_notes)}</p> : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Update Follow-up</h3>
              <p className="mt-1 text-xs text-slate-500">Choose the next state and leave notes for the admin timeline.</p>

              <label className="mt-4 block text-xs font-semibold text-slate-600">Resolution state</label>
              <select
                value={resolutionState}
                onChange={(event) => onStateChange(event.target.value as EscalationFollowUpPayload["resolutionState"])}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                {stateOptions.map((option) => (
                  <option key={option} value={option}>{option.replace(/_/g, " ")}</option>
                ))}
              </select>

              <label className="mt-4 block text-xs font-semibold text-slate-600">Resolution notes</label>
              <textarea
                value={resolutionNotes}
                onChange={(event) => onNotesChange(event.target.value)}
                rows={6}
                placeholder="Capture the decision, owner, and next action."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Close
                </button>
                <button
                  onClick={onSubmit}
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {saving ? "Saving..." : "Save Follow-up"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </BaseModal>
  );
}

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "healthy" | "warning";
}) {
  const tones = {
    neutral: "border-slate-200 bg-white text-slate-900",
    healthy: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
  };

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </div>
  );
}
