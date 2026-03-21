"use client";

import { useMemo, useState } from "react";
import type { CreateDailyLogPayload, DailyLog, ProgressScore, TrackerTask } from "@/services/tracker.service";

type DailyLogFormProps = {
  hasSubmittedToday: boolean;
  todayLog: DailyLog | null;
  tasks: TrackerTask[];
  tasksLoading?: boolean;
  onSubmit: (payload: CreateDailyLogPayload) => Promise<{ log: DailyLog; score: ProgressScore } | null>;
};

const extractErrorMessage = (err: unknown) => {
  const dataMessage =
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as { response?: { data?: { message?: unknown } } }).response?.data?.message === "string"
      ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message)
      : "";

  if (dataMessage) return dataMessage;
  if (err instanceof Error && err.message) return err.message;
  return "Unable to submit daily log.";
};

export default function DailyLogForm({ hasSubmittedToday, todayLog, tasks, tasksLoading = false, onSubmit }: DailyLogFormProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [form, setForm] = useState<CreateDailyLogPayload>({
    what_i_did: "",
    what_i_will_do: "",
    blockers: "",
    tag: "progress",
    commit_count: 0,
    commit_link: "",
    hours_spent: 0,
  });

  const isDisabled = hasSubmittedToday || saving;

  const validationError = useMemo(() => {
    if (!form.what_i_did.trim()) return "Add what you completed today.";
    if (!form.what_i_will_do.trim()) return "Add what you plan next.";
    return "";
  }, [form.what_i_did, form.what_i_will_do]);

  const handleSubmit = async () => {
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");
      const payload: CreateDailyLogPayload = {
        what_i_did: form.what_i_did.trim(),
        what_i_will_do: form.what_i_will_do.trim(),
        blockers: form.blockers?.trim() || undefined,
        tag: form.tag,
        commit_count: Number(form.commit_count || 0),
        commit_link: form.commit_link?.trim() || undefined,
        hours_spent: Number(form.hours_spent || 0),
      };
      await onSubmit(payload);
      setMessage("Daily log submitted successfully.");
      setForm({
        what_i_did: "",
        what_i_will_do: "",
        blockers: "",
        tag: "progress",
        commit_count: 0,
        commit_link: "",
        hours_spent: 0,
      });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-sky-100 bg-white/90 p-5 shadow-[0_14px_30px_rgba(42,74,128,0.12)]">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">Daily Log</h3>
        <p className="text-xs text-slate-500">One update per day helps score accuracy and mentor visibility.</p>
      </div>

      {hasSubmittedToday ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Today&apos;s log is already submitted.
        </div>
      ) : null}

      {todayLog ? (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">Latest Today Entry</p>
          <p className="mt-1">Did: {todayLog.what_i_did}</p>
          <p className="mt-1">Next: {todayLog.what_i_will_do}</p>
        </div>
      ) : null}

      <div className="space-y-2.5">
        <textarea
          value={form.what_i_did}
          onChange={(e) => setForm((prev) => ({ ...prev, what_i_did: e.target.value }))}
          placeholder="What did you complete today?"
          disabled={isDisabled}
          className="min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
        />
        <textarea
          value={form.what_i_will_do}
          onChange={(e) => setForm((prev) => ({ ...prev, what_i_will_do: e.target.value }))}
          placeholder="What will you do next?"
          disabled={isDisabled}
          className="min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
        />
        <textarea
          value={form.blockers || ""}
          onChange={(e) => setForm((prev) => ({ ...prev, blockers: e.target.value }))}
          placeholder="Any blockers? (optional)"
          disabled={isDisabled}
          className="min-h-16 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
        />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            value={form.tag || "progress"}
            onChange={(e) => setForm((prev) => ({ ...prev, tag: e.target.value as CreateDailyLogPayload["tag"] }))}
            disabled={isDisabled}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
          >
            <option value="progress">Progress</option>
            <option value="done">Done</option>
            <option value="fix">Fix</option>
            <option value="review">Review</option>
            <option value="blocker">Blocker</option>
            <option value="meeting">Meeting</option>
          </select>
          <input
            type="number"
            min={0}
            value={form.commit_count ?? 0}
            onChange={(e) => setForm((prev) => ({ ...prev, commit_count: Number(e.target.value) }))}
            placeholder="Commits"
            disabled={isDisabled}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
          />
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={form.hours_spent ?? 0}
            onChange={(e) => setForm((prev) => ({ ...prev, hours_spent: Number(e.target.value) }))}
            placeholder="Hours"
            disabled={isDisabled}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
          />
        </div>

        <input
          value={form.commit_link || ""}
          onChange={(e) => setForm((prev) => ({ ...prev, commit_link: e.target.value }))}
          placeholder="Commit/PR link (optional)"
          disabled={isDisabled}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
        />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-600">Related Task (optional)</p>
          <select
            value={form.task_id ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              setForm((prev) => ({ ...prev, task_id: raw ? Number(raw) : undefined }));
            }}
            disabled={isDisabled || tasksLoading}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
          >
            <option value="">No task selected</option>
            {tasks.map((task) => (
              <option key={task.task_id} value={task.task_id}>
                #{task.task_id} - {task.title}
              </option>
            ))}
          </select>
          {tasksLoading ? (
            <p className="text-[11px] text-slate-500">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="text-[11px] text-slate-500">No tracker tasks found for this project.</p>
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-3 text-xs text-rose-600">{error}</p> : null}
      {message ? <p className="mt-3 text-xs text-emerald-600">{message}</p> : null}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={isDisabled}
        className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Submitting..." : hasSubmittedToday ? "Submitted Today" : "Submit Daily Log"}
      </button>
    </section>
  );
}
