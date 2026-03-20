"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "@/lib/axios";
import {
  getMentorReviewQueue,
  getMentorTrackerDashboard,
  getProjectTasks,
  getProjectWeeks,
  type MentorQueueItem,
  type MentorTrackerDashboardStats,
  type TrackerTask,
  type TrackerWeek,
} from "@/services/tracker.service";
import GrowthRateChart from "@/components/charts/GrowthRateChart";
import WeeklySubmissionChart from "@/components/charts/WeeklySubmissionChart";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FolderKanban,
  ListChecks,
} from "lucide-react";

type MentorProject = {
  project_id: string | number;
  title: string;
  status: string;
};

type AggregatedMetrics = {
  totalWeeks: number;
  pendingWeeks: number;
  submittedWeeks: number;
  approvedWeeks: number;
  rejectedWeeks: number;
  missedWeeks: number;
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  reviewTasks: number;
  blockedTasks: number;
  doneTasks: number;
};

type WeekTrendRow = {
  weekNumber: number;
  pending: number;
  submitted: number;
  approved: number;
  rejected: number;
  missedOrLocked: number;
};

const initialDashboardStats: MentorTrackerDashboardStats = {
  assigned_projects: 0,
  review_queue: 0,
  risk_alert_projects: 0,
  approved_weeks: 0,
};

const toAggregates = (weeks: TrackerWeek[], tasks: TrackerTask[]): AggregatedMetrics => ({
  totalWeeks: weeks.length,
  pendingWeeks: weeks.filter((w) => w.status === "pending").length,
  submittedWeeks: weeks.filter((w) => w.status === "submitted" || w.status === "under_review").length,
  approvedWeeks: weeks.filter((w) => w.status === "approved").length,
  rejectedWeeks: weeks.filter((w) => w.status === "rejected").length,
  missedWeeks: weeks.filter((w) => w.status === "missed" || w.status === "locked").length,
  totalTasks: tasks.length,
  todoTasks: tasks.filter((t) => t.status === "todo").length,
  inProgressTasks: tasks.filter((t) => t.status === "in_progress").length,
  reviewTasks: tasks.filter((t) => t.status === "review").length,
  blockedTasks: tasks.filter((t) => t.status === "blocked").length,
  doneTasks: tasks.filter((t) => t.status === "done").length,
});

const toWeekTrendRows = (weeks: TrackerWeek[]) => {
  const trendMap = new Map<number, WeekTrendRow>();

  for (const week of weeks) {
    const key = week.week_number;
    if (!trendMap.has(key)) {
      trendMap.set(key, {
        weekNumber: key,
        pending: 0,
        submitted: 0,
        approved: 0,
        rejected: 0,
        missedOrLocked: 0,
      });
    }

    const row = trendMap.get(key);
    if (!row) continue;

    if (week.status === "pending") row.pending += 1;
    if (week.status === "submitted" || week.status === "under_review") row.submitted += 1;
    if (week.status === "approved") row.approved += 1;
    if (week.status === "rejected") row.rejected += 1;
    if (week.status === "missed" || week.status === "locked") row.missedOrLocked += 1;
  }

  return Array.from(trendMap.values()).sort((a, b) => a.weekNumber - b.weekNumber);
};

type SectionKey = "progress" | "submission" | "task";

