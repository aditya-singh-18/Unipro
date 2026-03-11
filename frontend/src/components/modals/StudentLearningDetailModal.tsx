"use client";

import BaseModal from "@/components/modals/BaseModal";
import type { StudentLearningDetail } from "@/services/tracker.service";

type StudentLearningDetailModalProps = {
  open: boolean;
  loading: boolean;
  detail: StudentLearningDetail | null;
  onClose: () => void;
};

export default function StudentLearningDetailModal({
  open,
  loading,
  detail,
  onClose,
}: StudentLearningDetailModalProps) {
  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={detail ? `Learning Detail - ${detail.studentName}` : "Learning Detail"}
      className="max-w-4xl"
    >
      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">Loading student learning detail...</div>
      ) : !detail ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          No learning detail is available for this student yet.
        </div>
      ) : (
        <div className="space-y-5">
          <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <MetricCard label="Start Score" value={detail.trend.firstQualityScore} />
            <MetricCard label="Latest Score" value={detail.trend.latestQualityScore} />
            <MetricCard
              label="Velocity"
              value={`${detail.trend.learningVelocity > 0 ? "+" : ""}${detail.trend.learningVelocity}`}
              tone={detail.trend.learningVelocityDirection}
            />
            <MetricCard
              label="Risk"
              value={detail.trend.riskRegression ? "Regression" : "Stable"}
              tone={detail.trend.riskRegression ? "declining" : "stable"}
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">Project {detail.projectId}</span>
              <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">Student {detail.studentKey}</span>
              <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">Submissions {detail.submissions.length}</span>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Submission Timeline</h3>
              <p className="text-xs text-slate-500">Latest submissions and mentor outcomes in one view.</p>
            </div>
            <div className="max-h-105 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-white text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Week</th>
                    <th className="px-4 py-3 text-left">Revision</th>
                    <th className="px-4 py-3 text-left">Score</th>
                    <th className="px-4 py-3 text-left">Result</th>
                    <th className="px-4 py-3 text-left">Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.submissions.map((submission) => (
                    <tr key={submission.submissionId} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-semibold text-slate-900">Week {submission.weekNumber}</div>
                        <div className="text-xs text-slate-500">{new Date(submission.submittedAt).toLocaleString()}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">#{submission.revisionNo}</td>
                      <td className="px-4 py-3 text-slate-700">{submission.qualityScore}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${submission.action === "approve" ? "bg-emerald-100 text-emerald-700" : submission.action === "reject" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}`}>
                          {submission.action || "pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="max-w-md whitespace-pre-wrap text-sm">{submission.reviewComment || "No mentor feedback recorded."}</div>
                        {submission.githubLinkSnapshot ? (
                          <a
                            href={submission.githubLinkSnapshot}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-xs font-medium text-blue-600 hover:underline"
                          >
                            Open submission snapshot
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
  tone = "stable",
}: {
  label: string;
  value: string | number;
  tone?: "improving" | "stable" | "declining";
}) {
  const toneMap = {
    improving: "border-emerald-200 bg-emerald-50 text-emerald-900",
    stable: "border-slate-200 bg-white text-slate-900",
    declining: "border-rose-200 bg-rose-50 text-rose-900",
  };

  return (
    <div className={`rounded-xl border p-4 ${toneMap[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
