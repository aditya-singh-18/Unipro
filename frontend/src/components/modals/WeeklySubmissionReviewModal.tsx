"use client";

import { useState } from "react";
import BaseModal from "@/components/modals/BaseModal";
import { type MentorQueueItem, type WeekSubmission } from "@/services/tracker.service";

type ReviewAction = "approve" | "reject";

type WeeklySubmissionReviewModalProps = {
  open: boolean;
  item: MentorQueueItem | null;
  submissionHistory: WeekSubmission[];
  projectTitle?: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (action: ReviewAction, reviewComment: string) => Promise<void>;
};

const normalizeValue = (value?: string | null) => (value || "").trim();

const getDiffStats = (previousRevision: WeekSubmission | undefined, item: MentorQueueItem) => {
  const fields = [
    [previousRevision?.summary_of_work, item.summaryOfWork],
    [previousRevision?.blockers, item.blockers],
    [previousRevision?.next_week_plan, item.nextWeekPlan],
    [previousRevision?.github_link_snapshot, item.githubLinkSnapshot],
  ];

  const changedCount = fields.filter(
    ([previousValue, currentValue]) => normalizeValue(previousValue) !== normalizeValue(currentValue)
  ).length;

  return {
    changedCount,
    totalFields: fields.length,
  };
};

export default function WeeklySubmissionReviewModal({
  open,
  item,
  submissionHistory,
  projectTitle,
  loading,
  onClose,
  onSubmit,
}: WeeklySubmissionReviewModalProps) {
  const [action, setAction] = useState<ReviewAction>("approve");
  const [reviewComment, setReviewComment] = useState("Reviewed by mentor");
  const [error, setError] = useState("");

  const previousRevision = submissionHistory.find(
    (submission) => submission.submission_id !== item?.submissionId
  );

  if (!item) return null;

  const handleSubmit = async () => {
    if (action === "reject" && !reviewComment.trim()) {
      setError("Feedback is required for rejection");
      return;
    }

    setError("");
    await onSubmit(action, reviewComment.trim());
  };

  const diffStats = getDiffStats(previousRevision, item);

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={`Weekly Review - Week ${item.weekNumber}`}
      className="max-w-3xl"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="font-semibold text-slate-900">{projectTitle || `Project #${item.projectId}`}</div>
          <div className="mt-1 text-xs text-slate-500">
            Project #{item.projectId} | Phase: {item.phaseName || "-"} | Revision #{item.revisionNo}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Submitted at: {new Date(item.submittedAt).toLocaleString()}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-900">Summary of Work</h4>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
            {item.summaryOfWork || "-"}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-slate-900">Revision Comparison</h4>
            {previousRevision ? (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                {diffStats.changedCount}/{diffStats.totalFields} fields changed
              </span>
            ) : null}
          </div>
          {previousRevision ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <RevisionFieldCard
                label="Summary of Work"
                previousValue={previousRevision.summary_of_work}
                currentValue={item.summaryOfWork}
                previousRevisionNo={previousRevision.revision_no}
                currentRevisionNo={item.revisionNo}
              />
              <RevisionFieldCard
                label="Blockers"
                previousValue={previousRevision.blockers}
                currentValue={item.blockers}
                previousRevisionNo={previousRevision.revision_no}
                currentRevisionNo={item.revisionNo}
              />
              <RevisionFieldCard
                label="Next Week Plan"
                previousValue={previousRevision.next_week_plan}
                currentValue={item.nextWeekPlan}
                previousRevisionNo={previousRevision.revision_no}
                currentRevisionNo={item.revisionNo}
              />
              <RevisionFieldCard
                label="GitHub Snapshot"
                previousValue={previousRevision.github_link_snapshot}
                currentValue={item.githubLinkSnapshot}
                previousRevisionNo={previousRevision.revision_no}
                currentRevisionNo={item.revisionNo}
                isLink
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
              No earlier revision found for this week. This appears to be the first submission.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-900">Blockers</h4>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 min-h-20">
              {item.blockers || "No blockers provided"}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-900">Next Week Plan</h4>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 min-h-20">
              {item.nextWeekPlan || "No plan provided"}
            </div>
          </div>
        </div>

        {item.githubLinkSnapshot && (
          <a
            href={item.githubLinkSnapshot}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm font-medium text-blue-600 hover:underline"
          >
            Open GitHub Snapshot
          </a>
        )}

        <div className="space-y-3 border-t border-slate-200 pt-4">
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="review-action"
                checked={action === "approve"}
                onChange={() => {
                  setAction("approve");
                  if (!reviewComment.trim()) {
                    setReviewComment("Reviewed by mentor");
                  }
                }}
              />
              Approve
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="review-action"
                checked={action === "reject"}
                onChange={() => {
                  setAction("reject");
                  if (reviewComment === "Reviewed by mentor") {
                    setReviewComment("");
                  }
                }}
              />
              Reject
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Mentor Comment {action === "reject" ? "*" : ""}
            </label>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder={action === "reject" ? "Provide rejection reason" : "Optional comment"}
              className="w-full min-h-24 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          {error && <div className="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div>}

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              } disabled:opacity-50`}
            >
              {loading ? "Submitting..." : action === "approve" ? "Approve Submission" : "Reject Submission"}
            </button>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}

type RevisionFieldCardProps = {
  label: string;
  previousValue?: string | null;
  currentValue?: string | null;
  previousRevisionNo: number;
  currentRevisionNo: number;
  isLink?: boolean;
};

function RevisionFieldCard({
  label,
  previousValue,
  currentValue,
  previousRevisionNo,
  currentRevisionNo,
  isLink = false,
}: RevisionFieldCardProps) {
  const changed = normalizeValue(previousValue) !== normalizeValue(currentValue);
  const cardClass = changed
    ? "border-emerald-200 bg-emerald-50"
    : "border-slate-200 bg-slate-50";

  return (
    <div className={`rounded-xl border p-3 ${cardClass}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
            changed ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
          }`}
        >
          {changed ? "Changed" : "Unchanged"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <RevisionValueBlock
          revisionLabel={`Previous · Rev ${previousRevisionNo}`}
          value={previousValue}
          isLink={isLink}
        />
        <RevisionValueBlock
          revisionLabel={`Latest · Rev ${currentRevisionNo}`}
          value={currentValue}
          isLink={isLink}
          emphasize={changed}
        />
      </div>
    </div>
  );
}

function RevisionValueBlock({
  revisionLabel,
  value,
  isLink,
  emphasize = false,
}: {
  revisionLabel: string;
  value?: string | null;
  isLink?: boolean;
  emphasize?: boolean;
}) {
  const displayValue = value || "-";

  return (
    <div className={`rounded-lg border p-3 ${emphasize ? "border-emerald-200 bg-white" : "border-white/60 bg-white/70"}`}>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{revisionLabel}</div>
      {isLink && value ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="break-all text-sm font-medium text-blue-600 hover:underline"
        >
          {value}
        </a>
      ) : (
        <p className="whitespace-pre-wrap wrap-break-word text-sm text-slate-700">{displayValue}</p>
      )}
    </div>
  );
}
