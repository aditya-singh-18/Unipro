"use client";

import { useState, useEffect } from "react";
import {
  getMentorFeedback,
  markFeedbackAsRead,
  replyToFeedback,
  type MentorFeedback,
} from "@/services/protrackEnhancement.service";

type MentorFeedbackPanelProps = {
  projectId: string;
  isStudent?: boolean;
};

export default function MentorFeedbackPanel({ projectId, isStudent = true }: MentorFeedbackPanelProps) {
  const [feedbackList, setFeedbackList] = useState<MentorFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getMentorFeedback(projectId, { limit: 50 });
      setFeedbackList(data);
    } catch (e) {
      setError('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      void loadFeedback();
    }
  }, [projectId]);

  const handleMarkAsRead = async (feedbackId: string) => {
    try {
      await markFeedbackAsRead(feedbackId);
      setFeedbackList((prev) =>
        prev.map((f) => (f.feedback_id === feedbackId ? { ...f, is_read: true } : f))
      );
    } catch (e) {
      alert('Failed to mark as read');
    }
  };

  const handleReplySubmit = async (feedbackId: string) => {
    if (!replyText.trim()) {
      alert('Reply cannot be empty');
      return;
    }

    try {
      setSubmittingReply(true);
      const updated = await replyToFeedback(feedbackId, { studentReply: replyText.trim() });
      setFeedbackList((prev) =>
        prev.map((f) => (f.feedback_id === feedbackId ? updated : f))
      );
      setReplyText('');
      setReplyingTo(null);
    } catch (e) {
      alert('Failed to send reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < rating ? 'text-amber-400' : 'text-slate-300'}>
            ★
          </span>
        ))}
      </div>
    );
  };

  const referenceTypeColors: Record<string, { bg: string; text: string }> = {
    submission: { bg: 'bg-blue-100', text: 'text-blue-700' },
    task: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    general: { bg: 'bg-slate-100', text: 'text-slate-700' },
  };

  if (loading) {
    return (
      <div className="bg-white/88 backdrop-blur-sm rounded-3xl border border-sky-100 shadow-[0_14px_30px_rgba(42,74,128,0.12)] p-8">
        <div className="flex items-center justify-center">
          <div className="text-slate-500">Loading feedback...</div>
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
          <h3 className="font-semibold text-slate-900">Mentor Feedback</h3>
          <p className="text-xs text-slate-500 mt-0.5">Messages from your mentor</p>
        </div>
        <span className="text-xs text-slate-500">
          {feedbackList.filter((f) => !f.is_read).length} unread
        </span>
      </div>

      {feedbackList.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <span className="text-2xl">💬</span>
          </div>
          <p className="text-sm text-slate-600 font-medium">No feedback yet</p>
          <p className="text-xs text-slate-500 mt-1">Your mentor will provide feedback here</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
          {feedbackList.map((feedback) => {
            const refConfig = feedback.reference_type
              ? referenceTypeColors[feedback.reference_type]
              : referenceTypeColors.general;

            return (
              <div
                key={feedback.feedback_id}
                className={`px-5 py-4 ${!feedback.is_read && isStudent ? 'bg-blue-50/30' : ''}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {feedback.reference_type && (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${refConfig.bg} ${refConfig.text}`}
                        >
                          {feedback.reference_type}
                        </span>
                      )}
                      {feedback.rating && renderStars(feedback.rating)}
                      {!feedback.is_read && isStudent && (
                        <span className="inline-flex items-center rounded-full bg-blue-500 px-2 py-0.5 text-xs font-semibold text-white">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{formatDate(feedback.created_at)}</p>
                  </div>
                  {!feedback.is_read && isStudent && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(feedback.feedback_id)}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>

                {/* Message */}
                <div className="mb-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Mentor's Message
                  </div>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{feedback.message}</p>
                </div>

                {/* Student Reply */}
                {feedback.student_reply ? (
                  <div className="mt-3 p-3 rounded-lg bg-indigo-50/50 border border-indigo-100">
                    <div className="text-xs font-semibold text-indigo-700 mb-1">Your Reply</div>
                    <p className="text-sm text-indigo-800 whitespace-pre-wrap">{feedback.student_reply}</p>
                  </div>
                ) : isStudent && (
                  <div className="mt-3">
                    {replyingTo === feedback.feedback_id ? (
                      <div className="space-y-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write your reply..."
                          className="w-full min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleReplySubmit(feedback.feedback_id)}
                            disabled={submittingReply}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
                          >
                            {submittingReply ? 'Sending...' : 'Send Reply'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText('');
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setReplyingTo(feedback.feedback_id)}
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 transition"
                      >
                        💬 Reply to Mentor
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
