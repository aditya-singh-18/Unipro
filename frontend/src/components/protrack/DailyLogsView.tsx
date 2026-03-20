"use client";

import { useState, useEffect } from "react";
import { getDailyLogs, deleteDailyLog, type DailyLog } from "@/services/protrackEnhancement.service";

type DailyLogsViewProps = {
  projectId: string;
  refreshTrigger?: number;
};

const tagColors: Record<string, string> = {
  progress: 'bg-blue-100 text-blue-700',
  done: 'bg-emerald-100 text-emerald-700',
  fix: 'bg-rose-100 text-rose-700',
  review: 'bg-indigo-100 text-indigo-700',
  blocker: 'bg-amber-100 text-amber-700',
  meeting: 'bg-slate-100 text-slate-700',
};

export default function DailyLogsView({ projectId, refreshTrigger }: DailyLogsViewProps) {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getDailyLogs(projectId, { limit: 30 });
      setLogs(data);
    } catch (e) {
      setError('Failed to load daily logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      void loadLogs();
    }
  }, [projectId, refreshTrigger]);

  const handleDelete = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this log?')) {
      return;
    }

    try {
      setDeletingId(logId);
      await deleteDailyLog(logId);
      setLogs((prev) => prev.filter((log) => log.log_id !== logId));
    } catch (e) {
      alert('Failed to delete log');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white/88 backdrop-blur-sm rounded-3xl border border-sky-100 shadow-[0_14px_30px_rgba(42,74,128,0.12)] p-8">
        <div className="flex items-center justify-center">
          <div className="text-slate-500">Loading daily logs...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/88 backdrop-blur-sm rounded-3xl border border-sky-100 shadow-[0_14px_30px_rgba(42,74,128,0.12)] p-8">
        <div className="flex items-center justify-center text-rose-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white/88 backdrop-blur-sm rounded-3xl border border-sky-100 shadow-[0_14px_30px_rgba(42,74,128,0.12)] overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200/70 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Daily Logs History</h3>
          <p className="text-xs text-slate-500 mt-0.5">Your recent progress logs</p>
        </div>
        <span className="text-xs text-slate-500">{logs.length} logs</span>
      </div>

      {logs.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <span className="text-2xl">📝</span>
          </div>
          <p className="text-sm text-slate-600 font-medium">No daily logs yet</p>
          <p className="text-xs text-slate-500 mt-1">Create your first log above to start tracking!</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {logs.map((log) => (
            <div key={log.log_id} className="px-5 py-4 hover:bg-slate-50/50 transition">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {formatDate(log.log_date)}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        tagColors[log.tag] || tagColors.progress
                      }`}
                    >
                      {log.tag}
                    </span>
                    {log.is_late && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Late Entry
                      </span>
                    )}
                  </div>

                  {/* What I Did */}
                  <div className="mb-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                      What I Did
                    </div>
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">{log.what_i_did}</p>
                  </div>

                  {/* What I Will Do */}
                  <div className="mb-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-indigo-500 mb-1">
                      What I Will Do
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{log.what_i_will_do}</p>
                  </div>

                  {/* Blockers */}
                  {log.blockers && (
                    <div className="mb-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-rose-500 mb-1">
                        Blockers
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{log.blockers}</p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-3">
                    {log.hours_spent !== null && (
                      <span>⏱️ {log.hours_spent} hours</span>
                    )}
                    {log.commit_count > 0 && (
                      <span>🔄 {log.commit_count} commits</span>
                    )}
                    {log.commit_link && (
                      <a
                        href={log.commit_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View Commit →
                      </a>
                    )}
                    <span className="text-slate-400">
                      Logged at {formatTime(log.created_at)}
                    </span>
                  </div>

                  {/* AI Summary */}
                  {log.ai_summary && (
                    <div className="mt-3 p-3 rounded-lg bg-indigo-50/50 border border-indigo-100">
                      <div className="text-xs font-semibold text-indigo-700 mb-1">
                        🤖 AI Summary
                      </div>
                      <p className="text-xs text-indigo-600">{log.ai_summary}</p>
                    </div>
                  )}
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleDelete(log.log_id)}
                  disabled={deletingId === log.log_id}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  title="Delete log"
                >
                  {deletingId === log.log_id ? '...' : '✕'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
