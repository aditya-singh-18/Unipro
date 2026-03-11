"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/sidebar/StudentSidebar";
import Topbar from "@/components/dashboard/Topbar";
import { getMyProjects, getProjectDetail } from "@/services/project.service";
import {
  createProjectTask,
  createWeeklySubmission,
  getProjectTasks,
  getWeekDraft,
  getProjectWeeks,
  getWeekReviews,
  getWeekSubmissions,
  getSubmissionFiles,
  attachSubmissionFile,
  uploadTrackerFile,
  resubmitWeeklySubmission,
  saveWeekDraft,
  updateProjectTaskStatus,
  type TrackerTask,
  type TrackerTaskPriority,
  type TrackerTaskStatus,
  type TrackerWeek,
  type WeekReview,
  type WeekSubmission,
  type SubmissionFile,
} from "@/services/tracker.service";

type StudentProject = {
  project_id: string;
  title?: string;
  status?: string;
};

type TeamMemberOption = {
  enrollment_id: string;
  name?: string;
  email?: string;
};

const statusBadgeClass: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-indigo-100 text-indigo-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  missed: "bg-amber-100 text-amber-700",
  locked: "bg-slate-300 text-slate-800",
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

const normalizeSubmissionField = (value?: string | null) => (value || "").trim();

const formatSubmissionField = (value?: string | null) => {
  const normalized = normalizeSubmissionField(value);
  return normalized || "-";
};

