"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import axios from "@/lib/axios";
import { FileText, CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";
import ProjectReviewModal from "@/components/modals/ProjectReviewModal";
import WeeklySubmissionReviewModal from "@/components/modals/WeeklySubmissionReviewModal";
import {
  getMentorReviewQueue,
  getProjectDailyLogSummary,
  getProjectGithubCommits,
  getProjectScores,
  getWeekSubmissions,
  reviewWeekSubmission,
  createMentorFeedback,
  type GithubCommit,
  type MentorQueueItem,
  type ProgressScore,
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
  const [selectedInsightsProjectId, setSelectedInsightsProjectId] = useState<string>("");
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");
  const [projectScores, setProjectScores] = useState<ProgressScore[]>([]);
  const [projectCommits, setProjectCommits] = useState<GithubCommit[]>([]);
  const [dailyLogSummary, setDailyLogSummary] = useState<Array<{ student_user_key: string; submitted_today: boolean }>>([]);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [feedbackSubmittingFor, setFeedbackSubmittingFor] = useState<string>("");
  const [insightRiskFilter, setInsightRiskFilter] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [showMissingLogsOnly, setShowMissingLogsOnly] = useState(false);
  const [insightSortBy, setInsightSortBy] = useState<"score_desc" | "risk_desc" | "missing_first" | "commit_oldest">("score_desc");
  const [submissionHistory, setSubmissionHistory] = useState<WeekSubmission[]>([]);
  const [selectedQueueItem, setSelectedQueueItem] = useState<MentorQueueItem | null>(null);
  const [reviewModalKey, setReviewModalKey] = useState(0);
  const [error, setError] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<"assigned" | "active" | "completed" | "rejected" | "weekly_review">("assigned");

  useEffect(() => {
    fetchAssignedProjects();
  }, []);

  useEffect(() => {
    if (selectedInsightsProjectId) return;

    const preferred = reviewQueue[0]?.projectId || projects[0]?.project_id;
    if (preferred != null) {
      setSelectedInsightsProjectId(String(preferred));
    }
  }, [reviewQueue, projects, selectedInsightsProjectId]);

  useEffect(() => {
    if (!selectedInsightsProjectId) return;

    const loadProjectInsights = async () => {
      try {
        setInsightsLoading(true);
        setInsightsError("");
        const [scores, summary, commits] = await Promise.all([
          getProjectScores(selectedInsightsProjectId),
          getProjectDailyLogSummary(selectedInsightsProjectId),
          getProjectGithubCommits(selectedInsightsProjectId),
        ]);
        setProjectScores(scores);
        setDailyLogSummary(summary);
        setProjectCommits(commits);
      } catch {
        setInsightsError("Unable to load ProTrack insights for this project.");
      } finally {
        setInsightsLoading(false);
      }
    };

    void loadProjectInsights();
  }, [selectedInsightsProjectId]);

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

  const sendMentorFeedback = async (studentUserKey: string, message: string) => {
    if (!message || !selectedInsightsProjectId) return;

    try {
      setFeedbackSubmittingFor(studentUserKey);
      setInsightsError("");
      await createMentorFeedback({
        student_user_key: studentUserKey,
        project_id: selectedInsightsProjectId,
        reference_type: "general",
        message,
      });
      setFeedbackDrafts((prev) => ({ ...prev, [studentUserKey]: "" }));
    } catch {
      setInsightsError("Failed to send mentor feedback.");
    } finally {
      setFeedbackSubmittingFor("");
    }
  };

  const submitMentorFeedback = async (studentUserKey: string) => {
    const message = (feedbackDrafts[studentUserKey] || "").trim();
    await sendMentorFeedback(studentUserKey, message);
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

  const filteredProjects = filterProjectsByTab();
  const latestScoresByStudent = projectScores.reduce<Record<string, ProgressScore>>((acc, score) => {
    const current = acc[score.student_user_key];
    if (!current) {
      acc[score.student_user_key] = score;
      return acc;
    }

    if (new Date(score.calculated_at).getTime() > new Date(current.calculated_at).getTime()) {
      acc[score.student_user_key] = score;
    }

    return acc;
  }, {});

  const studentInsightRows = Object.values(
    dailyLogSummary.reduce<Record<string, {
      student_user_key: string;
      submitted_today: boolean;
      score?: ProgressScore;
    }>>((acc, item) => {
      const existing = acc[item.student_user_key] || {
        student_user_key: item.student_user_key,
        submitted_today: false,
      };
      existing.submitted_today = item.submitted_today;
      existing.score = latestScoresByStudent[item.student_user_key];
      acc[item.student_user_key] = existing;
      return acc;
    }, Object.keys(latestScoresByStudent).reduce<Record<string, {
      student_user_key: string;
      submitted_today: boolean;
      score?: ProgressScore;
    }>>((acc, key) => {
      acc[key] = {
        student_user_key: key,
        submitted_today: false,
        score: latestScoresByStudent[key],
      };
      return acc;
    }, {}))
  ).sort((a, b) => (b.score?.total_score || 0) - (a.score?.total_score || 0));

  const latestCommitByStudent = projectCommits.reduce<Record<string, GithubCommit>>((acc, commit) => {
    const current = acc[commit.student_user_key];
    if (!current) {
      acc[commit.student_user_key] = commit;
      return acc;
    }

    if (new Date(commit.committed_at).getTime() > new Date(current.committed_at).getTime()) {
      acc[commit.student_user_key] = commit;
    }

    return acc;
  }, {});

  const insightSummary = useMemo(() => {
    const critical = studentInsightRows.filter((row) => row.score?.risk_level === "critical").length;
    const high = studentInsightRows.filter((row) => row.score?.risk_level === "high").length;
    const missing = studentInsightRows.filter((row) => !row.submitted_today).length;
    return {
      total: studentInsightRows.length,
      critical,
      high,
      missing,
    };
  }, [studentInsightRows]);

  const filteredInsightRows = useMemo(() => {
    const riskWeight: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };

    const rows = studentInsightRows.filter((row) => {
      const risk = String(row.score?.risk_level || "").toLowerCase();
      if (insightRiskFilter !== "all" && risk !== insightRiskFilter) return false;
      if (showMissingLogsOnly && row.submitted_today) return false;
      return true;
    });

    rows.sort((a, b) => {
      if (insightSortBy === "score_desc") {
        return (b.score?.total_score || 0) - (a.score?.total_score || 0);
      }

      if (insightSortBy === "risk_desc") {
        return (riskWeight[b.score?.risk_level || "low"] || 0) - (riskWeight[a.score?.risk_level || "low"] || 0);
      }

      if (insightSortBy === "missing_first") {
        if (a.submitted_today === b.submitted_today) return (b.score?.total_score || 0) - (a.score?.total_score || 0);
        return a.submitted_today ? 1 : -1;
      }

      const aCommitTime = latestCommitByStudent[a.student_user_key]
        ? new Date(latestCommitByStudent[a.student_user_key].committed_at).getTime()
        : 0;
      const bCommitTime = latestCommitByStudent[b.student_user_key]
        ? new Date(latestCommitByStudent[b.student_user_key].committed_at).getTime()
        : 0;
      return aCommitTime - bCommitTime;
    });

    return rows;
  }, [studentInsightRows, insightRiskFilter, showMissingLogsOnly, insightSortBy, latestCommitByStudent]);

  const recentCommits = [...projectCommits]
    .sort((a, b) => new Date(b.committed_at).getTime() - new Date(a.committed_at).getTime())
    .slice(0, 8);

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
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">ProTrack Insights</h3>
                      <p className="text-xs text-slate-500">Scoreboard + daily log submission signals for fast mentoring decisions.</p>
                    </div>
                    <select
                      value={selectedInsightsProjectId}
                      onChange={(e) => setSelectedInsightsProjectId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 md:w-72"
                    >
                      {projects.map((project) => (
                        <option key={String(project.project_id)} value={String(project.project_id)}>
                          {project.title} (#{project.project_id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                    <KpiBadge label="Students" value={insightSummary.total} tone="slate" />
                    <KpiBadge label="Critical" value={insightSummary.critical} tone="rose" />
                    <KpiBadge label="High" value={insightSummary.high} tone="amber" />
                    <KpiBadge label="Missing Logs" value={insightSummary.missing} tone="blue" />
                  </div>

                  <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                    <select
                      value={insightRiskFilter}
                      onChange={(e) => setInsightRiskFilter(e.target.value as "all" | "critical" | "high" | "medium" | "low")}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500"
                    >
                      <option value="all">Risk: All</option>
                      <option value="critical">Risk: Critical</option>
                      <option value="high">Risk: High</option>
                      <option value="medium">Risk: Medium</option>
                      <option value="low">Risk: Low</option>
                    </select>

                    <select
                      value={insightSortBy}
                      onChange={(e) => setInsightSortBy(e.target.value as "score_desc" | "risk_desc" | "missing_first" | "commit_oldest")}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500"
                    >
                      <option value="score_desc">Sort: Highest Score</option>
                      <option value="risk_desc">Sort: Highest Risk</option>
                      <option value="missing_first">Sort: Missing Logs First</option>
                      <option value="commit_oldest">Sort: Oldest Commit First</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setShowMissingLogsOnly((prev) => !prev)}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${showMissingLogsOnly ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-700"}`}
                    >
                      {showMissingLogsOnly ? "Showing: Missing Logs" : "Show Missing Logs Only"}
                    </button>
                  </div>

                  {insightsError ? (
                    <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      {insightsError}
                    </div>
                  ) : null}

                  {insightsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-slate-500 text-xs mt-2">Loading project insights...</p>
                    </div>
                  ) : filteredInsightRows.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-5 text-center text-sm text-slate-500">
                      No student rows match current filters.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-215">
                        <thead className="border-b border-slate-200 bg-white">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Student</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Score</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Risk</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Daily Log</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Latest Commit</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Mentor Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredInsightRows.map((row) => (
                            <tr key={row.student_user_key} className="border-b border-slate-100 bg-white">
                              <td className="px-3 py-2 text-sm font-semibold text-slate-800">{row.student_user_key}</td>
                              <td className="px-3 py-2 text-sm text-slate-700">{row.score ? `${row.score.total_score} (${row.score.progress_pct}%)` : "-"}</td>
                              <td className="px-3 py-2 text-sm">
                                {row.score ? (
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    row.score.risk_level === "critical"
                                      ? "bg-rose-100 text-rose-700"
                                      : row.score.risk_level === "high"
                                      ? "bg-orange-100 text-orange-700"
                                      : row.score.risk_level === "medium"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-emerald-100 text-emerald-700"
                                  }`}>
                                    {row.score.risk_level}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${row.submitted_today ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                  {row.submitted_today ? "Submitted" : "Missing"}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-xs text-slate-600">
                                {latestCommitByStudent[row.student_user_key] ? (
                                  <div className="space-y-0.5">
                                    <p className="font-semibold text-slate-700">{latestCommitByStudent[row.student_user_key].sha.slice(0, 7)}</p>
                                    <p className="max-w-44 truncate">{latestCommitByStudent[row.student_user_key].message || "No message"}</p>
                                    <p>{new Date(latestCommitByStudent[row.student_user_key].committed_at).toLocaleString()}</p>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">No commits</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <div className="space-y-1.5">
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => void sendMentorFeedback(row.student_user_key, "Please submit today\'s daily log and share blockers if any.")}
                                      disabled={feedbackSubmittingFor === row.student_user_key || row.submitted_today}
                                      className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      Nudge Log
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void sendMentorFeedback(row.student_user_key, "Your risk score is elevated. Please prioritize overdue tasks and push an update today.")}
                                      disabled={feedbackSubmittingFor === row.student_user_key || (row.score?.risk_level !== "high" && row.score?.risk_level !== "critical")}
                                      className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      Risk Alert
                                    </button>
                                  </div>

                                  <div className="flex gap-2">
                                  <input
                                    value={feedbackDrafts[row.student_user_key] || ""}
                                    onChange={(e) => setFeedbackDrafts((prev) => ({ ...prev, [row.student_user_key]: e.target.value }))}
                                    placeholder="Feedback message"
                                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => void submitMentorFeedback(row.student_user_key)}
                                    disabled={feedbackSubmittingFor === row.student_user_key || !(feedbackDrafts[row.student_user_key] || "").trim()}
                                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Send
                                  </button>
                                </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Recent Project Commits</p>
                      <span className="text-xs text-slate-500">{projectCommits.length} total</span>
                    </div>

                    {recentCommits.length === 0 ? (
                      <p className="text-sm text-slate-500">No commits synced for this project yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {recentCommits.map((commit) => (
                          <div key={commit.commit_id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-700">
                                {commit.student_name || commit.student_user_key} · {commit.sha.slice(0, 7)}
                              </p>
                              <p className="truncate text-xs text-slate-600">{commit.message || "No commit message"}</p>
                            </div>
                            <p className="whitespace-nowrap text-[11px] text-slate-500">{new Date(commit.committed_at).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {queueLoading ? (
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
                )}
              </div>
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

function KpiBadge({ label, value, tone }: { label: string; value: number; tone: "slate" | "rose" | "amber" | "blue" }) {
  const toneClass: Record<string, string> = {
    slate: "border-slate-200 bg-white text-slate-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
  };

  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass[tone] || toneClass.slate}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
      <p className="text-base font-bold">{value}</p>
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
