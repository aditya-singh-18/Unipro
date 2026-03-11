"use client";

import { useEffect, useState } from "react";
import { X, RefreshCw } from "lucide-react";
import axios from "@/lib/axios";

interface Project {
  project_id: number | string;
  title: string;
  description: string;
  tech_stack: string[];
  track?: string;
  status: string;
  mentor_feedback?: string;
}

interface ResubmitProjectModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onResubmitSuccess: () => void;
}

export default function ResubmitProjectModal({
  project,
  isOpen,
  onClose,
  onResubmitSuccess,
}: ResubmitProjectModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    track: "",
    techStack: "",
    requestMentorChange: "continue", // "continue" or "change"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Populate form when project is loaded/opened
  useEffect(() => {
    if (!project) return;
    setFormData({
      title: project.title,
      description: project.description,
      track: project.track || "",
      techStack: (project.tech_stack || []).join(", "),
      requestMentorChange: "continue",
    });
  }, [project, isOpen]);

  if (!isOpen || !project) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      setError("Title and description are required");
      return;
    }

    if (!formData.techStack.trim()) {
      setError("Tech stack is required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const techStackArray = formData.techStack
        .split(",")
        .map((tech) => tech.trim())
        .filter((tech) => tech.length > 0);

      const pid = project.project_id;

      if (!pid) {
        setError("Project ID is missing. Please reopen the modal.");
        return;
      }

      const payload = {
        projectId: pid, // keep same project id
        title: formData.title,
        description: formData.description,
        track: formData.track || null,
        techStack: techStackArray,
        requestMentorChange: formData.requestMentorChange === "change",
      };

      console.log("Resubmit payload", payload);

      await axios.post("/project/resubmit", payload);

      setSuccess(
        formData.requestMentorChange === "change"
          ? "Project resubmitted! Waiting for admin to assign a new mentor."
          : "Project resubmitted successfully! Your mentor will review it soon."
      );

      setTimeout(() => {
        onResubmitSuccess();
        onClose();
        resetForm();
      }, 2000);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? // @ts-expect-error Axios error shape
            err.response?.data?.message
          : null;
      setError(message || "Failed to resubmit project");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      track: "",
      techStack: "",
      requestMentorChange: "continue",
    });
    setError("");
    setSuccess("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-orange-700 px-8 py-6 flex items-center justify-between border-b">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <RefreshCw size={28} />
              Resubmit Project
            </h2>
            <p className="text-orange-100 text-sm mt-1">
              Address the feedback and resubmit for review
            </p>
          </div>
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="text-orange-100 hover:text-white transition-colors"
          >
            <X size={28} />
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
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

          {/* MENTOR FEEDBACK (if exists) */}
          {project.mentor_feedback && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <h3 className="font-semibold text-red-900 mb-2">Mentor Feedback</h3>
              <p className="text-red-800">{project.mentor_feedback}</p>
            </div>
          )}

          {/* PROJECT TITLE */}
          <div>
            <label className="block font-semibold text-slate-900 mb-2">
              Project Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter project title"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-orange-500"
              required
            />
          </div>

          {/* PROJECT DESCRIPTION */}
          <div>
            <label className="block font-semibold text-slate-900 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your project and improvements made..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-orange-500 min-h-[120px]"
              required
            />
          </div>

          {/* PROJECT TRACK */}
          <div>
            <label className="block font-semibold text-slate-900 mb-2">
              Project Track
            </label>
            <input
              type="text"
              name="track"
              value={formData.track}
              onChange={handleChange}
              placeholder="e.g., Web Development, AI/ML, Mobile App"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* TECH STACK */}
          <div>
            <label className="block font-semibold text-slate-900 mb-2">
              Tech Stack <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="techStack"
              value={formData.techStack}
              onChange={handleChange}
              placeholder="e.g., React, Node.js, MongoDB (comma-separated)"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-orange-500"
              required
            />
            <p className="text-sm text-slate-500 mt-1">
              Enter technologies separated by commas
            </p>
          </div>

          {/* MENTOR PREFERENCE */}
          <div>
            <label className="block font-semibold text-slate-900 mb-2">
              Mentor Preference <span className="text-red-500">*</span>
            </label>
            <select
              name="requestMentorChange"
              value={formData.requestMentorChange}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-orange-500"
              required
            >
              <option value="continue">Continue with Same Mentor</option>
              <option value="change">Request Mentor Change</option>
            </select>
            <p className="text-sm text-slate-500 mt-1">
              {formData.requestMentorChange === "continue"
                ? "Your current mentor will review the resubmitted project"
                : "Admin will assign a new mentor to your project"}
            </p>
          </div>
        </form>

        {/* FOOTER */}
        <div className="sticky bottom-0 bg-slate-50 px-8 py-4 border-t flex gap-3 justify-end">
          <button
            type="button"
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
            disabled={loading}
            className={`px-6 py-2 rounded-lg font-semibold transition text-white ${
              loading
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-orange-600 hover:bg-orange-700"
            }`}
          >
            {loading ? "Resubmitting..." : "Resubmit Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
