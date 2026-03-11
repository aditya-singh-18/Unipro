"use client";

import { useState } from "react";
import { X, CheckCircle, XCircle } from "lucide-react";
import axios from "@/lib/axios";

interface Project {
  project_id: number | string;
  title: string;
  description: string;
  tech_stack: string[];
  status: string;
  created_at: string;
  approved_at: string | null;
}

interface ProjectReviewModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted: () => void;
}

export default function ProjectReviewModal({
  project,
  isOpen,
  onClose,
  onReviewSubmitted,
}: ProjectReviewModalProps) {
  const [action, setAction] = useState<"APPROVE" | "REJECT" | "REVOKE" | null>(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen || !project) return null;

  const approvedAtMs = project.approved_at ? new Date(project.approved_at).getTime() : null;
  const canRevoke =
    project.status === "APPROVED" &&
    approvedAtMs !== null &&
    Date.now() - approvedAtMs < 24 * 60 * 60 * 1000;

  const handleSubmit = async () => {
    if (!action) {
      setError("Please select an action (Approve, Reject, or Revoke)");
      return;
    }

    if (action === "REJECT" && !feedback.trim()) {
      setError("Feedback is required when rejecting a project");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await axios.post("/project/mentor/review", {
        projectId: project.project_id,
        action,
        mentorFeedback: feedback || null,
      });

      const verb =
        action === "APPROVE"
          ? "approved"
          : action === "REJECT"
          ? "rejected"
          : "revoked";

      setSuccess(`Project ${verb} successfully!`);
      
      setTimeout(() => {
        onReviewSubmitted();
        onClose();
        resetForm();
      }, 1500);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? // @ts-expect-error Axios error shape
            err.response?.data?.message
          : null;
      setError(message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAction(null);
    setFeedback("");
    setError("");
    setSuccess("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 flex items-center justify-between border-b">
          <div>
            <h2 className="text-2xl font-bold text-white">{project.title}</h2>
            <p className="text-blue-100 text-sm mt-1">Review Project & Provide Feedback</p>
          </div>
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="text-blue-100 hover:text-white transition-colors"
          >
            <X size={28} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-8 space-y-6">
          {/* ERROR/SUCCESS MESSAGES */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {/* PROJECT DETAILS */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
            <p className="text-slate-600 bg-slate-50 p-4 rounded-lg">
              {project.description}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Tech Stack</h3>
            <div className="flex flex-wrap gap-2">
              {project.tech_stack.map((tech, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md font-medium"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Submitted On</h3>
            <p className="text-slate-600">
              {new Date(project.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* REVIEW ACTION */}
          {project.status !== "APPROVED" ? (
            <>
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Your Decision</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setAction("APPROVE")}
                    className={`p-4 border-2 rounded-xl transition-all ${
                      action === "APPROVE"
                        ? "border-green-500 bg-green-50"
                        : "border-slate-200 hover:border-green-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle
                        size={24}
                        className={action === "APPROVE" ? "text-green-600" : "text-slate-400"}
                      />
                      <div className="text-left">
                        <h4 className="font-semibold text-slate-900">Approve</h4>
                        <p className="text-sm text-slate-600">Project meets requirements</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setAction("REJECT")}
                    className={`p-4 border-2 rounded-xl transition-all ${
                      action === "REJECT"
                        ? "border-red-500 bg-red-50"
                        : "border-slate-200 hover:border-red-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <XCircle
                        size={24}
                        className={action === "REJECT" ? "text-red-600" : "text-slate-400"}
                      />
                      <div className="text-left">
                        <h4 className="font-semibold text-slate-900">Reject</h4>
                        <p className="text-sm text-slate-600">Needs improvements</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* FEEDBACK */}
              <div>
                <label className="block font-semibold text-slate-900 mb-2">
                  Feedback {action === "REJECT" && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={
                    action === "APPROVE"
                      ? "Optional: Provide positive feedback or suggestions..."
                      : "Explain what needs to be improved..."
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 min-h-[120px]"
                  required={action === "REJECT"}
                />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <p className="font-semibold text-green-900">Already approved</p>
                <p className="text-sm text-green-800">
                  You can revoke this approval within 24 hours before it auto-activates.
                </p>
                {project.approved_at && (
                  <p className="text-xs text-green-700 mt-1">
                    Approved at: {new Date(project.approved_at).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block font-semibold text-slate-900">Reason (optional)</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Briefly explain why you're revoking the approval"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 min-h-[100px]"
                />
              </div>

              <button
                onClick={() => setAction("REVOKE")}
                disabled={!canRevoke || loading}
                className={`w-full px-6 py-3 rounded-lg font-semibold transition text-white ${
                  !canRevoke || loading
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {canRevoke ? "Revoke Approval" : "24-hour window expired"}
              </button>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="sticky bottom-0 bg-slate-50 px-8 py-4 border-t flex gap-3 justify-end">
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 font-semibold rounded-lg transition"
            disabled={loading}
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading || !action}
            className={`px-6 py-2 rounded-lg font-semibold transition text-white ${
              loading || !action
                ? "bg-slate-400 cursor-not-allowed"
                : action === "APPROVE"
                ? "bg-green-600 hover:bg-green-700"
                : action === "REJECT"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            {loading ? "Submitting..." : `Submit ${action || "Review"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
