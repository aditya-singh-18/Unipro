"use client";

import { useEffect, useState } from "react";
import {
  getTrackerPolicySettings,
  updateTrackerPolicySettings,
  type TrackerPolicySettings,
} from "@/services/tracker.service";

const defaultPolicy: TrackerPolicySettings = {
  escalation_enabled: true,
  escalation_batch_limit: 50,
  escalation_pending_overdue_hours: 48,
  escalation_review_overdue_hours: 36,
  escalation_critical_overdue_hours: 72,
  reminder_enabled: true,
  student_deadline_reminder_hours: 24,
  mentor_review_sla_hours: 24,
  auto_missed_enabled: true,
};

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [policy, setPolicy] = useState<TrackerPolicySettings>(defaultPolicy);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError("");
        setPolicy(await getTrackerPolicySettings());
      } catch {
        setError("Failed to load tracker policy settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setNumber = (key: keyof TrackerPolicySettings, value: string) => {
    setPolicy((prev) => ({
      ...prev,
      [key]: Number(value),
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const updated = await updateTrackerPolicySettings(policy);
      setPolicy(updated);
      setMessage("Tracker policy saved successfully. Reminder, auto-missed, and escalation rules apply on the next scheduler run.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save tracker policy");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Tracker Policy Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Admin-managed reminder, auto-missed, and escalation controls. Scheduler polling interval remains environment-controlled, but these rules are read at runtime.
        </p>
      </section>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="text-sm text-slate-500">Loading settings...</div>
        ) : (
          <div className="space-y-5">
            <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <div className="font-semibold text-slate-900">Escalation engine enabled</div>
                <div className="text-xs text-slate-500">When disabled, escalation scheduler will no-op without needing restart.</div>
              </div>
              <input
                type="checkbox"
                checked={policy.escalation_enabled}
                onChange={(event) => setPolicy((prev) => ({ ...prev, escalation_enabled: event.target.checked }))}
                className="h-4 w-4"
              />
            </label>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <NumberField
                label="Batch limit"
                value={policy.escalation_batch_limit}
                onChange={(value) => setNumber('escalation_batch_limit', value)}
                help="Max escalations processed in one run"
              />
              <NumberField
                label="Pending overdue hours"
                value={policy.escalation_pending_overdue_hours}
                onChange={(value) => setNumber('escalation_pending_overdue_hours', value)}
                help="Submission pending threshold"
              />
              <NumberField
                label="Review overdue hours"
                value={policy.escalation_review_overdue_hours}
                onChange={(value) => setNumber('escalation_review_overdue_hours', value)}
                help="Mentor review threshold"
              />
              <NumberField
                label="Critical severity hours"
                value={policy.escalation_critical_overdue_hours}
                onChange={(value) => setNumber('escalation_critical_overdue_hours', value)}
                help="Escalations beyond this become critical"
              />
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <div>
                  <div className="font-semibold text-slate-900">Reminder engine enabled</div>
                  <div className="text-xs text-slate-500">Controls student deadline reminders and mentor review reminders without restart.</div>
                </div>
                <input
                  type="checkbox"
                  checked={policy.reminder_enabled}
                  onChange={(event) => setPolicy((prev) => ({ ...prev, reminder_enabled: event.target.checked }))}
                  className="h-4 w-4"
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <NumberField
                  label="Student reminder hours"
                  value={policy.student_deadline_reminder_hours}
                  onChange={(value) => setNumber('student_deadline_reminder_hours', value)}
                  help="Send reminder when week deadline is within this many hours"
                />
                <NumberField
                  label="Mentor review SLA hours"
                  value={policy.mentor_review_sla_hours}
                  onChange={(value) => setNumber('mentor_review_sla_hours', value)}
                  help="Send reminder when mentor review exceeds this SLA"
                />
              </div>
            </div>

            <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <div className="font-semibold text-slate-900">Auto-missed transitions enabled</div>
                <div className="text-xs text-slate-500">Automatically marks expired pending weeks as missed during scheduler runs.</div>
              </div>
              <input
                type="checkbox"
                checked={policy.auto_missed_enabled}
                onChange={(event) => setPolicy((prev) => ({ ...prev, auto_missed_enabled: event.target.checked }))}
                className="h-4 w-4"
              />
            </label>

            <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
              Recommended rule: keep critical threshold greater than or equal to both pending and review thresholds.
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Save Policy'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
  help: string;
}) {
  return (
    <label className="rounded-xl border border-slate-200 p-4">
      <div className="text-sm font-semibold text-slate-900">{label}</div>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
      <div className="mt-2 text-xs text-slate-500">{help}</div>
    </label>
  );
}