export default function MentorAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<SectionKey>("progress");
  const [projects, setProjects] = useState<MentorProject[]>([]);
  const [dashboardStats, setDashboardStats] = useState<MentorTrackerDashboardStats>(initialDashboardStats);
  const [reviewQueue, setReviewQueue] = useState<MentorQueueItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | "all">("all");
  const [weeksByProject, setWeeksByProject] = useState<Record<string, TrackerWeek[]>>({});
  const [tasksByProject, setTasksByProject] = useState<Record<string, TrackerTask[]>>({});

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        const [projectsRes, trackerStats] = await Promise.all([
          axios.get("/project/mentor/assigned"),
          getMentorTrackerDashboard(),
        ]);

        const mentorProjects: MentorProject[] = projectsRes.data?.projects || [];
        const projectIds = mentorProjects.map((p) => String(p.project_id));

        setProjects(mentorProjects);
        setDashboardStats(trackerStats);

        const [queueRes, weeksByProjectRes, tasksByProjectRes] = await Promise.all([
          getMentorReviewQueue({
            sortBy: "pending_age",
            order: "desc",
            page: 1,
            pageSize: 200,
          }),
          Promise.all(projectIds.map((id) => getProjectWeeks(id).catch(() => [] as TrackerWeek[]))),
          Promise.all(projectIds.map((id) => getProjectTasks(id).catch(() => [] as TrackerTask[]))),
        ]);

        setReviewQueue(queueRes.queue);

        const weeksMap: Record<string, TrackerWeek[]> = {};
        const tasksMap: Record<string, TrackerTask[]> = {};

        projectIds.forEach((projectId, index) => {
          weeksMap[projectId] = weeksByProjectRes[index] || [];
          tasksMap[projectId] = tasksByProjectRes[index] || [];
        });

        setWeeksByProject(weeksMap);
        setTasksByProject(tasksMap);
      } catch {
        setError("Failed to load mentor analytics");
      } finally {
        setLoading(false);
      }
    };

    void loadAnalytics();
  }, []);

  useEffect(() => {
    if (selectedProjectId === "all") return;
    const projectExists = projects.some((p) => String(p.project_id) === selectedProjectId);
    if (!projectExists) {
      setSelectedProjectId("all");
    }
  }, [projects, selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((project) => String(project.project_id) === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const allWeeks = useMemo(() => Object.values(weeksByProject).flat(), [weeksByProject]);
  const allTasks = useMemo(() => Object.values(tasksByProject).flat(), [tasksByProject]);

  const selectedProjectIds = useMemo(() => {
    if (selectedProjectId === "all") {
      return projects.map((project) => String(project.project_id));
    }
    return [selectedProjectId];
  }, [projects, selectedProjectId]);

  const filteredWeeks = useMemo(
    () => selectedProjectIds.flatMap((projectId) => weeksByProject[projectId] || []),
    [selectedProjectIds, weeksByProject]
  );

  const filteredTasks = useMemo(
    () => selectedProjectIds.flatMap((projectId) => tasksByProject[projectId] || []),
    [selectedProjectIds, tasksByProject]
  );

  const filteredAggregates = useMemo(
    () => toAggregates(filteredWeeks, filteredTasks),
    [filteredWeeks, filteredTasks]
  );

  const weekTrends = useMemo(() => toWeekTrendRows(filteredWeeks), [filteredWeeks]);

  const completionRate = useMemo(() => {
    if (filteredAggregates.totalWeeks === 0) return 0;
    return Math.round((filteredAggregates.approvedWeeks / filteredAggregates.totalWeeks) * 100);
  }, [filteredAggregates]);

  const projectProgressCards = useMemo(
    () =>
      projects.map((project) => {
        const projectId = String(project.project_id);
        const projectWeeks = weeksByProject[projectId] || [];
        const projectTasks = tasksByProject[projectId] || [];
        const metrics = toAggregates(projectWeeks, projectTasks);
        const completedPct =
          metrics.totalWeeks > 0 ? Math.round((metrics.approvedWeeks / metrics.totalWeeks) * 100) : 0;

        return {
          project,
          metrics,
          completedPct,
        };
      }),
    [projects, tasksByProject, weeksByProject]
  );

  const statusLabel = selectedProjectId === "all" ? "Overall" : selectedProject?.title || "Project";

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Progress Tracker</h1>
            <p className="text-slate-600 mt-1">
              Monitor project progress, weekly submissions, and tasks with mentor-ready insights.
            </p>
          </div>

          <div className="w-full lg:w-auto lg:min-w-95">
            <label className="text-xs font-semibold tracking-wide uppercase text-slate-500">Filter by project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value as string | "all")}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Overall Progress (All Projects)</option>
              {projects.map((project) => (
                <option key={project.project_id} value={String(project.project_id)}>
                  {project.title} ({project.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <SectionButton
            active={activeSection === "progress"}
            onClick={() => setActiveSection("progress")}
            label="Progress"
          />
          <SectionButton
            active={activeSection === "submission"}
            onClick={() => setActiveSection("submission")}
            label="Weekly Submission"
          />
          <SectionButton
            active={activeSection === "task"}
            onClick={() => setActiveSection("task")}
            label="Tasks"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-100 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
          Loading analytics...
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard
              title="Assigned Projects"
              value={selectedProjectId === "all" ? dashboardStats.assigned_projects : 1}
              subtitle={selectedProjectId === "all" ? "Mentor coverage" : "Current project"}
              icon={<BarChart3 className="h-5 w-5" />}
            />
            <MetricCard
              title="Review Queue"
              value={reviewQueue.length}
              subtitle="Needs review"
              icon={<ClipboardCheck className="h-5 w-5" />}
            />
            <MetricCard
              title="Completion"
              value={completionRate}
              subtitle="Approved completion %"
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <MetricCard
              title="Risk Alerts"
              value={selectedProjectId === "all" ? dashboardStats.risk_alert_projects : filteredAggregates.rejectedWeeks}
              subtitle={selectedProjectId === "all" ? "Medium/High risk" : "Rejected week entries"}
              icon={<AlertTriangle className="h-5 w-5" />}
            />
          </section>

          {activeSection === "progress" && (
            <>
              <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-slate-900">Progress Overview</h2>
                    <span className="text-sm font-medium text-slate-500">{statusLabel}</span>
                  </div>
                  <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-blue-500 to-emerald-500"
                      style={{ inlineSize: `${completionRate}%` }}
                    />
                  </div>
                  <div className="mt-3 text-sm text-slate-600">
                    Approved: <span className="font-semibold text-slate-900">{filteredAggregates.approvedWeeks}</span> / {" "}
                    {filteredAggregates.totalWeeks} tracked weeks
                  </div>

                  <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-3">
                    <MiniStat label="Pending" value={filteredAggregates.pendingWeeks} color="bg-slate-500" />
                    <MiniStat label="Submitted" value={filteredAggregates.submittedWeeks} color="bg-blue-500" />
                    <MiniStat label="Approved" value={filteredAggregates.approvedWeeks} color="bg-emerald-500" />
                    <MiniStat label="Rejected" value={filteredAggregates.rejectedWeeks} color="bg-rose-500" />
                    <MiniStat label="Missed/Locked" value={filteredAggregates.missedWeeks} color="bg-amber-500" />
                    <MiniStat label="Tasks" value={filteredAggregates.totalTasks} color="bg-indigo-500" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
                  <h2 className="font-semibold text-slate-900">Immediate Actions</h2>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-blue-600" />
                      {reviewQueue.length} weekly submissions pending review
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      {selectedProjectId === "all" ? dashboardStats.risk_alert_projects : filteredAggregates.rejectedWeeks} items need intervention
                    </li>
                    <li className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-indigo-600" />
                      {filteredAggregates.blockedTasks} blocked tasks in scope
                    </li>
                  </ul>
                </div>
              </section>

              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h2 className="font-semibold text-slate-900">
                    {selectedProjectId === "all" ? "Project Progress Snapshot" : "Selected Project Snapshot"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {selectedProjectId === "all"
                      ? "Each project completion based on approved weekly tracker entries"
                      : "Focused completion details for selected project"}
                  </p>
                </div>

                {selectedProjectId === "all" ? (
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {projectProgressCards.map((item) => (
                      <div key={item.project.project_id} className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">{item.project.title}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{item.project.status}</p>
                          </div>
                          <span className="text-sm font-bold text-emerald-600">{item.completedPct}%</span>
                        </div>
                        <div className="mt-3 h-2.5 rounded-full bg-slate-200 overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ inlineSize: `${item.completedPct}%` }} />
                        </div>
                        <div className="mt-3 text-xs text-slate-600 grid grid-cols-2 gap-2">
                          <span>Weeks: {item.metrics.totalWeeks}</span>
                          <span>Approved: {item.metrics.approvedWeeks}</span>
                          <span>Rejected: {item.metrics.rejectedWeeks}</span>
                          <span>Tasks: {item.metrics.totalTasks}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-5">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                      <h3 className="text-lg font-semibold text-slate-900">{selectedProject?.title || "Selected Project"}</h3>
                      <p className="text-sm text-slate-500 mt-1">Completion based on approved vs total tracked weeks</p>
                      <div className="mt-4 h-4 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-linear-to-r from-blue-500 to-emerald-500" style={{ inlineSize: `${completionRate}%` }} />
                      </div>
                      <p className="mt-3 text-sm text-slate-700">
                        Completed <span className="font-bold text-slate-900">{completionRate}%</span> ({filteredAggregates.approvedWeeks}/{filteredAggregates.totalWeeks} weeks)
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          {activeSection === "submission" && (
            <>
              <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                  <GrowthRateChart
                    weekTrends={weekTrends}
                    height={300}
                    title={selectedProjectId === "all" ? "Overall Submission Approval Trend" : "Project Submission Approval Trend"}
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                  <h2 className="text-sm font-semibold text-slate-900 mb-3">Weekly Submission Distribution</h2>
                  <WeeklySubmissionChart weekTrends={weekTrends} height={300} />
                </div>
              </section>

              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h2 className="font-semibold text-slate-900">Weekly Submission Progress</h2>
                  <p className="text-sm text-slate-500">
                    {selectedProjectId === "all"
                      ? "Overall week-by-week status across all assigned projects"
                      : `Week-by-week status for: ${selectedProject?.title || "Selected project"}`}
                  </p>
                </div>

                {weekTrends.length === 0 ? (
                  <div className="px-5 py-8 text-sm text-slate-500">No week trend data available yet.</div>
                ) : (
                  <div className="p-5 space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pb-4 border-b border-slate-100">
                      <LegendDot label="Pending" color="bg-slate-400" />
                      <LegendDot label="Submitted" color="bg-blue-500" />
                      <LegendDot label="Approved" color="bg-emerald-500" />
                      <LegendDot label="Rejected" color="bg-rose-500" />
                      <LegendDot label="Missed/Locked" color="bg-amber-500" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {weekTrends.map((row) => {
                        const total = row.pending + row.submitted + row.approved + row.rejected + row.missedOrLocked;
                        const safeTotal = total || 1;
                        const approvalRate = Math.round((row.approved / safeTotal) * 100);
                        const submissionRate = Math.round(((row.approved + row.submitted) / safeTotal) * 100);

                        return (
                          <div
                            key={row.weekNumber}
                            className="rounded-xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-5 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="text-lg font-bold text-slate-900">Week {row.weekNumber}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{total} total records</p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-emerald-600">{approvalRate}%</div>
                                <p className="text-xs text-slate-500">Approved</p>
                              </div>
                            </div>

                            <div className="mb-4">
                              <div className="h-6 rounded-lg overflow-hidden bg-slate-100 flex border border-slate-200 mb-2">
                                {row.pending > 0 && (
                                  <TrendSegment value={row.pending} total={safeTotal} colorClass="bg-slate-400" label="Pending" />
                                )}
                                {row.submitted > 0 && (
                                  <TrendSegment value={row.submitted} total={safeTotal} colorClass="bg-blue-500" label="Submitted" />
                                )}
                                {row.approved > 0 && (
                                  <TrendSegment value={row.approved} total={safeTotal} colorClass="bg-emerald-500" label="Approved" />
                                )}
                                {row.rejected > 0 && (
                                  <TrendSegment value={row.rejected} total={safeTotal} colorClass="bg-rose-500" label="Rejected" />
                                )}
                                {row.missedOrLocked > 0 && (
                                  <TrendSegment value={row.missedOrLocked} total={safeTotal} colorClass="bg-amber-500" label="Missed/Locked" />
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div className="rounded-lg bg-blue-50 p-2.5">
                                <p className="text-xs text-blue-600 font-semibold">Submission Rate</p>
                                <p className="text-lg font-bold text-blue-700">{submissionRate}%</p>
                              </div>
                              <div className="rounded-lg bg-emerald-50 p-2.5">
                                <p className="text-xs text-emerald-600 font-semibold">Approval Rate</p>
                                <p className="text-lg font-bold text-emerald-700">{approvalRate}%</p>
                              </div>
                            </div>

                            <div className="space-y-1.5 text-xs">
                              <BreakdownRow label="Pending" value={row.pending} color="bg-slate-400" />
                              <BreakdownRow label="Submitted" value={row.submitted} color="bg-blue-500" />
                              <BreakdownRow label="Approved" value={row.approved} color="bg-emerald-500" />
                              <BreakdownRow label="Rejected" value={row.rejected} color="bg-rose-500" />
                              <BreakdownRow label="Missed/Locked" value={row.missedOrLocked} color="bg-amber-500" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          {activeSection === "task" && (
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 pb-2">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <h2 className="font-semibold text-slate-900 mb-3">Kanban Task Distribution</h2>
                <div className="space-y-2 text-sm">
                  <TaskRow label="Todo" value={filteredAggregates.todoTasks} />
                  <TaskRow label="In Progress" value={filteredAggregates.inProgressTasks} />
                  <TaskRow label="Review" value={filteredAggregates.reviewTasks} />
                  <TaskRow label="Blocked" value={filteredAggregates.blockedTasks} />
                  <TaskRow label="Done" value={filteredAggregates.doneTasks} />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <h2 className="font-semibold text-slate-900 mb-3">Task Health</h2>
                <div className="space-y-3">
                  <PipelineRow label="Total Tasks" value={filteredAggregates.totalTasks} color="bg-slate-500" />
                  <PipelineRow label="Blocked" value={filteredAggregates.blockedTasks} color="bg-rose-500" />
                  <PipelineRow label="Review" value={filteredAggregates.reviewTasks} color="bg-amber-500" />
                  <PipelineRow label="Done" value={filteredAggregates.doneTasks} color="bg-emerald-500" />
                </div>
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  {selectedProjectId === "all"
                    ? "Task analytics include all assigned projects."
                    : `Task analytics for ${selectedProject?.title || "selected project"}.`}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <h2 className="font-semibold text-slate-900 mb-3">Project Scope</h2>
                <p className="text-sm text-slate-600 mb-2">
                  {selectedProjectId === "all"
                    ? "Analytics currently includes all projects assigned to this mentor."
                    : "Analytics currently includes only the selected project."}
                </p>
                <div className="text-sm text-slate-700 space-y-1">
                  <div>Total projects tracked: {selectedProjectId === "all" ? projects.length : 1}</div>
                  <div>Total tasks tracked: {filteredAggregates.totalTasks}</div>
                  <div>Total weeks tracked: {filteredAggregates.totalWeeks}</div>
                </div>
              </div>

              <div className="xl:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-slate-500" /> Task Coverage Summary
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="text-left px-4 py-3">Project</th>
                        <th className="text-left px-4 py-3">Total Tasks</th>
                        <th className="text-left px-4 py-3">Done</th>
                        <th className="text-left px-4 py-3">In Progress</th>
                        <th className="text-left px-4 py-3">Blocked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectProgressCards
                        .filter((item) =>
                          selectedProjectId === "all" ? true : String(item.project.project_id) === selectedProjectId
                        )
                        .map((item) => (
                          <tr key={item.project.project_id} className="border-t border-slate-100">
                            <td className="px-4 py-3 font-medium text-slate-800">{item.project.title}</td>
                            <td className="px-4 py-3 text-slate-700">{item.metrics.totalTasks}</td>
                            <td className="px-4 py-3 text-emerald-700">{item.metrics.doneTasks}</td>
                            <td className="px-4 py-3 text-blue-700">{item.metrics.inProgressTasks}</td>
                            <td className="px-4 py-3 text-rose-700">{item.metrics.blockedTasks}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {activeSection !== "task" && (
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h2 className="font-semibold text-slate-900">Tracker Feature Coverage</h2>
                  <p className="text-sm text-slate-500">Mentor analytics mapped to project tracker features</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="text-left px-4 py-3">Feature</th>
                        <th className="text-left px-4 py-3">Description</th>
                        <th className="text-left px-4 py-3">Live Metric</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-800">Weekly Tracker Monitoring</td>
                        <td className="px-4 py-3 text-slate-600">Week status tracking in selected scope</td>
                        <td className="px-4 py-3 text-slate-700">{filteredAggregates.totalWeeks} total weeks</td>
                      </tr>
                      <tr className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-800">Submission Review Queue</td>
                        <td className="px-4 py-3 text-slate-600">Pending weekly submissions ready for mentor action</td>
                        <td className="px-4 py-3 text-slate-700">{reviewQueue.length} pending reviews</td>
                      </tr>
                      <tr className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-800">Approve/Reject Workflow</td>
                        <td className="px-4 py-3 text-slate-600">Mentor review decisions on weekly submissions</td>
                        <td className="px-4 py-3 text-slate-700">
                          {filteredAggregates.approvedWeeks} approved / {filteredAggregates.rejectedWeeks} rejected
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
                <h2 className="font-semibold text-slate-900">Week Pipeline</h2>
                <PipelineRow label="Pending" value={filteredAggregates.pendingWeeks} color="bg-slate-500" />
                <PipelineRow label="Submitted" value={filteredAggregates.submittedWeeks} color="bg-blue-500" />
                <PipelineRow label="Approved" value={filteredAggregates.approvedWeeks} color="bg-emerald-500" />
                <PipelineRow label="Rejected" value={filteredAggregates.rejectedWeeks} color="bg-rose-500" />
                <PipelineRow label="Missed/Locked" value={filteredAggregates.missedWeeks} color="bg-amber-500" />
                {selectedProjectId === "all" && (
                  <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                    Overall totals. Combined from all assigned projects.
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function SectionButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? "bg-slate-900 text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-2 text-slate-600">{icon}</div>
      </div>
    </div>
  );
}

function LegendDot({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span className="text-xs font-medium text-slate-600">{label}</span>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        {label}
      </div>
      <div className="mt-1 text-lg font-bold text-slate-900">{value}</div>
    </div>
  );
}

function TrendSegment({
  value,
  total,
  colorClass,
  label,
}: {
  value: number;
  total: number;
  colorClass: string;
  label: string;
}) {
  const width = (value / total) * 100;

  return (
    <div
      className={`${colorClass} flex items-center justify-center`}
      style={{ inlineSize: `${width}%` }}
      title={`${label}: ${value}`}
    >
      {width > 20 && <span className="text-[11px] font-bold text-white">{value}</span>}
    </div>
  );
}

function BreakdownRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">
        <span className={`inline-block h-2 w-2 rounded-full ${color} mr-1.5`} />
        {label}
      </span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function PipelineRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-slate-700">{label}</span>
      </div>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function TaskRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-700">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}