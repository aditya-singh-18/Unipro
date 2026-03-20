"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/sidebar/StudentSidebar";
import Topbar from "@/components/dashboard/Topbar";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/auth.store";
import { getMyProjects } from "@/services/project.service";
import { getStudentViewMentorProfile } from "@/services/mentor.service";
import {
  getStudentTrackerDashboard,
  getProjectWeeks,
  getProjectTasks,
  getProjectTimelineHistory,
  type TrackerWeek,
  type TrackerTask,
  type ProjectStatusHistoryItem,
} from "@/services/tracker.service";

type AssignedMentor = {
  employeeId: string;
  fullName: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const { token, user } = useAuth();

  // 🔐 Auth guard: redirect if not authenticated or wrong role
  useEffect(() => {
    if (!token || user?.role !== "STUDENT") {
      console.warn("⛔ [Dashboard] Unauthorized access, redirecting to login");
      router.replace("/login");
    }
  }, [token, user?.role, router]);


  const [assignedMentor, setAssignedMentor] = useState<AssignedMentor | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [trackerStats, setTrackerStats] = useState({
    total_projects: 0,
    pending_weeks: 0,
    rejected_weeks: 0,
    high_risk_projects: 0,
  });
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectWeeks, setProjectWeeks] = useState<TrackerWeek[]>([]);
  const [projectTasks, setProjectTasks] = useState<TrackerTask[]>([]);
  const [statusHistory, setStatusHistory] = useState<ProjectStatusHistoryItem[]>([]);
  // Stable timestamp for computing time-ago in memos (avoids impure Date.now calls during render)
  const [mountTime] = useState(Date.now);

  useEffect(() => {
    const loadAssignedMentor = async () => {
      try {
        console.log('📥 [Dashboard] Loading projects...');
        const projectsRes = await getMyProjects();
        console.log('✅ [Dashboard] Projects loaded:', projectsRes.projects?.length ?? 0);
        const projects = projectsRes.projects || [];

        // Save first project ID so we can load weeks/tasks/history
        const firstProject = projects[0];
        if (firstProject?.project_id) setProjectId(firstProject.project_id);

        const assignedProject = projects.find(
          (project) => Boolean(project.mentor_employee_id)
        );

        if (!assignedProject?.mentor_employee_id) {
          setAssignedMentor(null);
          return;
        }

        console.log('📥 [Dashboard] Loading mentor profile...');
        const profile = await getStudentViewMentorProfile(assignedProject.mentor_employee_id);
        console.log('✅ [Dashboard] Mentor profile loaded');

        setAssignedMentor({
          employeeId: profile.employee_id,
          fullName: profile.full_name,
        });
      } catch (err) {
        console.error('❌ [Dashboard] Error loading mentor:', err);
        setApiError(`Failed to load mentor: ${err instanceof Error ? err.message : String(err)}`);
        setAssignedMentor(null);
      }
    };

    void loadAssignedMentor();
  }, []);

  // Load project-specific data once we have a projectId
  useEffect(() => {
    if (!projectId) return;
    const loadProjectData = async () => {
      const [weeks, tasks, history] = await Promise.all([
        getProjectWeeks(projectId).catch(() => [] as TrackerWeek[]),
        getProjectTasks(projectId).catch(() => [] as TrackerTask[]),
        getProjectTimelineHistory(projectId, 5).catch(() => [] as ProjectStatusHistoryItem[]),
      ]);
      setProjectWeeks(weeks);
      setProjectTasks(tasks);
      setStatusHistory(history);
    };
    void loadProjectData();
  }, [projectId]);

  useEffect(() => {
    const loadTrackerStats = async () => {
      try {
        const stats = await getStudentTrackerDashboard();
        setTrackerStats(stats);
      } catch {
        setTrackerStats({
          total_projects: 0,
          pending_weeks: 0,
          rejected_weeks: 0,
          high_risk_projects: 0,
        });
      }
    };

    void loadTrackerStats();
  }, []);

  const mentorCardValue = useMemo(() => {
    return assignedMentor?.fullName || "Mentor Not Assigned";
  }, [assignedMentor]);

  const progressBars = useMemo(() => {
    const now = new Date(mountTime);
    const weeks = projectWeeks.slice(0, 6);
    if (weeks.length === 0) {
      // Empty state — show one blank bar so the chart doesn't break
      return [{ label: "W1", completed: 0, delayed: 0, atRisk: 0 }];
    }
    return weeks.map((week) => {
      const isCompleted = week.status === "approved" || week.status === "locked";
      const isDelayed =
        week.status === "missed" ||
        week.status === "rejected" ||
        (week.status === "pending" && !!week.deadline_at && new Date(week.deadline_at) < now);
      const isAtRisk = !isCompleted && !isDelayed;
      const completed = isCompleted ? 100 : 0;
      const delayed = isDelayed ? 100 : 0;
      const atRisk = isAtRisk ? 100 : 0;
      return { label: `W${week.week_number}`, completed, delayed, atRisk };
    });
  }, [projectWeeks, mountTime]);

  const weeklyTasks = useMemo(() => {
    const now = new Date(mountTime);
    const tasks = projectTasks.slice(0, 4);
    if (tasks.length === 0) return [];
    return tasks.map((task) => {
      let status = "On Track";
      if (task.status === "blocked" || task.priority === "critical") status = "Critical";
      else if (task.due_date && new Date(task.due_date) < now && task.status !== "done")
        status = "Delayed";
      else if (task.priority === "high" || task.status === "review") status = "At Risk";
      const due = task.due_date
        ? new Date(task.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
        : "—";
      return {
        task: task.title,
        owner: task.assigned_to_user_key ? "Team" : "Unassigned",
        status,
        due,
      };
    });
  }, [projectTasks, mountTime]);

  const teamActivities = useMemo(() => {
    if (statusHistory.length === 0) return [];
    return statusHistory.slice(0, 4).map((item) => {
      const role = item.changed_role
        ? item.changed_role.charAt(0).toUpperCase() + item.changed_role.slice(1)
        : "System";
      const action = (item.event_type || "status updated")
        .replace(/_/g, " ")
        .toLowerCase();
      const diffMins = Math.floor((mountTime - new Date(item.created_at).getTime()) / 60000);
      const ago =
        diffMins < 1 ? "just now" :
        diffMins < 60 ? `${diffMins}m` :
        diffMins < 1440 ? `${Math.floor(diffMins / 60)}h` :
        `${Math.floor(diffMins / 1440)}d`;
      return { user: role, action, ago };
    });
  }, [statusHistory, mountTime]);

  const totalProgress = useMemo(() => {
    const completed = progressBars.filter((item) => item.completed > 0).length;
    const delayed = progressBars.filter((item) => item.delayed > 0).length;
    const atRisk = progressBars.filter((item) => item.atRisk > 0).length;
    const total = Math.max(progressBars.length, 1);
    const completedPct = Math.round((completed / total) * 100);
    const delayedPct = Math.round((delayed / total) * 100);
    const atRiskPct = Math.round((atRisk / total) * 100);
    return { completed, delayed, atRisk, completedPct, delayedPct, atRiskPct, total };
  }, [progressBars]);

  const donutSegments = useMemo(() => {
    const delayed = Math.max(trackerStats.pending_weeks, 1);
    const atRisk = Math.max(trackerStats.high_risk_projects, 1);
    const rejected = Math.max(trackerStats.rejected_weeks, 1);
    const onTrack = Math.max(trackerStats.total_projects * 4 - delayed - atRisk - rejected, 2);

    const sum = delayed + atRisk + rejected + onTrack;
    const delayedPct = (delayed / sum) * 100;
    const atRiskPct = (atRisk / sum) * 100;
    const rejectedPct = (rejected / sum) * 100;
    const onTrackPct = (onTrack / sum) * 100;

    const ringStyle = {
      background: `conic-gradient(#4f8dfb 0% ${delayedPct}%, #ff9f43 ${delayedPct}% ${
        delayedPct + atRiskPct
      }%, #ef4444 ${delayedPct + atRiskPct}% ${
        delayedPct + atRiskPct + rejectedPct
      }%, #22c55e ${delayedPct + atRiskPct + rejectedPct}% 100%)`,
    };

    return {
      ringStyle,
      delayed,
      atRisk,
      rejected,
      onTrack,
      delayedPct,
      atRiskPct,
      rejectedPct,
      onTrackPct,
    };
  }, [trackerStats]);

  const completionForecast = useMemo(() => {
    const total = projectWeeks.length;
    if (total === 0) return null;
    const completed = projectWeeks.filter(
      (w) => w.status === "approved" || w.status === "locked"
    ).length;
    const remaining = total - completed;
    const pct = Math.round((completed / total) * 100);
    // Estimate weeks remaining: if we completed `completed` in `completed` submission cycles,
    // remaining weeks at same pace = remaining (1 per cycle), just show count
    return { total, completed, remaining, pct };
  }, [projectWeeks]);

  const growthRate = useMemo(() => {
    const statusToVal: Record<string, number> = {
      approved: 22, locked: 20, submitted: 16, under_review: 15,
      pending: 11, rejected: 6, missed: 5,
    };
    const vals = projectWeeks.slice(-7).map((w) => statusToVal[w.status] ?? 10);
    return vals.length > 0 ? vals : [8, 10, 12, 11, 14, 15, 17];
  }, [projectWeeks]);

  const kanbanCounts = useMemo(() => ({
    todo: projectTasks.filter((t) => t.status === "todo").length,
    inProgress: projectTasks.filter((t) => t.status === "in_progress").length,
    review: projectTasks.filter((t) => t.status === "review").length,
    done: projectTasks.filter((t) => t.status === "done").length,
  }), [projectTasks]);

  const growthRatePct = useMemo(() => {
    if (growthRate.length < 2) return 0;
    const last = growthRate[growthRate.length - 1];
    const prev = growthRate[growthRate.length - 2];
    if (prev === 0) return 0;
    return Math.round(((last - prev) / prev) * 100);
  }, [growthRate]);

  const statusClass = (status: string) => {
    if (status === "Delayed") return "bg-rose-100 text-rose-700";
    if (status === "Critical") return "bg-amber-100 text-amber-700";
    if (status === "At Risk") return "bg-orange-100 text-orange-700";
    return "bg-emerald-100 text-emerald-700";
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#cad4e3] text-slate-900">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar title="Student Dashboard" showSearch />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-6 dashboard-shell">
          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              ⚠️ {apiError}
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <article
              className="tile-card tile-blue"
              onClick={() => router.push("/student/my-project")}
            >
              <p className="tile-label">Project Status</p>
              <p className="tile-value">{trackerStats.total_projects} Active Projects</p>
              <div className="tile-footer-row">
                <button className="tile-button">View</button>
                <span className="tile-chip">Live</span>
              </div>
              <div className="wave-overlay" />
            </article>

            <article
              className="tile-card tile-green"
              onClick={() => router.push("/progress")}
            >
              <p className="tile-label">Pending Weeks</p>
              <p className="tile-value">{trackerStats.pending_weeks}</p>
              <div className="tile-footer-row">
                <button className="tile-button">View</button>
                <span className="tile-chip">Tracker</span>
              </div>
              <div className="wave-overlay" />
            </article>

            <article
              className="tile-card tile-purple"
              onClick={() => {
                if (!assignedMentor) return;
                router.push(`/student/mentor/${assignedMentor.employeeId}`);
              }}
            >
              <p className="tile-label">My Mentor</p>
              <p className="tile-value mentor-name">{mentorCardValue}</p>
              <div className="tile-footer-row">
                <button className="tile-button">{assignedMentor ? "View Profile" : "Pending"}</button>
                <span className="tile-chip">Faculty</span>
              </div>
            </article>

            <article
              className="tile-card tile-amber"
              onClick={() => router.push("/progress")}
            >
              <p className="tile-label">Risk Alerts</p>
              <p className="tile-value">{trackerStats.high_risk_projects} Issues</p>
              <div className="tile-footer-row">
                <button className="tile-button">{trackerStats.rejected_weeks} rejected weeks</button>
                <span className="tile-chip">Priority</span>
              </div>
            </article>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <article className="panel-card xl:col-span-2">
              <div className="panel-header-row">
                <h3 className="panel-title">Project Progress</h3>
                <button
                  onClick={() => router.push("/progress")}
                  className="view-details-btn"
                >
                  View Details
                </button>
              </div>

              <div className="mt-5 space-y-3">
                <div className="progress-legend">
                  <span><i className="dot dot-blue" />Completed</span>
                  <span><i className="dot dot-amber" />Delayed</span>
                  <span><i className="dot dot-red" />At Risk</span>
                </div>

                <div className="bar-grid">
                  {progressBars.map((bar) => (
                    <div key={bar.label} className="bar-item">
                      <div className="bar-stack">
                        <div className="bar-segment bar-completed" style={{ blockSize: `${bar.completed}%` }} />
                        <div className="bar-segment bar-delayed" style={{ blockSize: `${bar.delayed}%` }} />
                        <div className="bar-segment bar-risk" style={{ blockSize: `${bar.atRisk}%` }} />
                      </div>
                      <span className="bar-label">{bar.label}</span>
                    </div>
                  ))}
                </div>

                <div className="summary-row">
                  <span>{totalProgress.completedPct}% Completed ({totalProgress.completed}/{totalProgress.total})</span>
                  <span>{totalProgress.delayedPct}% Delayed ({totalProgress.delayed}/{totalProgress.total})</span>
                  <span>{totalProgress.atRiskPct}% At Risk ({totalProgress.atRisk}/{totalProgress.total})</span>
                </div>
              </div>
            </article>

            <article className="panel-card">
              <div className="panel-header-row">
                <h3 className="panel-title">Risk Analysis Tracker</h3>
                <button
                  onClick={() => router.push("/progress")}
                  className="view-details-btn"
                >
                  View All
                </button>
              </div>

              <div className="risk-layout">
                <div className="risk-donut" style={donutSegments.ringStyle}>
                  <div className="risk-donut-core">
                    <strong>{Math.round(donutSegments.onTrackPct)}%</strong>
                    <small>On Track</small>
                  </div>
                </div>

                <div className="risk-stats">
                  <p><span>Delayed Tasks</span><strong>{donutSegments.delayed}</strong></p>
                  <p><span>At Risk Tasks</span><strong>{donutSegments.atRisk}</strong></p>
                  <p><span>Rejected Weeks</span><strong>{donutSegments.rejected}</strong></p>
                  <p><span>On Track Blocks</span><strong>{donutSegments.onTrack}</strong></p>
                </div>

                {completionForecast && (
                  <div className="forecast-card">
                    <div className="forecast-header">
                      <span>Completion Forecast</span>
                      <strong>{completionForecast.pct}%</strong>
                    </div>
                    <div className="forecast-bar-bg">
                      <div
                        className="forecast-bar-fill"
                        style={{ inlineSize: `${completionForecast.pct}%` }}
                      />
                    </div>
                    <div className="forecast-sub">
                      <span>{completionForecast.completed}/{completionForecast.total} weeks done</span>
                      <span>{completionForecast.remaining} remaining</span>
                    </div>
                  </div>
                )}
              </div>
            </article>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <article className="panel-card xl:col-span-2">
              <div className="panel-header-row">
                <h3 className="panel-title">Weekly Progress</h3>
                <button
                  onClick={() => router.push("/progress")}
                  className="view-details-btn"
                >
                  View Details
                </button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-140">
                  <thead>
                    <tr className="text-left text-slate-500 text-sm">
                      <th className="pb-3 font-medium">Task</th>
                      <th className="pb-3 font-medium">Assigned To</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyTasks.map((item, idx) => (
                      <tr key={`${item.task}-${item.owner}-${item.due}-${idx}`} className="border-t border-slate-200/80 text-sm">
                        <td className="py-3 text-slate-700">{item.task}</td>
                        <td className="py-3 text-slate-600">{item.owner}</td>
                        <td className="py-3">
                          <span className={`status-pill ${statusClass(item.status)}`}>{item.status}</span>
                        </td>
                        <td className="py-3 text-slate-600">{item.due}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="panel-card">
              <div className="panel-header-row">
                <h3 className="panel-title">Team Collaboration</h3>
                <button
                  onClick={() => router.push("/team")}
                  className="view-details-btn"
                >
                  View Details
                </button>
              </div>

              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  {teamActivities.map((activity, idx) => (
                    <div key={`${activity.user}-${activity.action}-${idx}`} className="activity-item">
                      <div>
                        <p className="activity-user">{activity.user}</p>
                        <p className="activity-action">{activity.action}</p>
                      </div>
                      <span className="activity-ago">{activity.ago}</span>
                    </div>
                  ))}
                </div>

                <div className="kanban-grid">
                  <div className="kanban-col">
                    <h4>To Do</h4>
                    <span>{kanbanCounts.todo}</span>
                  </div>
                  <div className="kanban-col">
                    <h4>In Progress</h4>
                    <span>{kanbanCounts.inProgress}</span>
                  </div>
                  <div className="kanban-col">
                    <h4>Review</h4>
                    <span>{kanbanCounts.review}</span>
                  </div>
                  <div className="kanban-col">
                    <h4>Done</h4>
                    <span>{kanbanCounts.done}</span>
                  </div>
                </div>

                <div className="growth-card">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">Task Growth Rate</p>
                    <span className={`text-sm font-semibold ${growthRatePct >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {growthRatePct >= 0 ? '+' : ''}{growthRatePct}%
                    </span>
                  </div>

                  <div className="growth-bars mt-3">
                    {growthRate.map((value, idx) => (
                      <div key={`${value}-${idx}`} className="growth-bar-item">
                        <div style={{ blockSize: `${value * 4}px` }} className="growth-bar" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </section>
        </main>
      </div>

      <style jsx global>{`
        .dashboard-shell {
          background: radial-gradient(circle at 20% -20%, rgba(73, 116, 191, 0.2) 0%, rgba(202, 212, 227, 0.9) 38%, #c6d2e2 100%);
        }

        .tile-card {
          position: relative;
          min-block-size: 77px;
          border-radius: 16px;
          padding: 11px;
          color: #f8fbff;
          cursor: pointer;
          overflow: hidden;
          box-shadow: 0 12px 20px rgba(26, 44, 80, 0.2);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .tile-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 24px rgba(26, 44, 80, 0.26);
        }

        .tile-label {
          font-size: 0.78rem;
          font-weight: 600;
          opacity: 0.95;
        }

        .tile-value {
          margin-block-start: 4px;
          font-size: 1rem;
          line-height: 1.1;
          font-weight: 700;
          max-inline-size: 90%;
        }

        .mentor-name {
          font-size: 1.06rem;
        }

        .tile-footer-row {
          margin-block-start: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .tile-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.22);
          backdrop-filter: blur(4px);
          transition: background 0.2s ease;
        }

        .tile-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-inline-size: 54px;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.16);
          font-size: 0.67rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .tile-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .wave-overlay {
          position: absolute;
          inline-size: 140%;
          block-size: 62px;
          border-radius: 50%;
          inset-block-end: -42px;
          inset-inline-start: -20%;
          background: rgba(255, 255, 255, 0.16);
        }

        .tile-blue {
          background: linear-gradient(136deg, #4f8dfb 0%, #2f69d4 100%);
        }

        .tile-green {
          background: linear-gradient(136deg, #1fc2a0 0%, #119b80 100%);
        }

        .tile-purple {
          background: linear-gradient(136deg, #7a66f1 0%, #5a4ddd 100%);
        }

        .tile-amber {
          background: linear-gradient(136deg, #f7ae2a 0%, #e18a17 100%);
        }

        .panel-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.55);
          border-radius: 16px;
          padding: 12px;
          box-shadow: 0 12px 20px rgba(38, 57, 88, 0.14);
        }

        .panel-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .panel-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #1f2a44;
        }

        .view-details-btn {
          border-radius: 999px;
          background: linear-gradient(120deg, #5e90f8 0%, #3f78f0 100%);
          color: white;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 6px 10px;
          box-shadow: 0 6px 12px rgba(58, 112, 239, 0.3);
          transition: transform 0.2s ease;
        }

        .view-details-btn:hover {
          transform: translateY(-1px);
        }

        .progress-legend {
          display: flex;
          align-items: center;
          gap: 16px;
          color: #4a5878;
          font-size: 0.85rem;
        }

        .progress-legend span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .dot {
          inline-size: 10px;
          block-size: 10px;
          border-radius: 999px;
          display: inline-block;
        }

        .dot-blue {
          background: #3b82f6;
        }

        .dot-amber {
          background: #f59e0b;
        }

        .dot-red {
          background: #ef4444;
        }

        .bar-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 8px;
          align-items: end;
          block-size: 130px;
          padding: 8px;
          border-radius: 12px;
          background: rgba(245, 248, 255, 0.8);
          border: 1px solid rgba(151, 172, 208, 0.25);
        }

        .bar-item {
          block-size: 100%;
          display: flex;
          flex-direction: column;
          justify-content: end;
          align-items: center;
          gap: 5px;
        }

        .bar-stack {
          block-size: 84px;
          inline-size: 16px;
          display: flex;
          flex-direction: column;
          justify-content: end;
          border-radius: 7px;
          overflow: hidden;
          background: rgba(220, 228, 242, 0.8);
        }

        .bar-segment {
          inline-size: 100%;
        }

        .bar-completed {
          background: linear-gradient(180deg, #5aa8ff 0%, #2f73ee 100%);
        }

        .bar-delayed {
          background: linear-gradient(180deg, #ffc878 0%, #ff9f43 100%);
        }

        .bar-risk {
          background: linear-gradient(180deg, #ff8888 0%, #ef4444 100%);
        }

        .bar-label {
          font-size: 0.8rem;
          color: #47546f;
          font-weight: 600;
        }

        .summary-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .summary-row span {
          border-radius: 12px;
          padding: 10px 12px;
          background: rgba(244, 247, 253, 0.94);
          border: 1px solid rgba(180, 196, 223, 0.45);
          color: #2f4064;
          font-size: 0.88rem;
          font-weight: 600;
          text-align: center;
        }

        .risk-layout {
          margin-block-start: 20px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .risk-donut {
          inline-size: 170px;
          block-size: 170px;
          margin: 0 auto;
          border-radius: 999px;
          display: grid;
          place-items: center;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7);
        }

        .risk-donut-core {
          inline-size: 118px;
          block-size: 118px;
          border-radius: 999px;
          background: #f6f9ff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px rgba(38, 60, 98, 0.12);
        }

        .risk-donut-core strong {
          font-size: 1.6rem;
          color: #2e3d60;
        }

        .risk-donut-core small {
          color: #5f6d8b;
        }

        .risk-stats {
          display: grid;
          gap: 8px;
        }

        .risk-stats p {
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border-radius: 12px;
          padding: 10px 12px;
          background: rgba(244, 248, 255, 0.9);
          color: #415171;
          font-size: 0.9rem;
        }

        .risk-stats strong {
          color: #1f2d49;
        }

        .forecast-card {
          border-radius: 12px;
          padding: 10px 12px;
          background: linear-gradient(180deg, #f0f6ff 0%, #e8f0fe 100%);
          border: 1px solid rgba(120, 160, 220, 0.35);
        }

        .forecast-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.82rem;
          color: #415171;
          font-weight: 600;
          margin-block-end: 7px;
        }

        .forecast-header strong {
          color: #2f69d4;
          font-size: 0.9rem;
        }

        .forecast-bar-bg {
          block-size: 7px;
          border-radius: 999px;
          background: rgba(190, 210, 240, 0.6);
          overflow: hidden;
          margin-block-end: 6px;
        }

        .forecast-bar-fill {
          block-size: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #5aa8ff 0%, #2f69d4 100%);
          transition: width 0.6s ease;
        }

        .forecast-sub {
          display: flex;
          justify-content: space-between;
          font-size: 0.76rem;
          color: #6b7fa3;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .activity-item {
          display: flex;
          align-items: start;
          justify-content: space-between;
          gap: 12px;
          border-radius: 12px;
          padding: 10px;
          background: rgba(247, 250, 255, 0.95);
          border: 1px solid rgba(195, 210, 236, 0.5);
        }

        .activity-user {
          margin: 0;
          font-size: 0.85rem;
          color: #223354;
          font-weight: 700;
        }

        .activity-action {
          margin: 0;
          font-size: 0.81rem;
          color: #586985;
        }

        .activity-ago {
          color: #7d8ba4;
          font-size: 0.78rem;
          font-weight: 600;
        }

        .kanban-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .kanban-col {
          border-radius: 12px;
          padding: 10px 8px;
          text-align: center;
          background: linear-gradient(180deg, #f8fbff 0%, #eaf2ff 100%);
          border: 1px solid rgba(168, 189, 223, 0.42);
        }

        .kanban-col h4 {
          margin: 0;
          font-size: 0.74rem;
          color: #58709a;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .kanban-col span {
          display: block;
          margin-block-start: 4px;
          font-size: 1.2rem;
          color: #29406a;
          font-weight: 700;
        }

        .growth-card {
          border-radius: 14px;
          padding: 12px;
          background: linear-gradient(180deg, #f6fff8 0%, #edf8f1 100%);
          border: 1px solid rgba(135, 192, 151, 0.38);
        }

        .growth-bars {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 8px;
          align-items: end;
          block-size: 84px;
        }

        .growth-bar-item {
          display: flex;
          align-items: end;
          justify-content: center;
        }

        .growth-bar {
          inline-size: 13px;
          border-radius: 8px;
          background: linear-gradient(180deg, #6fe196 0%, #2fb866 100%);
          box-shadow: 0 4px 10px rgba(48, 161, 92, 0.28);
        }

        @media (max-inline-size: 1280px) {
          .panel-title {
            font-size: 1.45rem;
          }

          .bar-grid {
            block-size: 200px;
          }

          .bar-stack {
            block-size: 150px;
          }
        }

        @media (max-inline-size: 767px) {
          .tile-value,
          .mentor-name {
            font-size: 1.18rem;
          }

          .panel-title {
            font-size: 1.2rem;
          }

          .panel-header-row {
            align-items: start;
            flex-direction: column;
          }

          .view-details-btn {
            inline-size: 100%;
          }

          .summary-row {
            grid-template-columns: 1fr;
          }

          .kanban-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  );
}

