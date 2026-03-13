"use client";

import { useState, useEffect, type ReactNode } from "react";
import axios from "@/lib/axios";
import { FileText, CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";
import ProjectReviewModal from "@/components/modals/ProjectReviewModal";
import WeeklySubmissionReviewModal from "@/components/modals/WeeklySubmissionReviewModal";
import {
  getMentorReviewQueue,
  getWeekSubmissions,
  reviewWeekSubmission,
  type MentorQueueItem,
  type WeekSubmission,
} from "@/services/tracker.service";

interface Project {
  project_id: number | string;
  title: string;
  description: string;
  tech_stack: string[];
  status: string;
  created_at: string;
  approved_at: string | null;
}

interface RejectedHistoryProject {
  rejection_id: string;
  project_id: number | string;
  title: string;
  description: string;
  tech_stack: string[];
  current_status: string;
  rejection_reason: string;
  mentor_feedback: string;
  rejected_at: string;
  resubmitted: boolean;
  resubmitted_at: string | null;
}

export default function MentorAssignedProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [rejectedHistory, setRejectedHistory] = useState<RejectedHistoryProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueDetailLoading, setQueueDetailLoading] = useState(false);
  const [queueActionLoadingId, setQueueActionLoadingId] = useState<number | null>(null);
  const [reviewQueue, setReviewQueue] = useState<MentorQueueItem[]>([]);
  const [submissionHistory, setSubmissionHistory] = useState<WeekSubmission[]>([]);
  const [selectedQueueItem, setSelectedQueueItem] = useState<MentorQueueItem | null>(null);
  const [reviewModalKey, setReviewModalKey] = useState(0);
  const [error, setError] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<"assigned" | "active" | "completed" | "rejected" | "weekly_review">("assigned");

  useEffect(() => {
    fetchAssignedProjects();
  }, []);

  const fetchAssignedProjects = async () => {
    try {
      setLoading(true);
      const [assignedResponse, rejectedResponse] = await Promise.all([
        axios.get("/project/mentor/assigned"),
        axios.get("/project/mentor/rejected-history"),
      ]);

      setProjects(assignedResponse.data.projects || []);
      setRejectedHistory(rejectedResponse.data.projects || []);

      setQueueLoading(true);
      try {
        const queue = await getMentorReviewQueue({
          sortBy: "pending_age",
          order: "desc",
          page: 1,
          pageSize: 100,
        });
        setReviewQueue(queue.queue);
      } finally {
        setQueueLoading(false);
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? // @ts-expect-error api error shape
            err.response?.data?.message
          : null;
      setError(message || "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: ReactNode }> = {
      ASSIGNED_TO_MENTOR: {
        bg: "bg-yellow-100 text-yellow-800",
        text: "Pending Review",
        icon: <Clock size={16} />,
      },
      RESUBMITTED: {
        bg: "bg-blue-100 text-blue-800",
        text: "Resubmitted",
        icon: <AlertCircle size={16} />,
      },
      APPROVED: {
        bg: "bg-green-100 text-green-800",
        text: "Active",
        icon: <CheckCircle size={16} />,
      },
      ACTIVE: {
        bg: "bg-green-100 text-green-800",
        text: "Active",
        icon: <CheckCircle size={16} />,
      },
      COMPLETED: {
        bg: "bg-purple-100 text-purple-800",
        text: "Completed",
        icon: <CheckCircle size={16} />,
      },
      REJECTED: {
        bg: "bg-red-100 text-red-800",
        text: "Rejected",
        icon: <XCircle size={16} />,
      },
    };

    const badge = badges[status] || {
      bg: "bg-gray-100 text-gray-800",
      text: status,
      icon: <FileText size={16} />,
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.bg}`}
      >
        {badge.icon}
        {badge.text}
      </span>
    );
  };

  const filterProjectsByTab = () => {
    switch (activeTab) {
      case "assigned":
        return projects.filter(p => 
          p.status === "ASSIGNED_TO_MENTOR" || p.status === "RESUBMITTED"
        );
      case "active":
        return projects.filter(p => p.status === "APPROVED" || p.status === "ACTIVE");
      case "completed":
        return projects.filter(p => p.status === "COMPLETED");
      default:
        return projects;
    }
  };

  const getTabCount = (tab: typeof activeTab) => {
    switch (tab) {
      case "assigned":
        return projects.filter(p => 
          p.status === "ASSIGNED_TO_MENTOR" || p.status === "RESUBMITTED"
        ).length;
      case "active":
        return projects.filter(p => p.status === "APPROVED" || p.status === "ACTIVE").length;
      case "completed":
        return projects.filter(p => p.status === "COMPLETED").length;
      case "rejected":
        return rejectedHistory.length;
      case "weekly_review":
        return reviewQueue.length;
      default:
        return 0;
    }
  };

  const submitWeeklyReview = async (action: "approve" | "reject", reviewComment: string) => {
    if (!selectedQueueItem) return;

    try {
      setQueueActionLoadingId(selectedQueueItem.submissionId);
      setError("");

      await reviewWeekSubmission(selectedQueueItem.submissionId, {
        action,
        reviewComment,
      });

      setSelectedQueueItem(null);
      await fetchAssignedProjects();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? // @ts-expect-error api error shape
            err.response?.data?.message
          : null;
      setError(message || "Failed to submit weekly review");
    } finally {
      setQueueActionLoadingId(null);
    }
  };

  const openWeeklyReviewModal = async (item: MentorQueueItem) => {
    try {
      setQueueDetailLoading(true);
      setError("");

      const history = await getWeekSubmissions(item.weekId);
      setSubmissionHistory(history);
      setReviewModalKey((prev) => prev + 1);
      setSelectedQueueItem(item);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? // @ts-expect-error api error shape
            err.response?.data?.message
          : null;
      setError(message || "Failed to load submission revisions");
    } finally {
      setQueueDetailLoading(false);
    }
  };

  const getProjectTitleById = (projectId: string) => {
    const project = projects.find((p) => String(p.project_id) === String(projectId));
    return project?.title;
  };

  const revokeRejectedDecision = async (projectId: string | number) => {
    try {
      await axios.post(`/project/mentor/rejected/${projectId}/revoke`);
      await fetchAssignedProjects();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? // @ts-expect-error api error shape
            err.response?.data?.message
          : null;
      setError(message || "Failed to revoke rejected decision");
    }
  };

  const calculateSkillMatch = (techStack: string[]) => {
    const bonus = Math.min((techStack?.length || 0) * 4, 20);
    return 75 + bonus;
  };

  const calculateProgress = (status: string, approvedAt: string | null) => {
    if (status === "APPROVED") return approvedAt ? 100 : 95;
    if (status === "ACTIVE") return 100;
    if (status === "RESUBMITTED") return 60;
    if (status === "ASSIGNED_TO_MENTOR") return 30;
    return 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading assigned projects...</p>
        </div>
      </div>
    );
  }

  const filteredProjects = filterProjectsByTab();

  return (
    <div className="space-y-6">
        {/* ERROR MESSAGE */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* TABS NAVIGATION */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="flex border-b border-slate-200">
            <TabButton
              active={activeTab === "assigned"}
              onClick={() => setActiveTab("assigned")}
              label="Assigned"
              count={getTabCount("assigned")}
              color="yellow"
            />
            <TabButton
              active={activeTab === "active"}
              onClick={() => setActiveTab("active")}
              label="Active"
              count={getTabCount("active")}
              color="green"
            />
            <TabButton
              active={activeTab === "completed"}
              onClick={() => setActiveTab("completed")}
              label="Completed"
              count={getTabCount("completed")}
              color="purple"
            />
            <TabButton
              active={activeTab === "rejected"}
              onClick={() => setActiveTab("rejected")}
              label="Rejected"
              count={getTabCount("rejected")}
              color="red"
            />
            <TabButton
              active={activeTab === "weekly_review"}
              onClick={() => setActiveTab("weekly_review")}
              label="Weekly Review"
              count={getTabCount("weekly_review")}
              color="blue"
            />
          </div>

          {/* PROJECTS LIST */}
          <div className="p-6">
            {activeTab === "weekly_review" ? (
              queueLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-slate-500 text-sm mt-3">Loading weekly review queue...</p>
                </div>
              ) : reviewQueue.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle size={48} className="mx-auto text-emerald-300 mb-4" />
                  <p className="text-slate-500 text-lg">No weekly submissions pending review</p>
                  <p className="text-slate-400 text-sm mt-2">Queue is clear</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">Project</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">Week</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">Summary</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">Submitted At</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewQueue.map((item) => (
                        <tr key={`${item.projectId}-${item.weekId}-${item.submissionId}`} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 text-sm">#{item.projectId}</div>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-700">
                            Week {item.weekNumber}
                            {item.phaseName ? ` (${item.phaseName})` : ""}
                            <div className="text-xs text-slate-500">Revision #{item.revisionNo}</div>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-700 max-w-90">
                            <div className="line-clamp-2">{item.summaryOfWork}</div>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">{new Date(item.submittedAt).toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => openWeeklyReviewModal(item)}
                                disabled={queueDetailLoading}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
                              >
                                {queueDetailLoading ? "Loading..." : "Review"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : activeTab === "rejected" ? (
              rejectedHistory.length === 0 ? (
                <div className="text-center py-12">
                  <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 text-lg">No rejected projects</p>
                  <p className="text-slate-400 text-sm mt-2">
                    Rejected project history will appear here
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">Project</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">Rejection Reason</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">Feedback</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">Rejected At</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">Resubmitted</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rejectedHistory.map((item) => (
                        <tr
                          key={item.rejection_id}
                          className="border-b border-slate-100 hover:bg-slate-50 transition"
                        >
                          <td className="py-3 px-4">
                            <div>
                              <h3 className="font-semibold text-slate-900 text-sm">{item.title}</h3>
                              <p className="text-xs text-slate-500 mt-1">#{item.project_id}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-700">{item.rejection_reason || '-'}</td>
                          <td className="py-3 px-4 text-sm text-slate-700">{item.mentor_feedback || '-'}</td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {new Date(item.rejected_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <span
                              className={`px-2 py-1 rounded-md text-xs font-semibold ${
                                item.resubmitted
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {item.resubmitted ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {item.current_status === 'REJECTED' ? (
                              <button
                                onClick={() => revokeRejectedDecision(item.project_id)}
                                className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold transition"
                              >
                                Revoke Decision
                              </button>
                            ) : (
                              <span className="text-xs text-slate-500">{item.current_status}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 text-lg">
                  No {activeTab} projects
                </p>
                <p className="text-slate-400 text-sm mt-2">
                  Projects will appear here when they match this status
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">
                        Project
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">
                        Tech Stack
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">
                        Skill Match
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">
                        Progress
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((project) => {
                      const skillMatch = calculateSkillMatch(project.tech_stack);
                      const progress = calculateProgress(
                        project.status,
                        project.approved_at
                      );

                      return (
                        <tr
                          key={project.project_id}
                          className="border-b border-slate-100 hover:bg-slate-50 transition"
                        >
                          <td className="py-3 px-4">
                            <div>
                              <h3 className="font-semibold text-slate-900 text-sm">
                                {project.title}
                              </h3>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                {project.description}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {project.tech_stack.slice(0, 3).map((tech, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md"
                                >
                                  {tech}
                                </span>
                              ))}
                              {project.tech_stack.length > 3 && (
                                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md">
                                  +{project.tech_stack.length - 3}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-200 rounded-full h-2 w-16">
                                <div
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ inlineSize: `${skillMatch}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-semibold text-slate-700">
                                {skillMatch}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-200 rounded-full h-2 w-16">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ inlineSize: `${progress}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-semibold text-slate-700">
                                {progress}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(project.status)}</td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => setSelectedProject(project)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      {/* PROJECT DETAIL MODAL */}
      <ProjectReviewModal
        project={selectedProject}
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        onReviewSubmitted={fetchAssignedProjects}
      />

      <WeeklySubmissionReviewModal
        key={reviewModalKey}
        open={!!selectedQueueItem}
        item={selectedQueueItem}
        submissionHistory={submissionHistory}
        projectTitle={selectedQueueItem ? getProjectTitleById(selectedQueueItem.projectId) : undefined}
        loading={selectedQueueItem ? queueActionLoadingId === selectedQueueItem.submissionId : false}
        onClose={() => {
          setSelectedQueueItem(null);
          setSubmissionHistory([]);
        }}
        onSubmit={submitWeeklyReview}
      />
    </div>
  );
}

// TAB BUTTON COMPONENT
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color: "yellow" | "green" | "purple" | "red" | "blue";
}

function TabButton({ active, onClick, label, count, color }: TabButtonProps) {
  const colors = {
    yellow: {
      active: "border-b-2 border-yellow-500 text-yellow-700 bg-yellow-50",
      inactive: "text-slate-600 hover:bg-slate-50",
      badge: "bg-yellow-100 text-yellow-700",
    },
    green: {
      active: "border-b-2 border-green-500 text-green-700 bg-green-50",
      inactive: "text-slate-600 hover:bg-slate-50",
      badge: "bg-green-100 text-green-700",
    },
    purple: {
      active: "border-b-2 border-purple-500 text-purple-700 bg-purple-50",
      inactive: "text-slate-600 hover:bg-slate-50",
      badge: "bg-purple-100 text-purple-700",
    },
    red: {
      active: "border-b-2 border-red-500 text-red-700 bg-red-50",
      inactive: "text-slate-600 hover:bg-slate-50",
      badge: "bg-red-100 text-red-700",
    },
    blue: {
      active: "border-b-2 border-blue-500 text-blue-700 bg-blue-50",
      inactive: "text-slate-600 hover:bg-slate-50",
      badge: "bg-blue-100 text-blue-700",
    },
  };

  const colorClass = colors[color];

  return (
    <button
      onClick={onClick}
      className={`flex-1 py-4 px-6 font-semibold text-sm transition-all duration-200 ${
        active ? colorClass.active : colorClass.inactive
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        <span>{label}</span>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            active ? colorClass.badge : "bg-slate-200 text-slate-600"
          }`}
        >
          {count}
        </span>
      </div>
    </button>
  );
}