export default function ProgressPage() {
  const [activeSection, setActiveSection] = useState<"progress" | "submission" | "task">("progress");
  const [projects, setProjects] = useState<StudentProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [weeks, setWeeks] = useState<TrackerWeek[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<WeekSubmission[]>([]);
  const [reviews, setReviews] = useState<WeekReview[]>([]);
  const [tasks, setTasks] = useState<TrackerTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [taskSaving, setTaskSaving] = useState(false);
  const [draftSaveStatus, setDraftSaveStatus] = useState<"idle" | "saving" | "saved" | "retrying" | "error">("idle");
  const [draftSaveError, setDraftSaveError] = useState<string>("");
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [form, setForm] = useState({
    summaryOfWork: "",
    blockers: "",
    nextWeekPlan: "",
    githubLinkSnapshot: "",
  });
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "medium" as TrackerTaskPriority,
    assignedToUserKey: "",
  });
  const [taskFilters, setTaskFilters] = useState<{
    status: "all" | TrackerTaskStatus;
    weekId: "all" | number;
    assignedTo: "all" | string;
  }>({
    status: "all",
    weekId: "all",
    assignedTo: "all",
  });
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  // file upload
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  // week detail modal
  const [weekDetailOpen, setWeekDetailOpen] = useState(false);
  const [weekDetailWeekId, setWeekDetailWeekId] = useState<number | null>(null);
  const [weekDetailLoading, setWeekDetailLoading] = useState(false);
  const [weekDetailSubmissions, setWeekDetailSubmissions] = useState<WeekSubmission[]>([]);
  const [weekDetailFiles, setWeekDetailFiles] = useState<Record<number, SubmissionFile[]>>({});
  const [weekDetailReviews, setWeekDetailReviews] = useState<WeekReview[]>([]);
  const draftHydratedWeekIdRef = useRef<number | null>(null);
  const lastSavedDraftRef = useRef<string>("");
  const draftRetryTimerRef = useRef<number | null>(null);

  const selectedWeek = useMemo(
    () => weeks.find((w) => w.week_id === selectedWeekId) || null,
    [weeks, selectedWeekId]
  );

  const weekCounts = useMemo(() => {
    const base = {
      total: weeks.length,
      pending: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
      lockedOrMissed: 0,
    };

    for (const week of weeks) {
      if (week.status === "pending") base.pending += 1;
      if (week.status === "submitted" || week.status === "under_review") base.submitted += 1;
      if (week.status === "approved") base.approved += 1;
      if (week.status === "rejected") base.rejected += 1;
      if (week.status === "locked" || week.status === "missed") base.lockedOrMissed += 1;
    }

    return base;
  }, [weeks]);

  const lateWeeks = useMemo(
    () =>
      weeks.filter(
        (w) =>
          w.status === "pending" &&
          w.deadline_at != null &&
          new Date(w.deadline_at) < new Date()
      ).length,
    [weeks]
  );

  const approvalPct = useMemo(
    () =>
      weekCounts.total > 0
        ? Math.round((weekCounts.approved / weekCounts.total) * 100)
        : 0,
    [weekCounts]
  );

  const revisionDiff = useMemo(() => {
    if (submissions.length < 2) return null;

    const latest = submissions[0];
    const previous = submissions[1];

    const fields: Array<{ key: "summary_of_work" | "blockers" | "next_week_plan" | "github_link_snapshot"; label: string; current: string; previous: string }> = [
      {
        key: "summary_of_work",
        label: "Summary of Work",
        current: normalizeSubmissionField(latest.summary_of_work),
        previous: normalizeSubmissionField(previous.summary_of_work),
      },
      {
        key: "blockers",
        label: "Blockers",
        current: normalizeSubmissionField(latest.blockers),
        previous: normalizeSubmissionField(previous.blockers),
      },
      {
        key: "next_week_plan",
        label: "Next Week Plan",
        current: normalizeSubmissionField(latest.next_week_plan),
        previous: normalizeSubmissionField(previous.next_week_plan),
      },
      {
        key: "github_link_snapshot",
        label: "GitHub Link",
        current: normalizeSubmissionField(latest.github_link_snapshot),
        previous: normalizeSubmissionField(previous.github_link_snapshot),
      },
    ];

    const changes = fields.filter((field) => field.current !== field.previous);

    return {
      latest,
      previous,
      changes,
    };
  }, [submissions]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await getMyProjects();
        const list = (res.projects || []) as StudentProject[];
        setProjects(list);

        if (list.length > 0) {
          setSelectedProjectId(String(list[0].project_id));
        }
      } catch {
        setError("Failed to load your projects");
      }
    };

    void loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;

    const loadWeeksAndTasks = async () => {
      try {
        setLoading(true);
        setError("");
        const [weekData, taskData, projectDetail] = await Promise.all([
          getProjectWeeks(selectedProjectId),
          getProjectTasks(selectedProjectId, {
            status: taskFilters.status === "all" ? undefined : taskFilters.status,
            weekId: taskFilters.weekId === "all" ? undefined : taskFilters.weekId,
            assignedTo: taskFilters.assignedTo === "all" ? undefined : taskFilters.assignedTo,
          }),
          getProjectDetail(selectedProjectId),
        ]);
        setWeeks(weekData);
        setTasks(taskData);
        setTeamMembers(projectDetail?.team?.members || []);
        setSelectedWeekId(weekData.length ? weekData[0].week_id : null);
      } catch {
        setError("Failed to load tracker data");
      } finally {
        setLoading(false);
      }
    };

    void loadWeeksAndTasks();
  }, [selectedProjectId, taskFilters.status, taskFilters.weekId, taskFilters.assignedTo]);

  useEffect(() => {
    if (!selectedWeekId) {
      setSubmissions([]);
      setReviews([]);
      return;
    }

    const loadWeekDetails = async () => {
      try {
        const [submissionData, reviewData] = await Promise.all([
          getWeekSubmissions(selectedWeekId),
          getWeekReviews(selectedWeekId),
        ]);

        setSubmissions(submissionData);
        setReviews(reviewData);
      } catch {
        setError("Failed to load week details");
      }
    };

    void loadWeekDetails();
  }, [selectedWeekId]);

  useEffect(() => {
    if (!selectedWeek) {
      setForm({ summaryOfWork: "", blockers: "", nextWeekPlan: "", githubLinkSnapshot: "" });
      setDraftSavedAt(null);
      setDraftSaveStatus("idle");
      setDraftSaveError("");
      draftHydratedWeekIdRef.current = null;
      lastSavedDraftRef.current = "";
      return;
    }

    const isEditableWeek = selectedWeek.status === "pending" || selectedWeek.status === "rejected";
    if (!isEditableWeek) {
      setDraftSavedAt(null);
      setDraftSaveStatus("idle");
      setDraftSaveError("");
      draftHydratedWeekIdRef.current = selectedWeek.week_id;
      lastSavedDraftRef.current = "";
      return;
    }

    const loadDraft = async () => {
      try {
        const draft = await getWeekDraft(selectedWeek.week_id);
        const nextForm = {
          summaryOfWork: draft?.draft_data?.summaryOfWork || "",
          blockers: draft?.draft_data?.blockers || "",
          nextWeekPlan: draft?.draft_data?.nextWeekPlan || "",
          githubLinkSnapshot: draft?.draft_data?.githubLinkSnapshot || "",
        };

        setForm(nextForm);
        setDraftSavedAt(draft?.saved_at || null);
        setDraftSaveStatus(draft?.saved_at ? "saved" : "idle");
        setDraftSaveError("");
        draftHydratedWeekIdRef.current = selectedWeek.week_id;
        lastSavedDraftRef.current = JSON.stringify(nextForm);
      } catch {
        setDraftSavedAt(null);
        setDraftSaveStatus("idle");
        setDraftSaveError("");
        draftHydratedWeekIdRef.current = selectedWeek.week_id;
        lastSavedDraftRef.current = "";
      }
    };

    void loadDraft();
  }, [selectedWeek]);

  useEffect(() => {
    if (!selectedWeek) return;

    const isEditableWeek = selectedWeek.status === "pending" || selectedWeek.status === "rejected";
    if (!isEditableWeek) return;
    if (draftHydratedWeekIdRef.current !== selectedWeek.week_id) return;

    const payload = {
      summaryOfWork: form.summaryOfWork,
      blockers: form.blockers,
      nextWeekPlan: form.nextWeekPlan,
      githubLinkSnapshot: form.githubLinkSnapshot,
    };
    const serialized = JSON.stringify(payload);

    if (serialized === lastSavedDraftRef.current) return;

    setDraftSaveStatus("saving");
    setDraftSaveError("");

    if (draftRetryTimerRef.current) {
      window.clearTimeout(draftRetryTimerRef.current);
      draftRetryTimerRef.current = null;
    }

    let cancelled = false;

    const persistDraft = async (attempt = 0) => {
      try {
        const draft = await saveWeekDraft(selectedWeek.week_id, payload);
        if (cancelled) return;

        lastSavedDraftRef.current = serialized;
        setDraftSavedAt(draft?.saved_at || new Date().toISOString());
        setDraftSaveStatus("saved");
        setDraftSaveError("");
      } catch {
        if (cancelled) return;

        if (attempt < 1) {
          setDraftSaveStatus("retrying");
          draftRetryTimerRef.current = window.setTimeout(() => {
            void persistDraft(attempt + 1);
          }, 2000);
          return;
        }

        setDraftSaveStatus("error");
        setDraftSaveError("Autosave failed. Please retry.");
      }
    };

    const timer = window.setTimeout(async () => {
      await persistDraft(0);
    }, 3000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (draftRetryTimerRef.current) {
        window.clearTimeout(draftRetryTimerRef.current);
        draftRetryTimerRef.current = null;
      }
    };
  }, [form, selectedWeek]);

  const retryDraftSave = async () => {
    if (!selectedWeek) return;

    const payload = {
      summaryOfWork: form.summaryOfWork,
      blockers: form.blockers,
      nextWeekPlan: form.nextWeekPlan,
      githubLinkSnapshot: form.githubLinkSnapshot,
    };

    try {
      setDraftSaveStatus("saving");
      setDraftSaveError("");
      const draft = await saveWeekDraft(selectedWeek.week_id, payload);
      lastSavedDraftRef.current = JSON.stringify(payload);
      setDraftSavedAt(draft?.saved_at || new Date().toISOString());
      setDraftSaveStatus("saved");
    } catch {
      setDraftSaveStatus("error");
      setDraftSaveError("Autosave failed. Please retry.");
    }
  };

  const openWeekDetail = async (weekId: number) => {
    setWeekDetailOpen(true);
    setWeekDetailWeekId(weekId);
    setWeekDetailLoading(true);
    setWeekDetailSubmissions([]);
    setWeekDetailFiles({});
    setWeekDetailReviews([]);
    try {
      const [subs, revs] = await Promise.all([
        getWeekSubmissions(weekId),
        getWeekReviews(weekId),
      ]);
      setWeekDetailSubmissions(subs);
      setWeekDetailReviews(revs);
      const filesMap: Record<number, SubmissionFile[]> = {};
      await Promise.all(
        subs.map(async (sub) => {
          try {
            filesMap[sub.submission_id] = await getSubmissionFiles(sub.submission_id);
          } catch {
            filesMap[sub.submission_id] = [];
          }
        })
      );
      setWeekDetailFiles(filesMap);
    } catch {
      // show empty state on error
    } finally {
      setWeekDetailLoading(false);
    }
  };

  const submitWeek = async () => {
    if (!selectedWeek) {
      setError("Select a week first");
      return;
    }

    if (!form.summaryOfWork.trim()) {
      setError("Summary of work is required");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      let newSubmission: WeekSubmission | undefined;

      const payload = {
        summaryOfWork: form.summaryOfWork.trim(),
        blockers: form.blockers.trim(),
        nextWeekPlan: form.nextWeekPlan.trim(),
        githubLinkSnapshot: form.githubLinkSnapshot.trim(),
      };

      if (selectedWeek.status === "rejected") {
        newSubmission = await resubmitWeeklySubmission(selectedWeek.week_id, payload);
      } else {
        newSubmission = await createWeeklySubmission(selectedWeek.week_id, payload);
      }

      // Upload queued files and attach to the new submission
      if (uploadFiles.length > 0 && newSubmission?.submission_id) {
        setUploadingFiles(true);
        try {
          for (const file of uploadFiles) {
            const uploaded = await uploadTrackerFile(file);
            await attachSubmissionFile(newSubmission.submission_id, {
              fileName: uploaded.fileName,
              fileUrl: uploaded.fileUrl,
              mimeType: uploaded.mimeType,
              fileSizeBytes: uploaded.fileSizeBytes,
            });
          }
        } catch {
          // file upload failure is non-blocking
        } finally {
          setUploadingFiles(false);
        }
        setUploadFiles([]);
      }

      const [weekData, submissionData, reviewData] = await Promise.all([
        getProjectWeeks(selectedProjectId),
        getWeekSubmissions(selectedWeek.week_id),
        getWeekReviews(selectedWeek.week_id),
      ]);

      setWeeks(weekData);
      setSubmissions(submissionData);
      setReviews(reviewData);
      setSuccess(selectedWeek.status === "rejected" ? "Week resubmitted successfully" : "Week submitted successfully");
      setForm({ summaryOfWork: "", blockers: "", nextWeekPlan: "", githubLinkSnapshot: "" });
      setDraftSavedAt(null);
      lastSavedDraftRef.current = "";
    } catch (e: unknown) {
      const message =
        typeof e === "object" &&
        e !== null &&
        "response" in e &&
        typeof (e as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Unable to submit this week";
      setError(message ?? "Unable to submit this week");
    } finally {
      setSaving(false);
    }
  };

  const createTask = async () => {
    if (!selectedProjectId) {
      setError("Select project first");
      return;
    }

    if (!taskForm.title.trim()) {
      setError("Task title is required");
      return;
    }

    try {
      setTaskSaving(true);
      setError("");
      setSuccess("");

      await createProjectTask(selectedProjectId, {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        priority: taskForm.priority,
        weekId: selectedWeekId || undefined,
        assignedToUserKey: taskForm.assignedToUserKey || undefined,
      });

      const taskData = await getProjectTasks(selectedProjectId, {
        status: taskFilters.status === "all" ? undefined : taskFilters.status,
        weekId: taskFilters.weekId === "all" ? undefined : taskFilters.weekId,
        assignedTo: taskFilters.assignedTo === "all" ? undefined : taskFilters.assignedTo,
      });
      setTasks(taskData);
      setTaskForm({ title: "", description: "", priority: "medium", assignedToUserKey: "" });
      setSuccess("Task created successfully");
    } catch (e: unknown) {
      const message =
        typeof e === "object" &&
        e !== null &&
        "response" in e &&
        typeof (e as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Unable to create task";
      setError(message ?? "Unable to create task");
    } finally {
      setTaskSaving(false);
    }
  };

  const moveTask = async (taskId: number, status: TrackerTaskStatus) => {
    if (!selectedProjectId) return;

    try {
      setError("");
      await updateProjectTaskStatus(taskId, status);
      const taskData = await getProjectTasks(selectedProjectId, {
        status: taskFilters.status === "all" ? undefined : taskFilters.status,
        weekId: taskFilters.weekId === "all" ? undefined : taskFilters.weekId,
        assignedTo: taskFilters.assignedTo === "all" ? undefined : taskFilters.assignedTo,
      });
      setTasks(taskData);
    } catch (e: unknown) {
      const message =
        typeof e === "object" &&
        e !== null &&
        "response" in e &&
        typeof (e as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Unable to update task status";
      setError(message ?? "Unable to update task status");
    }
  };

  const taskColumns: Array<{ key: TrackerTaskStatus; title: string }> = [
    { key: "todo", title: "Todo" },
    { key: "in_progress", title: "In Progress" },
    { key: "review", title: "Review" },
    { key: "blocked", title: "Blocked" },
    { key: "done", title: "Done" },
  ];

  const nextMoves: Record<TrackerTaskStatus, TrackerTaskStatus[]> = {
    todo: ["in_progress"],
    in_progress: ["review", "blocked"],
    review: ["done", "in_progress"],
    blocked: ["in_progress"],
    done: [],
  };

  const getAssigneeLabel = (userKey: string | null) => {
    if (!userKey) return "Unassigned";
    const member = teamMembers.find((m) => m.enrollment_id === userKey);
    return member?.name || userKey;
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-200 text-slate-900">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar title="Student Tracker" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
              <div className="w-full md:w-auto">
                <h2 className="text-lg font-semibold mb-3">Project Tracker</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSection("progress")}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      activeSection === "progress"
                        ? "bg-blue-600 text-white"
                        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection("submission")}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      activeSection === "submission"
                        ? "bg-blue-600 text-white"
                        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Weekly Submission
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection("task")}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      activeSection === "task"
                        ? "bg-blue-600 text-white"
                        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Task Assign
                  </button>
                </div>
              </div>

              <div className="w-full md:w-96">
                <label className="block text-xs font-medium text-slate-600 mb-1">Select Project</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  {projects.map((project) => (
                    <option key={project.project_id} value={project.project_id}>
                      {project.title || project.project_id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <SummaryCard label="Total" value={weekCounts.total} />
            <SummaryCard label="Pending" value={weekCounts.pending} />
            <SummaryCard label="Submitted" value={weekCounts.submitted} />
            <SummaryCard label="Approved" value={weekCounts.approved} />
            <SummaryCard label="Rejected" value={weekCounts.rejected} />
            <SummaryCard label="Locked/Missed" value={weekCounts.lockedOrMissed} />
          </section>

          {error && <div className="rounded-xl bg-rose-100 px-4 py-3 text-sm text-rose-700">{error}</div>}
          {success && <div className="rounded-xl bg-emerald-100 px-4 py-3 text-sm text-emerald-700">{success}</div>}

          {activeSection === "submission" ? (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold">Project Weeks</h3>
                <span className="text-xs text-slate-500">Click a week to inspect details</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left px-4 py-2">Week</th>
                      <th className="text-left px-4 py-2">Phase</th>
                      <th className="text-left px-4 py-2">Deadline</th>
                      <th className="text-left px-4 py-2">Status</th>
                      <th className="text-left px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Loading weeks...</td>
                      </tr>
                    ) : weeks.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No weeks found. Ask admin to bootstrap tracker weeks.</td>
                      </tr>
                    ) : (
                      weeks.map((week) => (
                        <tr
                          key={week.week_id}
                          className={`border-t border-slate-100 cursor-pointer ${selectedWeekId === week.week_id ? "bg-blue-50" : "hover:bg-slate-50"}`}
                          onClick={() => {
                            setSelectedWeekId(week.week_id);
                            setError("");
                            setSuccess("");
                          }}
                        >
                          <td className="px-4 py-2 font-medium">Week {week.week_number}</td>
                          <td className="px-4 py-2">{week.phase_name || "-"}</td>
                          <td className="px-4 py-2">{formatDate(week.deadline_at)}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass[week.status] || statusBadgeClass.pending}`}>
                              {week.status}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); void openWeekDetail(week.week_id); }}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
              <h3 className="font-semibold">Submit Update</h3>
              <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                <p>
                  {selectedWeek
                    ? `Week ${selectedWeek.week_number} (${selectedWeek.status})`
                    : "Select a week to submit"}
                </p>
                {selectedWeek && (selectedWeek.status === "pending" || selectedWeek.status === "rejected") ? (
                  <span className="text-right">
                    {draftSaveStatus === "saving"
                      ? "Saving draft..."
                      : draftSaveStatus === "retrying"
                      ? "Retrying autosave..."
                      : draftSaveStatus === "error"
                      ? "Autosave failed"
                      : draftSavedAt
                      ? `Draft saved ${new Date(draftSavedAt).toLocaleTimeString()}`
                      : "Draft not saved yet"}
                  </span>
                ) : null}
              </div>

              {draftSaveStatus === "error" ? (
                <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <span>{draftSaveError || "Autosave failed."}</span>
                  <button
                    type="button"
                    onClick={() => void retryDraftSave()}
                    className="font-semibold text-amber-900 underline underline-offset-2"
                  >
                    Retry now
                  </button>
                </div>
              ) : null}

              <textarea
                value={form.summaryOfWork}
                onChange={(e) => setForm((s) => ({ ...s, summaryOfWork: e.target.value }))}
                placeholder="Summary of work"
                className="w-full min-h-20 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
              <textarea
                value={form.blockers}
                onChange={(e) => setForm((s) => ({ ...s, blockers: e.target.value }))}
                placeholder="Blockers (optional)"
                className="w-full min-h-16 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
              <textarea
                value={form.nextWeekPlan}
                onChange={(e) => setForm((s) => ({ ...s, nextWeekPlan: e.target.value }))}
                placeholder="Next week plan"
                className="w-full min-h-16 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
              <input
                value={form.githubLinkSnapshot}
                onChange={(e) => setForm((s) => ({ ...s, githubLinkSnapshot: e.target.value }))}
                placeholder="GitHub PR/commit link (optional)"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />

              {/* File upload */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">Attach Files <span className="font-normal text-slate-400">(PDF, PPT, DOC, images — max 20 MB)</span></label>
                <input
                  type="file"
                  id="week-file-upload"
                  multiple
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt"
                  className="sr-only"
                  disabled={!selectedWeek || (selectedWeek.status !== "pending" && selectedWeek.status !== "rejected")}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    setUploadFiles((prev) => [...prev, ...files]);
                    e.target.value = "";
                  }}
                />
                <label
                  htmlFor="week-file-upload"
                  className={`flex items-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm transition ${
                    selectedWeek && (selectedWeek.status === "pending" || selectedWeek.status === "rejected")
                      ? "cursor-pointer border-blue-300 text-blue-600 hover:bg-blue-50"
                      : "cursor-not-allowed border-slate-200 text-slate-400"
                  }`}
                >
                  <span>📎</span>
                  <span>Click to attach files</span>
                </label>
                {uploadFiles.length > 0 && (
                  <div className="space-y-1.5">
                    {uploadFiles.map((file, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                        <span className="text-xs text-slate-700 truncate max-w-[9rem]">{file.name}</span>
                        <span className="mx-2 text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</span>
                        <button
                          type="button"
                          onClick={() => setUploadFiles((prev) => prev.filter((_, j) => j !== i))}
                          className="text-xs text-rose-500 hover:text-rose-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={submitWeek}
                disabled={!selectedWeek || saving || uploadingFiles}
                className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {uploadingFiles
                  ? "Uploading files..."
                  : saving
                  ? "Submitting..."
                  : selectedWeek?.status === "rejected"
                  ? "Resubmit Week"
                  : "Submit Week"}
              </button>
            </div>
          </section>
          ) : null}

          {activeSection === "progress" ? (
          <>
          {/* ── Progress Overview Panel ─────────────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-900">Progress Overview</h3>
              <span className="text-xs text-slate-400">Click any week square to view details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Donut chart + badges */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-28 h-28">
                  <div
                    className="w-28 h-28 rounded-full"
                    style={{ background: `conic-gradient(#10b981 ${approvalPct * 3.6}deg, #f1f5f9 0deg)` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[4.5rem] h-[4.5rem] bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                      <span className="text-xl font-bold text-slate-900">{approvalPct}%</span>
                      <span className="text-[10px] text-slate-500">approved</span>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-800">{weekCounts.approved} / {weekCounts.total} Weeks</p>
                  <p className="text-xs text-slate-500">approved by mentor</p>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                  {lateWeeks > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      ⏰ {lateWeeks} Late
                    </span>
                  )}
                  {weekCounts.lockedOrMissed > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      🔒 {weekCounts.lockedOrMissed} Locked
                    </span>
                  )}
                  {weekCounts.rejected > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                      ✗ {weekCounts.rejected} Rejected
                    </span>
                  )}
                </div>
              </div>

              {/* Status breakdown bars */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Status Breakdown</h4>
                {[
                  { label: "Approved", count: weekCounts.approved, bg: "bg-emerald-500" },
                  { label: "Submitted", count: weekCounts.submitted, bg: "bg-blue-500" },
                  { label: "Pending", count: weekCounts.pending, bg: "bg-slate-400" },
                  { label: "Rejected", count: weekCounts.rejected, bg: "bg-rose-500" },
                  { label: "Locked/Missed", count: weekCounts.lockedOrMissed, bg: "bg-slate-600" },
                ].map(({ label, count, bg }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{label}</span>
                      <span className="font-semibold text-slate-800">{count}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${bg} rounded-full transition-all duration-700`}
                        style={{ width: `${weekCounts.total > 0 ? Math.round((count / weekCounts.total) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Week grid (GitHub-contribution style) */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Week Timeline</h4>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {weeks.map((week) => {
                    const dotColor: Record<string, string> = {
                      pending: "bg-slate-300 border-slate-400",
                      submitted: "bg-blue-400 border-blue-500",
                      under_review: "bg-indigo-500 border-indigo-600",
                      approved: "bg-emerald-500 border-emerald-600",
                      rejected: "bg-rose-500 border-rose-600",
                      missed: "bg-amber-400 border-amber-500",
                      locked: "bg-slate-600 border-slate-700",
                    };
                    return (
                      <button
                        key={week.week_id}
                        type="button"
                        title={`Week ${week.week_number}: ${week.status}`}
                        onClick={() => void openWeekDetail(week.week_id)}
                        className={`w-7 h-7 rounded-md border text-[10px] font-bold text-white hover:scale-110 transition-transform ${dotColor[week.status] ?? "bg-slate-200 border-slate-300"}`}
                      >
                        {week.week_number}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                  {[
                    { color: "bg-slate-300", label: "Pending" },
                    { color: "bg-blue-400", label: "Submitted" },
                    { color: "bg-emerald-500", label: "Approved" },
                    { color: "bg-rose-500", label: "Rejected" },
                    { color: "bg-slate-600", label: "Locked" },
                  ].map(({ color, label }) => (
                    <span key={label} className="flex items-center gap-1">
                      <span className={`w-3 h-3 rounded-sm inline-block ${color}`} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── Revisions + Reviews ─────────────────────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold">Submission Revisions</h3>
                <span className="text-xs text-slate-500">Latest first</span>
              </div>

              {revisionDiff ? (
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Comparing Revision #{revisionDiff.latest.revision_no} vs #{revisionDiff.previous.revision_no}
                    </span>
                    <span>{revisionDiff.changes.length} changed field(s)</span>
                  </div>

                  {revisionDiff.changes.length === 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                      No field-level changes between latest and previous revision.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {revisionDiff.changes.map((change) => (
                        <div key={change.key} className="rounded-lg border border-blue-200 bg-white p-3">
                          <div className="mb-2 text-xs font-semibold text-blue-700">{change.label}</div>
                          <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
                            <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
                              <div className="mb-1 font-medium text-slate-500">Previous</div>
                              <div className="whitespace-pre-wrap text-slate-700">{formatSubmissionField(change.previous)}</div>
                            </div>
                            <div className="rounded-md border border-blue-200 bg-blue-50 p-2">
                              <div className="mb-1 font-medium text-blue-700">Current</div>
                              <div className="whitespace-pre-wrap text-slate-800">{formatSubmissionField(change.current)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : submissions.length === 1 ? (
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Diff will appear after the next revision is submitted.
                </div>
              ) : null}

              <div className="divide-y divide-slate-100">
                {submissions.length === 0 ? (
                  <div className="px-4 py-8 text-sm text-slate-500">No submissions for selected week yet.</div>
                ) : (
                  submissions.map((sub) => (
                    <div key={sub.submission_id} className="px-4 py-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Revision #{sub.revision_no}</span>
                        <span>{formatDate(sub.submitted_at)}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-800">{sub.summary_of_work}</p>
                      {sub.github_link_snapshot && (
                        <a
                          className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                          href={sub.github_link_snapshot}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View GitHub reference
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold">Mentor Reviews</h3>
                <span className="text-xs text-slate-500">Per selected week</span>
              </div>

              <div className="divide-y divide-slate-100">
                {reviews.length === 0 ? (
                  <div className="px-4 py-8 text-sm text-slate-500">No reviews yet.</div>
                ) : (
                  reviews.map((review) => (
                    <div key={review.review_id} className="px-4 py-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className={`inline-flex rounded-full px-2 py-1 font-semibold ${review.action === "approve" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                          {review.action}
                        </span>
                        <span>{formatDate(review.reviewed_at)}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{review.review_comment || "No comment"}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
          </>
          ) : null}

          {activeSection === "task" ? (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 space-y-4 pb-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Project Tasks (Kanban)</h3>
              <span className="text-xs text-slate-500">Live tracker task board</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                value={taskFilters.status}
                onChange={(e) =>
                  setTaskFilters((prev) => ({
                    ...prev,
                    status: e.target.value as "all" | TrackerTaskStatus,
                  }))
                }
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>

              <select
                value={taskFilters.weekId === "all" ? "all" : String(taskFilters.weekId)}
                onChange={(e) =>
                  setTaskFilters((prev) => ({
                    ...prev,
                    weekId: e.target.value === "all" ? "all" : Number(e.target.value),
                  }))
                }
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="all">All Weeks</option>
                {weeks.map((week) => (
                  <option key={week.week_id} value={String(week.week_id)}>
                    Week {week.week_number}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setTaskFilters({ status: "all", weekId: "all", assignedTo: "all" })}
                className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Reset Filters
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                value={taskFilters.assignedTo}
                onChange={(e) =>
                  setTaskFilters((prev) => ({
                    ...prev,
                    assignedTo: e.target.value === "all" ? "all" : e.target.value,
                  }))
                }
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="all">All Assignees</option>
                {teamMembers.map((member) => (
                  <option key={member.enrollment_id} value={member.enrollment_id}>
                    {member.name || member.enrollment_id}
                  </option>
                ))}
              </select>
              <div className="md:col-span-2 text-xs text-slate-500 flex items-center px-1">
                Filter tasks by assignee using your team members.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <input
                value={taskForm.title}
                onChange={(e) => setTaskForm((s) => ({ ...s, title: e.target.value }))}
                placeholder="Task title"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
              <input
                value={taskForm.description}
                onChange={(e) => setTaskForm((s) => ({ ...s, description: e.target.value }))}
                placeholder="Description (optional)"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm((s) => ({ ...s, priority: e.target.value as TrackerTaskPriority }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <select
                value={taskForm.assignedToUserKey}
                onChange={(e) => setTaskForm((s) => ({ ...s, assignedToUserKey: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((member) => (
                  <option key={member.enrollment_id} value={member.enrollment_id}>
                    {member.name || member.enrollment_id}
                  </option>
                ))}
              </select>
              <button
                onClick={createTask}
                disabled={taskSaving}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {taskSaving ? "Adding..." : "Add Task"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              {taskColumns.map((column) => {
                const colTasks = tasks.filter((t) => t.status === column.key);
                return (
                  <div key={column.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3 min-h-52">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-700">{column.title}</h4>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 border border-slate-200">{colTasks.length}</span>
                    </div>

                    <div className="space-y-2">
                      {colTasks.length === 0 ? (
                        <p className="text-xs text-slate-400">No tasks</p>
                      ) : (
                        colTasks.map((task) => (
                          <div key={task.task_id} className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
                            <div className="text-sm font-medium text-slate-800">{task.title}</div>
                            {task.description && <p className="text-xs text-slate-500 line-clamp-2">{task.description}</p>}
                            <div className="text-[11px] text-slate-500">Priority: {task.priority}</div>
                            <div className="text-[11px] text-slate-500">
                              Assignee: {getAssigneeLabel(task.assigned_to_user_key)}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {nextMoves[task.status].map((nextStatus) => (
                                <button
                                  key={nextStatus}
                                  onClick={() => moveTask(task.task_id, nextStatus)}
                                  className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
                                >
                                  {nextStatus}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          ) : null}
        </main>
      </div>

      {weekDetailOpen && (
        <WeekDetailModal
          week={weeks.find((w) => w.week_id === weekDetailWeekId) ?? null}
          submissions={weekDetailSubmissions}
          filesMap={weekDetailFiles}
          reviews={weekDetailReviews}
          loading={weekDetailLoading}
          onClose={() => setWeekDetailOpen(false)}
        />
      )}
    </div>
  );
}

function WeekDetailModal({
  week,
  submissions,
  filesMap,
  reviews,
  loading,
  onClose,
}: {
  week: TrackerWeek | null;
  submissions: WeekSubmission[];
  filesMap: Record<number, SubmissionFile[]>;
  reviews: WeekReview[];
  loading: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"content" | "files" | "reviews">("content");

  if (!week) return null;

  const allFiles = submissions.flatMap((sub) => filesMap[sub.submission_id] ?? []);

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return "📎";
    if (mimeType === "application/pdf") return "📄";
    if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "📊";
    if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
    if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "📈";
    if (mimeType.startsWith("image/")) return "🖼️";
    return "📎";
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-slate-900">Week {week.week_number}</span>
            {week.phase_name && <span className="text-sm text-slate-500">{week.phase_name}</span>}
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass[week.status] ?? statusBadgeClass.pending}`}>
              {week.status}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl font-bold leading-none"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="px-5 py-16 text-center text-slate-500 text-sm">Loading week details...</div>
        ) : (
          <>
            {week.deadline_at && (
              <div className="px-5 pt-3 pb-1 text-xs text-slate-500">
                Deadline:{" "}
                <span className="font-medium text-slate-700">
                  {new Date(week.deadline_at).toLocaleString()}
                </span>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 px-5 pt-3 pb-1">
              {(["content", "files", "reviews"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    activeTab === tab ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab === "content"
                    ? `Submission (${submissions.length})`
                    : tab === "files"
                    ? `Files (${allFiles.length})`
                    : `Reviews (${reviews.length})`}
                </button>
              ))}
            </div>

            <div className="px-5 py-4">
              {/* ── Submission Content Tab */}
              {activeTab === "content" && (
                <div className="space-y-4">
                  {submissions.length === 0 ? (
                    <div className="py-10 text-center text-sm text-slate-500">No submissions yet for this week.</div>
                  ) : (
                    submissions.map((sub) => (
                      <div key={sub.submission_id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">Revision #{sub.revision_no}</span>
                          <span>{new Date(sub.submitted_at).toLocaleString()}</span>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Summary of Work</div>
                          <p className="text-sm text-slate-800 whitespace-pre-wrap">{sub.summary_of_work || "—"}</p>
                        </div>
                        {sub.blockers && (
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-rose-500 mb-1">Blockers</div>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{sub.blockers}</p>
                          </div>
                        )}
                        {sub.next_week_plan && (
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-indigo-500 mb-1">Next Week Plan</div>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{sub.next_week_plan}</p>
                          </div>
                        )}
                        {sub.github_link_snapshot && (
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">GitHub Reference</div>
                            <a
                              href={sub.github_link_snapshot}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-blue-600 hover:underline break-all"
                            >
                              {sub.github_link_snapshot}
                            </a>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── Files Tab */}
              {activeTab === "files" && (
                <div className="space-y-2">
                  {allFiles.length === 0 ? (
                    <div className="py-10 text-center text-sm text-slate-500">No files attached to this week&apos;s submissions.</div>
                  ) : (
                    allFiles.map((file) => (
                      <div
                        key={file.file_id}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <span className="text-2xl">{getFileIcon(file.mime_type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{file.file_name}</div>
                          <div className="text-xs text-slate-500">
                            {file.mime_type ?? "Unknown type"} · {formatFileSize(file.file_size_bytes)}
                          </div>
                          <div className="text-xs text-slate-400">
                            Uploaded {new Date(file.uploaded_at).toLocaleString()}
                          </div>
                        </div>
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noreferrer"
                          download={file.file_name}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 whitespace-nowrap"
                        >
                          Download
                        </a>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── Reviews Tab */}
              {activeTab === "reviews" && (
                <div className="space-y-3">
                  {reviews.length === 0 ? (
                    <div className="py-10 text-center text-sm text-slate-500">No mentor reviews yet.</div>
                  ) : (
                    reviews.map((review) => (
                      <div key={review.review_id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              review.action === "approve"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {review.action === "approve" ? "✓ Approved" : "✗ Rejected"}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(review.reviewed_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                          {review.review_comment ?? "No comment provided."}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
