"use client";

import { useState } from "react";
import type { MentorFeedback } from "@/services/tracker.service";

type MentorFeedbackListProps = {
  feedback: MentorFeedback[];
  loading?: boolean;
  error?: string;
  onMarkRead: (feedbackId: string) => Promise<void>;
  onReply: (feedbackId: string, reply: string) => Promise<void>;
};

export default function MentorFeedbackList({
  feedback,
  loading = false,
  error = "",
  onMarkRead,
  onReply,
}: MentorFeedbackListProps) {
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  if (loading) {
    return (
      <section className="rounded-3xl border border-sky-100 bg-white/90 p-5 shadow-[0_14px_30px_rgba(42,74,128,0.12)]">
        <p className="text-sm text-slate-500">Loading feedback...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-sky-100 bg-white/90 p-5 shadow-[0_14px_30px_rgba(42,74,128,0.12)]">
        <p className="text-sm text-rose-600">{error}</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-sky-100 bg-white/90 p-5 shadow-[0_14px_30px_rgba(42,74,128,0.12)]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Mentor Feedback Inbox</h3>
        <span className="text-xs text-slate-500">{feedback.length} item(s)</span>
      </div>

      {feedback.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          No mentor feedback for this project yet.
        </div>
      ) : (
        <div className="space-y-3">
          {feedback.map((item) => (
            <article key={item.feedback_id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">{item.mentor_name || item.mentor_employee_id}</p>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.is_read ? "bg-slate-200 text-slate-700" : "bg-blue-100 text-blue-700"}`}>
                    {item.is_read ? "Read" : "Unread"}
                  </span>
                  {typeof item.rating === "number" ? (
                    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      Rating: {item.rating}/5
                    </span>
                  ) : null}
                </div>
              </div>

              <p className="mb-2 text-sm text-slate-700 whitespace-pre-wrap">{item.message}</p>

              {item.student_reply ? (
                <div className="mb-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  Your reply: {item.student_reply}
                </div>
              ) : (
                <div className="mb-2 flex gap-2">
                  <input
                    value={replyDrafts[item.feedback_id] || ""}
                    onChange={(e) =>
                      setReplyDrafts((prev) => ({
                        ...prev,
                        [item.feedback_id]: e.target.value,
                      }))
                    }
                    placeholder="Type reply"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    disabled={submittingId === item.feedback_id || !(replyDrafts[item.feedback_id] || "").trim()}
                    onClick={async () => {
                      const reply = (replyDrafts[item.feedback_id] || "").trim();
                      if (!reply) return;
                      setSubmittingId(item.feedback_id);
                      try {
                        await onReply(item.feedback_id, reply);
                        setReplyDrafts((prev) => ({ ...prev, [item.feedback_id]: "" }));
                      } finally {
                        setSubmittingId(null);
                      }
                    }}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reply
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>{new Date(item.created_at).toLocaleString()}</span>
                {!item.is_read ? (
                  <button
                    type="button"
                    onClick={() => void onMarkRead(item.feedback_id)}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    Mark as read
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
