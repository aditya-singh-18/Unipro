"use client";

import { useState } from "react";
import { createDailyLog, type CreateDailyLogPayload } from "@/services/protrackEnhancement.service";

type DailyLogFormProps = {
  projectId: string;
  onLogCreated?: () => void;
};

const tagOptions = [
  { value: 'progress', label: 'Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'done', label: 'Done', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'fix', label: 'Fix', color: 'bg-rose-100 text-rose-700' },
  { value: 'review', label: 'Review', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'blocker', label: 'Blocker', color: 'bg-amber-100 text-amber-700' },
  { value: 'meeting', label: 'Meeting', color: 'bg-slate-100 text-slate-700' },
] as const;

export default function DailyLogForm({ projectId, onLogCreated }: DailyLogFormProps) {
  const [form, setForm] = useState({
    whatIDid: '',
    whatIWillDo: '',
    blockers: '',
    tag: 'progress' as CreateDailyLogPayload['tag'],
    commitCount: '',
    commitLink: '',
    hoursSpent: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.whatIDid.trim() || form.whatIDid.trim().length < 10) {
      setError('What I did must be at least 10 characters');
      return;
    }

    if (!form.whatIWillDo.trim()) {
      setError('What I will do is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const payload: CreateDailyLogPayload = {
        whatIDid: form.whatIDid.trim(),
        whatIWillDo: form.whatIWillDo.trim(),
        blockers: form.blockers.trim() || undefined,
        tag: form.tag,
        commitCount: form.commitCount ? Number(form.commitCount) : undefined,
        commitLink: form.commitLink.trim() || undefined,
        hoursSpent: form.hoursSpent ? Number(form.hoursSpent) : undefined,
      };

      await createDailyLog(projectId, payload);

      setSuccess('Daily log saved successfully! ✓');
      setForm({
        whatIDid: '',
        whatIWillDo: '',
        blockers: '',
        tag: 'progress',
        commitCount: '',
        commitLink: '',
        hoursSpent: '',
      });

      if (onLogCreated) {
        onLogCreated();
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (e: unknown) {
      const message =
        typeof e === 'object' &&
        e !== null &&
        'response' in e &&
        typeof (e as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to save daily log';
      setError(message ?? 'Failed to save daily log');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/88 backdrop-blur-sm rounded-3xl border border-sky-100 shadow-[0_14px_30px_rgba(42,74,128,0.12)] p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Daily Progress Log</h3>
        <p className="text-sm text-slate-500 mt-1">Track your daily progress and blockers</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* What I Did */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            What I Did Today <span className="text-rose-500">*</span>
            <span className="ml-2 text-xs font-normal text-slate-500">(min 10 characters)</span>
          </label>
          <textarea
            value={form.whatIDid}
            onChange={(e) => setForm((s) => ({ ...s, whatIDid: e.target.value }))}
            placeholder="Describe what you accomplished today..."
            className="w-full min-h-24 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            required
          />
          <div className="mt-1 text-xs text-slate-500">
            {form.whatIDid.length}/10 characters
          </div>
        </div>

        {/* What I Will Do */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            What I Will Do Tomorrow <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={form.whatIWillDo}
            onChange={(e) => setForm((s) => ({ ...s, whatIWillDo: e.target.value }))}
            placeholder="Describe your plan for tomorrow..."
            className="w-full min-h-20 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            required
          />
        </div>

        {/* Blockers */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Blockers (Optional)
          </label>
          <textarea
            value={form.blockers}
            onChange={(e) => setForm((s) => ({ ...s, blockers: e.target.value }))}
            placeholder="Any blockers or issues you're facing..."
            className="w-full min-h-16 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tag */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Category Tag
            </label>
            <select
              value={form.tag}
              onChange={(e) => setForm((s) => ({ ...s, tag: e.target.value as typeof form.tag }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              {tagOptions.map((tag) => (
                <option key={tag.value} value={tag.value}>
                  {tag.label}
                </option>
              ))}
            </select>
          </div>

          {/* Hours Spent */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Hours Spent (Optional)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={form.hoursSpent}
              onChange={(e) => setForm((s) => ({ ...s, hoursSpent: e.target.value }))}
              placeholder="e.g., 5.5"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Commit Count */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Commit Count (Optional)
            </label>
            <input
              type="number"
              min="0"
              value={form.commitCount}
              onChange={(e) => setForm((s) => ({ ...s, commitCount: e.target.value }))}
              placeholder="e.g., 3"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* Commit Link */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Commit Link (Optional)
            </label>
            <input
              type="url"
              value={form.commitLink}
              onChange={(e) => setForm((s) => ({ ...s, commitLink: e.target.value }))}
              placeholder="https://github.com/user/repo/commit/..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Daily Log'}
          </button>
        </div>
      </form>

      <div className="mt-4 p-3 rounded-lg bg-blue-50/50 border border-blue-100">
        <p className="text-xs text-blue-700">
          <span className="font-semibold">💡 Tip:</span> Log your progress daily to track your journey and help mentors understand your progress better.
        </p>
      </div>
    </div>
  );
}
