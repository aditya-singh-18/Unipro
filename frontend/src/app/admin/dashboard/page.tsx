"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "@/lib/axios";
import MentorSelectionModal from "@/components/modals/MentorSelectionModal";
import {
  getAdminEscalationBoard,
  getAdminComplianceBoard,
  getAdminTrackerDashboard,
  type AdminEscalationItem,
  type AdminComplianceBoardResponse,
  type AdminComplianceItem,
} from "@/services/tracker.service";

type PendingProject = {
  project_id: string;
  title: string;
  description: string;
  tech_stack: string[];
  created_at?: string;
};

type ComplianceFilter = "all" | AdminComplianceItem["compliance_status"];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalProjects: 0,
    pendingApprovals: 0,
    activeMentors: 0,
  });
  const [pendingProjects, setPendingProjects] = useState<PendingProject[]>([]);
  const [trackerStats, setTrackerStats] = useState({
    total_projects: 0,
    active_projects: 0,
    high_risk_projects: 0,
    missed_weeks: 0,
  });
  const [complianceBoard, setComplianceBoard] = useState<AdminComplianceBoardResponse>({
    summary: {
      total_projects: 0,
      critical_projects: 0,
      warning_projects: 0,
      healthy_projects: 0,
      follow_up_required: 0,
    },
    items: [],
    pagination: {
      page: 1,
      pageSize: 8,
      total: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<PendingProject | null>(null);
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>("all");
  const [compliancePage, setCompliancePage] = useState(1);
  const [escalations, setEscalations] = useState<AdminEscalationItem[]>([]);
  const [escalationThresholds, setEscalationThresholds] = useState({
    pendingOverdueHours: 48,
    reviewOverdueHours: 36,
  });

  const fetchComplianceBoardData = useCallback(async () => {
    try {
      const compliance = await getAdminComplianceBoard({
        status: complianceFilter === "all" ? undefined : complianceFilter,
        page: compliancePage,
        pageSize: 8,
      });
      setComplianceBoard(compliance);
    } catch {
      setComplianceBoard((prev) => ({
        ...prev,
        items: [],
        pagination: {
          page: compliancePage,
          pageSize: 8,
          total: 0,
        },
      }));
    }
  }, [complianceFilter, compliancePage]);

  const fetchEscalationData = useCallback(async () => {
    try {
      const escalationBoard = await getAdminEscalationBoard(6);
      setEscalations(escalationBoard.items || []);
      setEscalationThresholds(
        escalationBoard.thresholds || {
          pendingOverdueHours: 48,
          reviewOverdueHours: 36,
        }
      );
    } catch {
      setEscalations([]);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all stats in parallel
      const [projectsRes, usersRes, mentorsRes, statsRes] = await Promise.allSettled([
        axios.get("/project/admin/pending"),
        axios.get("/user/admin/students/count"),
        axios.get("/mentor/admin/list"),
        axios.get("/project/admin/count"),
      ]);

      // Process pending projects
      if (projectsRes.status === "fulfilled") {
        setPendingProjects(projectsRes.value.data.projects || []);
      }

      // Process stats
      const newStats = {
        totalStudents: 0,
        totalProjects: 0,
        pendingApprovals: 0,
        activeMentors: 0,
      };

      if (usersRes.status === "fulfilled") {
        newStats.totalStudents = usersRes.value.data.count || 0;
      }

      if (statsRes.status === "fulfilled") {
        newStats.totalProjects = statsRes.value.data.count || 0;
      }

      if (mentorsRes.status === "fulfilled") {
        const mentors = mentorsRes.value.data.data || mentorsRes.value.data.mentors || [];
        newStats.activeMentors = Array.isArray(mentors) ? mentors.length : 0;
      }

      if (projectsRes.status === "fulfilled") {
        newStats.pendingApprovals = projectsRes.value.data.count || 0;
      }

      const [trackerResult, complianceResult] = await Promise.allSettled([
        getAdminTrackerDashboard(),
        getAdminComplianceBoard({
          page: 1,
          pageSize: 8,
        }),
      ]);

      if (trackerResult.status === "fulfilled") {
        setTrackerStats(trackerResult.value);
      } else {
        setTrackerStats({
          total_projects: 0,
          active_projects: 0,
          high_risk_projects: 0,
          missed_weeks: 0,
        });
      }

      if (complianceResult.status === "fulfilled") {
        setComplianceBoard(complianceResult.value);
      } else {
        setComplianceBoard({
          summary: {
            total_projects: 0,
            critical_projects: 0,
            warning_projects: 0,
            healthy_projects: 0,
            follow_up_required: 0,
          },
          items: [],
          pagination: {
            page: 1,
            pageSize: 8,
            total: 0,
          },
        });
      }

      setStats(newStats);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (loading) return;
    void fetchComplianceBoardData();
  }, [fetchComplianceBoardData, loading]);

  useEffect(() => {
    if (loading) return;
    void fetchEscalationData();
  }, [fetchEscalationData, loading]);

  const handleReviewClick = (project: PendingProject) => {
    setSelectedProject(project);
    setModalOpen(true);
  };

  const handleMentorAssigned = () => {
    // Refresh the pending projects list
    fetchDashboardData();
  };

  const totalPages = Math.max(1, Math.ceil((complianceBoard.pagination?.total || 0) / (complianceBoard.pagination?.pageSize || 8)));

  return (
    <>
      <div className="space-y-6 sm:space-y-8">
          {/* ================= STAT CARDS ================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <StatCard
              title="Total Students"
              value={stats.totalStudents.toString()}
              icon="👥"
              color="blue"
              trend="+12% from last month"
              onClick={() => router.push("/admin/users")}
            />
            <StatCard
              title="Active Projects"
              value={(trackerStats.active_projects || stats.totalProjects).toString()}
              icon="📊"
              color="green"
              trend="+8% from last month"
              onClick={() => router.push("/admin/projects")}
            />
            <StatCard
              title="Pending Approvals"
              value={stats.pendingApprovals.toString()}
              icon="⏳"
              color="yellow"
              trend="Needs attention"
              onClick={() => router.push("/admin/approvals")}
            />
            <StatCard
              title="Active Mentors"
              value={stats.activeMentors.toString()}
              icon="🎓"
              color="purple"
              trend="+3 new this month"
              onClick={() => router.push("/admin/projects")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
            <StatCard
              title="Tracker Projects"
              value={String(trackerStats.total_projects)}
              icon="🧭"
              color="blue"
              trend="From tracker module"
            />
            <StatCard
              title="High Risk Projects"
              value={String(trackerStats.high_risk_projects)}
              icon="⚠️"
              color="yellow"
              trend="Need mentor intervention"
            />
            <StatCard
              title="Missed Weeks"
              value={String(trackerStats.missed_weeks)}
              icon="📅"
              color="purple"
              trend="Submission deadlines missed"
            />
            <StatCard
              title="Tracker Active"
              value={String(trackerStats.active_projects)}
              icon="✅"
              color="green"
              trend="Currently active in tracker"
            />
          </div>

          {/* ================= MAIN CONTENT GRID ================= */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
            {/* PENDING PROJECTS */}
            <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-3 sm:p-4 lg:p-6 min-w-0">
              <div className="flex items-center justify-between mb-4 gap-2 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">Pending Project Approvals</h2>
                <span className="px-3 sm:px-4 py-1 bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 rounded-full text-xs sm:text-sm font-semibold shadow-sm whitespace-nowrap">
                  {stats.pendingApprovals} Pending
                </span>
              </div>

              {loading ? (
                <div className="text-center py-16 text-slate-500">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-blue-600 mx-auto"></div>
                  <p className="mt-4 text-base font-medium">Loading projects...</p>
                </div>
              ) : pendingProjects.length > 0 ? (
                <div className="space-y-4">
                  {pendingProjects.slice(0, 5).map((project) => (
                    <div
                      key={project.project_id}
                      className="group border border-slate-200 rounded-xl p-4 sm:p-6 hover:border-blue-300 hover:shadow-md transition-all duration-200 bg-gradient-to-r from-white to-slate-50/50 min-w-0"
                    >
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 min-w-0">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 text-base sm:text-lg mb-2 group-hover:text-blue-600 transition-colors truncate">
                            {project.title}
                          </h3>
                          <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                            {project.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm min-w-0">
                            <span className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2 sm:px-3 py-1 rounded-lg max-w-full truncate">
                              📋 {project.project_id}
                            </span>
                            <span className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2 sm:px-3 py-1 rounded-lg whitespace-nowrap">
                              📅 {project.created_at ? new Date(project.created_at).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:ml-4 shrink-0 w-full sm:w-auto">
                          <button 
                            onClick={() => handleReviewClick(project)}
                            className="w-full sm:w-auto px-5 sm:px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-200 hover:scale-105"
                          >
                            Review
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="text-7xl mb-4">✅</div>
                  <p className="text-slate-500 text-lg font-medium">No pending approvals</p>
                  <p className="text-slate-400 text-sm mt-1">All caught up!</p>
                </div>
              )}
            </div>

            {/* QUICK ACTIONS */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 lg:p-8 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 truncate">Quick Actions</h2>
              
              <div className="space-y-3">
                <QuickActionButton
                  icon="👤"
                  label="Register User"
                  color="blue"
                />
                <QuickActionButton
                  icon="👥"
                  label="Manage Teams"
                  color="green"
                />
                <QuickActionButton
                  icon="🎓"
                  label="Assign Mentors"
                  color="purple"
                />
                <QuickActionButton
                  icon="📊"
                  label="View Reports"
                  color="orange"
                />
                <QuickActionButton
                  icon="⚙️"
                  label="System Settings"
                  color="gray"
                />
              </div>
            </div>
          </div>

          {/* ================= COMPLIANCE BOARD ================= */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
            <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 lg:p-8 min-w-0">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">Compliance Board</h2>
                  <p className="mt-1 text-sm text-slate-500">Projects that need follow-up on submissions, reviews, and risk.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">
                  {complianceBoard.summary.follow_up_required} needs attention
                </span>
              </div>

              <div className="mb-5 flex flex-wrap gap-2">
                <FilterChip
                  label={`All (${complianceBoard.summary.total_projects})`}
                  active={complianceFilter === "all"}
                  onClick={() => {
                    setComplianceFilter("all");
                    setCompliancePage(1);
                  }}
                />
                <FilterChip
                  label={`Critical (${complianceBoard.summary.critical_projects})`}
                  active={complianceFilter === "critical"}
                  tone="critical"
                  onClick={() => {
                    setComplianceFilter("critical");
                    setCompliancePage(1);
                  }}
                />
                <FilterChip
                  label={`Warning (${complianceBoard.summary.warning_projects})`}
                  active={complianceFilter === "warning"}
                  tone="warning"
                  onClick={() => {
                    setComplianceFilter("warning");
                    setCompliancePage(1);
                  }}
                />
                <FilterChip
                  label={`Healthy (${complianceBoard.summary.healthy_projects})`}
                  active={complianceFilter === "healthy"}
                  tone="healthy"
                  onClick={() => {
                    setComplianceFilter("healthy");
                    setCompliancePage(1);
                  }}
                />
              </div>

              {loading ? (
                <div className="text-center py-16 text-slate-500">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-blue-600 mx-auto"></div>
                  <p className="mt-4 text-base font-medium">Loading compliance board...</p>
                </div>
              ) : complianceBoard.items.length > 0 ? (
                <div className="space-y-4">
                  {complianceBoard.items.map((item) => (
                    <ComplianceBoardRow
                      key={item.project_id}
                      item={item}
                      onOpen={() =>
                        router.push(`/admin/projects?projectId=${encodeURIComponent(String(item.project_id))}`)
                      }
                    />
                  ))}

                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs text-slate-600">
                      Page {complianceBoard.pagination.page} of {totalPages} · {complianceBoard.pagination.total} project(s)
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCompliancePage((p) => Math.max(1, p - 1))}
                        disabled={complianceBoard.pagination.page <= 1}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setCompliancePage((p) => Math.min(totalPages, p + 1))}
                        disabled={complianceBoard.pagination.page >= totalPages}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="text-7xl mb-4">🔎</div>
                  <p className="text-slate-500 text-lg font-medium">No projects in this filter</p>
                  <p className="text-slate-400 text-sm mt-1">Try another compliance status filter.</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 lg:p-8 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 truncate">Compliance Snapshot</h2>

              <div className="space-y-4">
                <StatusItem
                  label="Critical Projects"
                  status={String(complianceBoard.summary.critical_projects)}
                  color="red"
                />
                <StatusItem
                  label="Warning Projects"
                  status={String(complianceBoard.summary.warning_projects)}
                  color="blue"
                />
                <StatusItem
                  label="Healthy Projects"
                  status={String(complianceBoard.summary.healthy_projects)}
                  color="green"
                />
                <StatusItem
                  label="Follow-up Required"
                  status={String(complianceBoard.summary.follow_up_required)}
                  color={complianceBoard.summary.follow_up_required > 0 ? "red" : "green"}
                />
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-900 mb-3">Escalation Queue</h3>
                <p className="text-xs text-slate-500 mb-3">
                  Pending SLA: {escalationThresholds.pendingOverdueHours}h · Review SLA: {escalationThresholds.reviewOverdueHours}h
                </p>

                {escalations.length === 0 ? (
                  <p className="text-sm text-slate-600">No active escalations right now.</p>
                ) : (
                  <div className="space-y-2">
                    {escalations.map((item) => (
                      <button
                        key={`${item.project_id}-${item.week_id}`}
                        onClick={() =>
                          router.push(`/admin/projects?projectId=${encodeURIComponent(String(item.project_id))}`)
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:border-blue-300"
                      >
                        <p className="text-xs font-semibold text-slate-900">
                          {item.project_id} · Week {item.week_number}
                        </p>
                        <p className="text-xs text-slate-600">
                          {item.escalation_type === "pending_overdue" ? "Pending overdue" : "Review overdue"} · {Number(item.overdue_hours || 0).toFixed(1)}h
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      <MentorSelectionModal
        isOpen={modalOpen && !!selectedProject}
        onClose={() => setModalOpen(false)}
        projectId={String(selectedProject?.project_id || '')}
        projectTitle={String(selectedProject?.title || '')}
        onMentorAssigned={handleMentorAssigned}
      />
    </>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'purple';
  trend: string;
  onClick?: () => void;
}

function StatCard({ title, value, icon, color, trend, onClick }: StatCardProps) {
  const colorClasses: Record<StatCardProps['color'], string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    purple: 'from-purple-500 to-purple-600',
  };

  const bgClasses: Record<StatCardProps['color'], string> = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    yellow: 'bg-yellow-50',
    purple: 'bg-purple-50',
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 relative overflow-hidden hover:shadow-xl transition-all duration-300 group min-w-0 cursor-pointer"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClasses[color]} opacity-5 rounded-bl-full group-hover:opacity-10 transition-opacity`}></div>
      
      <div className="relative">
        <div className="flex items-center justify-between mb-3 gap-3 min-w-0">
          <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide truncate">{title}</p>
          <div className={`text-2xl ${bgClasses[color]} w-10 h-10 flex items-center justify-center rounded-xl shrink-0`}>
            {icon}
          </div>
        </div>
        <p className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2 truncate">
          {value}
        </p>
        <p className="text-xs text-slate-500 font-medium truncate">{trend}</p>
      </div>
    </div>
  );
}

function QuickActionButton({ icon, label, color }: { icon: string; label: string; color: 'blue' | 'green' | 'purple' | 'orange' | 'gray' }) {
  const colorClasses: Record<typeof color, string> = {
    blue: 'hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700',
    green: 'hover:bg-green-50 hover:border-green-300 hover:text-green-700',
    purple: 'hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700',
    orange: 'hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700',
    gray: 'hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700',
  };

  return (
    <button 
      className={`
        w-full flex items-center gap-3 p-3 sm:p-4 
        border-2 border-slate-200 rounded-xl 
        transition-all duration-200
        hover:shadow-md hover:scale-[1.02]
        ${colorClasses[color]}
      `}
    >
      <span className="text-xl sm:text-2xl shrink-0">{icon}</span>
      <span className="font-semibold text-slate-900 truncate text-sm sm:text-base">{label}</span>
    </button>
  );
}

function ComplianceBoardRow({ item, onOpen }: { item: AdminComplianceItem; onOpen: () => void }) {
  const actionLabel =
    item.missed_week_count > 0 || item.overdue_pending_count > 0
      ? "Escalate missed tracker weeks"
      : item.review_pending_count > 0
      ? "Follow up with mentor review"
      : item.risk_level === "high"
      ? "Inspect high-risk project"
      : "Monitor routinely";

  return (
    <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 hover:border-slate-300 hover:shadow-md transition-all duration-200 bg-gradient-to-r from-white to-slate-50/40">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 truncate">{item.title || item.project_id}</h3>
            <ComplianceStatusBadge status={item.compliance_status} />
            <RiskBadge riskLevel={item.risk_level} />
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-lg bg-slate-100 px-2.5 py-1">{item.project_id}</span>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1">Mentor: {item.mentor_name || item.mentor_employee_id || "Unassigned"}</span>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1">Team size: {item.team_size}</span>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1">Health: {Number(item.health_score || 0).toFixed(1)}</span>
            {item.latest_status_new ? (
              <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-blue-700">
                Last status: {item.latest_status_old || "-"} → {item.latest_status_new}
              </span>
            ) : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <MetricPill label="Missed" value={item.missed_week_count} tone={item.missed_week_count > 0 ? "critical" : "neutral"} />
            <MetricPill label="Overdue" value={item.overdue_pending_count} tone={item.overdue_pending_count > 0 ? "critical" : "neutral"} />
            <MetricPill label="Review Pending" value={item.review_pending_count} tone={item.review_pending_count > 0 ? "warning" : "neutral"} />
            <MetricPill label="Rejected" value={item.rejected_week_count} tone={item.rejected_week_count > 0 ? "warning" : "neutral"} />
          </div>
          <p className="mt-4 text-sm text-slate-600">{actionLabel}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
            <span>Next deadline: {item.next_pending_deadline ? new Date(item.next_pending_deadline).toLocaleString() : "-"}</span>
            <span>Oldest review wait: {item.oldest_review_submitted_at ? new Date(item.oldest_review_submitted_at).toLocaleString() : "-"}</span>
            {item.latest_status_changed_at ? (
              <span>
                Last admin status update: {new Date(item.latest_status_changed_at).toLocaleString()}
                {item.latest_status_changed_by ? ` by ${item.latest_status_changed_by}` : ""}
              </span>
            ) : null}
            {item.latest_status_reason ? (
              <span className="rounded-lg bg-slate-100 px-2 py-1">Reason: {item.latest_status_reason}</span>
            ) : null}
          </div>
        </div>
        <div className="shrink-0">
          <button
            onClick={onOpen}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Open Project
          </button>
        </div>
      </div>
    </div>
  );
}

function ComplianceStatusBadge({ status }: { status: AdminComplianceItem["compliance_status"] }) {
  const classes: Record<AdminComplianceItem["compliance_status"], string> = {
    healthy: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    critical: "bg-rose-100 text-rose-700",
  };

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classes[status]}`}>{status}</span>;
}

function RiskBadge({ riskLevel }: { riskLevel: AdminComplianceItem["risk_level"] }) {
  const classes: Record<AdminComplianceItem["risk_level"], string> = {
    low: "bg-slate-100 text-slate-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-rose-100 text-rose-700",
  };

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classes[riskLevel]}`}>risk: {riskLevel}</span>;
}

function MetricPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "warning" | "critical";
}) {
  const classes = {
    neutral: "bg-slate-100 text-slate-700",
    warning: "bg-amber-100 text-amber-700",
    critical: "bg-rose-100 text-rose-700",
  };

  return (
    <div className={`rounded-xl px-3 py-2 ${classes[tone]}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  tone = "neutral",
  onClick,
}: {
  label: string;
  active: boolean;
  tone?: "neutral" | "healthy" | "warning" | "critical";
  onClick: () => void;
}) {
  const tones = {
    neutral: active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200",
    healthy: active ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
    warning: active ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-700 hover:bg-amber-200",
    critical: active ? "bg-rose-600 text-white" : "bg-rose-100 text-rose-700 hover:bg-rose-200",
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${tones[tone]}`}
    >
      {label}
    </button>
  );
}

interface StatusItemProps {
  label: string;
  status: string;
  color: 'green' | 'blue' | 'red';
}

function StatusItem({ label, status, color }: StatusItemProps) {
  const colorClasses: Record<StatusItemProps['color'], string> = {
    green: 'bg-green-100 text-green-700 border-green-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    red: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <div className="flex items-center justify-between gap-2 py-3 border-b border-slate-200 last:border-0 min-w-0">
      <span className="font-semibold text-slate-900 truncate">{label}</span>
      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${colorClasses[color]} whitespace-nowrap`}>
        {status}
      </span>
    </div>
  );
}
