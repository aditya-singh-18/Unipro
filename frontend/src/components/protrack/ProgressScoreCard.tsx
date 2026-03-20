"use client";

import { useState, useEffect } from "react";
import { getLatestProgressScore, type ProgressScore } from "@/services/protrackEnhancement.service";

type ProgressScoreCardProps = {
  projectId: string;
  studentUserKey: string;
};

const riskLevelColors: Record<string, { bg: string; text: string; icon: string }> = {
  low: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '✓' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '⚠' },
  high: { bg: 'bg-rose-100', text: 'text-rose-700', icon: '⚠' },
  critical: { bg: 'bg-rose-200', text: 'text-rose-900', icon: '🚨' },
};

export default function ProgressScoreCard({ projectId, studentUserKey }: ProgressScoreCardProps) {
  const [score, setScore] = useState<ProgressScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadScore = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await getLatestProgressScore(projectId, studentUserKey);
        setScore(data);
      } catch (e) {
        setError('Failed to load progress score');
      } finally {
        setLoading(false);
      }
    };

    if (projectId && studentUserKey) {
      void loadScore();
    }
  }, [projectId, studentUserKey]);

  if (loading) {
    return (
      <div className="bg-white/88 backdrop-blur-sm rounded-3xl border border-sky-100 shadow-[0_14px_30px_rgba(42,74,128,0.12)] p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-slate-500">Loading score...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/88 backdrop-blur-sm rounded-3xl border border-sky-100 shadow-[0_14px_30px_rgba(42,74,128,0.12)] p-6">
        <div className="flex items-center justify-center h-32 text-rose-600">{error}</div>
      </div>
    );
  }

  if (!score) {
    return (
      <div className="bg-white/88 backdrop-blur-sm rounded-3xl border border-sky-100 shadow-[0_14px_30px_rgba(42,74,128,0.12)] p-6">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-sm text-slate-600 font-medium">No Score Available</p>
          <p className="text-xs text-slate-500 mt-1">Scores will be calculated by your mentor</p>
        </div>
      </div>
    );
  }

  const riskConfig = riskLevelColors[score.risk_level] || riskLevelColors.low;

  return (
    <div className="bg-white/88 backdrop-blur-sm rounded-3xl border border-sky-100 shadow-[0_14px_30px_rgba(42,74,128,0.12)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200/70">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Progress Score</h3>
            <p className="text-xs text-slate-500 mt-0.5">Week {score.week_number}</p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${riskConfig.bg} ${riskConfig.text}`}
          >
            {riskConfig.icon} {score.risk_level.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Total Score - Big Display */}
      <div className="px-5 py-6 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="text-5xl font-bold text-slate-900 mb-2">
            {score.total_score}
            <span className="text-2xl text-slate-500">/100</span>
          </div>
          <div className="text-sm text-slate-600">Total Progress Score</div>

          {/* Progress Bar */}
          <div className="mt-4 w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-700"
              style={{ width: `${score.progress_pct}%` }}
            />
          </div>
          <div className="text-xs text-slate-500 mt-1">{score.progress_pct}% Complete</div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="px-5 py-4 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
          Score Breakdown
        </div>

        {/* Git Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">💻</span>
            <span className="text-sm text-slate-700">Git Activity</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{score.git_score}</span>
            <span className="text-xs text-slate-500">/30</span>
            <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${(score.git_score / 30) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Task Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">✅</span>
            <span className="text-sm text-slate-700">Task Completion</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{score.task_score}</span>
            <span className="text-xs text-slate-500">/35</span>
            <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${(score.task_score / 35) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Submission Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📄</span>
            <span className="text-sm text-slate-700">Submissions</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{score.submission_score}</span>
            <span className="text-xs text-slate-500">/25</span>
            <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${(score.submission_score / 25) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Log Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📝</span>
            <span className="text-sm text-slate-700">Daily Logs</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{score.log_score}</span>
            <span className="text-xs text-slate-500">/10</span>
            <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${(score.log_score / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="px-5 py-4 bg-slate-50 border-t border-slate-200/70">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-slate-900">{score.streak_days}</div>
            <div className="text-xs text-slate-600 mt-1">Day Streak</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{score.days_since_commit}</div>
            <div className="text-xs text-slate-600 mt-1">Days Since Commit</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{score.overdue_task_count}</div>
            <div className="text-xs text-slate-600 mt-1">Overdue Tasks</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-blue-50/50 border-t border-blue-100">
        <p className="text-xs text-blue-700 text-center">
          Last calculated:{' '}
          {new Date(score.calculated_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
