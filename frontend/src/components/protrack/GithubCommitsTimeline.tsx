"use client";

import { useState, useEffect } from "react";
import { getGithubCommits, type GithubCommit } from "@/services/protrackEnhancement.service";

type GithubCommitsTimelineProps = {
  projectId: string;
};

export default function GithubCommitsTimeline({ projectId }: GithubCommitsTimelineProps) {
  const [commits, setCommits] = useState<GithubCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCommits = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await getGithubCommits(projectId, { limit: 30 });
        setCommits(data);
      } catch (e) {
        setError('Failed to load commits');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      void loadCommits();
    }
  }, [projectId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const shortenSha = (sha: string) => {
    return sha.substring(0, 7);
  };

  if (loading) {
    return (
      <div className="bg-white/88 backdrop-blur-sm rounded-3xl border border-sky-100 shadow-[0_14px_30px_rgba(42,74,128,0.12)] p-8">
        <div className="flex items-center justify-center">
          <div className="text-slate-500">Loading commits...</div>
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
          <h3 className="font-semibold text-slate-900">GitHub Commit Activity</h3>
          <p className="text-xs text-slate-500 mt-0.5">Recent commits tracked</p>
        </div>
        <span className="text-xs text-slate-500">{commits.length} commits</span>
      </div>

      {commits.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <span className="text-2xl">💻</span>
          </div>
          <p className="text-sm text-slate-600 font-medium">No commits tracked yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Commits will be automatically tracked by your mentor
          </p>
        </div>
      ) : (
        <div className="max-h-[600px] overflow-y-auto">
          {/* Timeline */}
          <div className="relative px-5 py-4">
            {/* Vertical line */}
            <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-slate-200" />

            {/* Commits */}
            <div className="space-y-4">
              {commits.map((commit, index) => (
                <div key={commit.commit_id} className="relative flex gap-4">
                  {/* Timeline dot */}
                  <div className="relative z-10 flex-shrink-0">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        commit.is_merge_commit
                          ? 'bg-indigo-500 ring-4 ring-indigo-100'
                          : 'bg-emerald-500 ring-4 ring-emerald-100'
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-200/50 hover:border-slate-300 hover:shadow-sm transition">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-xs font-mono font-semibold text-slate-900 bg-slate-200 px-2 py-0.5 rounded">
                              {shortenSha(commit.sha)}
                            </code>
                            {commit.is_merge_commit && (
                              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                                Merge
                              </span>
                            )}
                            {commit.branch && (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                {commit.branch}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className="text-xs text-slate-500 flex-shrink-0"
                          title={formatFullDate(commit.committed_at)}
                        >
                          {formatDate(commit.committed_at)}
                        </span>
                      </div>

                      {/* Message */}
                      {commit.message && (
                        <p className="text-sm text-slate-800 mb-2 line-clamp-2">{commit.message}</p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-xs">
                        {commit.additions > 0 && (
                          <span className="text-emerald-600 font-medium">
                            +{commit.additions}
                          </span>
                        )}
                        {commit.deletions > 0 && (
                          <span className="text-rose-600 font-medium">
                            -{commit.deletions}
                          </span>
                        )}
                        {(commit.additions > 0 || commit.deletions > 0) && (
                          <span className="text-slate-500">
                            {commit.additions + commit.deletions} changes
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          {commits.length > 0 && (
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-200/70">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-slate-900">{commits.length}</div>
                  <div className="text-xs text-slate-600 mt-1">Total Commits</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600">
                    +{commits.reduce((sum, c) => sum + c.additions, 0)}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">Additions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-rose-600">
                    -{commits.reduce((sum, c) => sum + c.deletions, 0)}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">Deletions</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
