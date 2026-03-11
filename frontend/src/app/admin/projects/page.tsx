"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "@/lib/axios";
import MentorSelectionModal from "@/components/modals/MentorSelectionModal";
import {
  getAdminComplianceBoard,
  getProjectStatusHistory,
  type AdminComplianceBoardResponse,
  type AdminComplianceItem,
  type ProjectStatusHistoryItem,
} from "@/services/tracker.service";

type ComplianceFilter = "all" | AdminComplianceItem["compliance_status"];

type PendingProject = {
  project_id: string;
  title: string;
  description: string;
  tech_stack: string[];
  created_at?: string;
};

const emptyBoard: AdminComplianceBoardResponse = {
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
};

export default function AdminProjectsPage() {
  const searchParams = useSearchParams();
  const focusProjectId = searchParams.get("projectId") || "";

  const [board, setBoard] = useState<AdminComplianceBoardResponse>(emptyBoard);
  const [pendingProjects, setPendingProjects] = useState<PendingProject[]>([]);
  const [filter, setFilter] = useState<ComplianceFilter>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPendingProject, setSelectedPendingProject] = useState<PendingProject | null>(null);
  const [statusHistory, setStatusHistory] = useState<ProjectStatusHistoryItem[]>([]);

  const pendingMap = useMemo(
    () => new Map(pendingProjects.map((p) => [String(p.project_id), p])),
    [pendingProjects]
  );

  const totalPages = Math.max(1, Math.ceil((board.pagination.total || 0) / (board.pagination.pageSize || 8)));

  const fetchData = useCallback(async ({ keepLoading = false }: { keepLoading?: boolean } = {}) => {
    try {
      if (!keepLoading) setLoading(true);
      setError("");

      const [complianceRes, pendingRes] = await Promise.allSettled([
        getAdminComplianceBoard({
          status: filter === "all" ? undefined : filter,
          page,
          pageSize: 8,
        }),
        axios.get("/project/admin/pending"),
      ]);

      if (complianceRes.status === "fulfilled") {
        setBoard(complianceRes.value);
      } else {
        setBoard((prev) => ({ ...prev, items: [] }));
      }

      if (pendingRes.status === "fulfilled") {
        setPendingProjects(pendingRes.value.data.projects || []);
      } else {
        setPendingProjects([]);
      }
    } catch {
      setError("Failed to load project oversight data");
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!focusProjectId) {
      setStatusHistory([]);
      return;
    }

    void getProjectStatusHistory(String(focusProjectId), 12)
      .then((items) => setStatusHistory(items || []))
      .catch(() => setStatusHistory([]));
  }, [focusProjectId]);

  const handleMentorAssigned = () => {
    void fetchData({ keepLoading: true });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Project Oversight</h1>
            <p className="mt-1 text-sm text-slate-500">Tracker compliance, pending approvals, and mentor assignment workflow.</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge tone="critical" label={`Critical ${board.summary.critical_projects}`} />
            <Badge tone="warning" label={`Warning ${board.summary.warning_projects}`} />
            <Badge tone="healthy" label={`Healthy ${board.summary.healthy_projects}`} />
          </div>
        </div>
      </section>

      {focusProjectId ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Status History ({focusProjectId})</h2>
            <span className="text-xs text-slate-500">Latest {statusHistory.length} event(s)</span>
          </div>

          {statusHistory.length === 0 ? (
            <p className="text-sm text-slate-500">No status history available for this project yet.</p>
          ) : (
            <div className="space-y-2">
              {statusHistory.map((item, index) => (
                <div key={`${item.project_id}-${item.created_at}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{item.source}</span>
                    <span>{item.event_type}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-800">
                    {(item.old_status || '-') + ' → ' + (item.new_status || '-')}
                    {item.reason ? ` · ${item.reason}` : ''}
                    {item.changed_by ? ` · by ${item.changed_by}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <FilterChip label={`All (${board.summary.total_projects})`} active={filter === "all"} onClick={() => { setFilter("all"); setPage(1); }} />
            <FilterChip label={`Critical (${board.summary.critical_projects})`} tone="critical" active={filter === "critical"} onClick={() => { setFilter("critical"); setPage(1); }} />
            <FilterChip label={`Warning (${board.summary.warning_projects})`} tone="warning" active={filter === "warning"} onClick={() => { setFilter("warning"); setPage(1); }} />
            <FilterChip label={`Healthy (${board.summary.healthy_projects})`} tone="healthy" active={filter === "healthy"} onClick={() => { setFilter("healthy"); setPage(1); }} />
          </div>
          <div className="text-xs text-slate-600">Pending approvals: <span className="font-semibold">{pendingProjects.length}</span></div>
        </div>

        {error && <div className="mb-4 rounded-xl bg-rose-100 px-4 py-2 text-sm text-rose-700">{error}</div>}

        {loading ? (
          <div className="py-16 text-center text-slate-500">Loading project oversight...</div>
        ) : board.items.length === 0 ? (
          <div className="py-16 text-center text-slate-500">No projects found for selected filter.</div>
        ) : (
          <div className="space-y-4">
            {board.items.map((item) => {
              const pendingProject = pendingMap.get(String(item.project_id));
              const isFocused = focusProjectId && String(item.project_id) === String(focusProjectId);

              return (
                <div
                  key={item.project_id}
                  className={`rounded-2xl border p-4 transition ${isFocused ? "border-blue-400 bg-blue-50/40" : "border-slate-200 bg-white"}`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{item.title || item.project_id}</h3>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.project_id}</span>
                        <Badge tone={item.compliance_status} label={item.compliance_status} />
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">risk: {item.risk_level}</span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                        <Metric label="Missed" value={item.missed_week_count} tone={item.missed_week_count > 0 ? "critical" : "neutral"} />
                        <Metric label="Overdue" value={item.overdue_pending_count} tone={item.overdue_pending_count > 0 ? "critical" : "neutral"} />
                        <Metric label="Review" value={item.review_pending_count} tone={item.review_pending_count > 0 ? "warning" : "neutral"} />
                        <Metric label="Health" value={Number(item.health_score || 0).toFixed(1)} tone="neutral" />
                      </div>

                      <div className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
                        Predictive warning: <span className="font-semibold">{item.predictive_warning_score}</span>
                        {item.predictive_warning_reasons?.length
                          ? ` · ${item.predictive_warning_reasons.join(', ')}`
                          : ' · no active warning factors'}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span>Mentor: {item.mentor_name || item.mentor_employee_id || "Unassigned"}</span>
                        <span>Team size: {item.team_size}</span>
                        <span>Next deadline: {item.next_pending_deadline ? new Date(item.next_pending_deadline).toLocaleString() : "-"}</span>
                      </div>

                      {item.latest_status_new ? (
                        <div className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
                          Last status update: {item.latest_status_old || "-"} → {item.latest_status_new}
                          {item.latest_status_changed_by ? ` by ${item.latest_status_changed_by}` : ""}
                          {item.latest_status_reason ? ` · ${item.latest_status_reason}` : ""}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => window.location.assign(`/admin/dashboard?projectId=${encodeURIComponent(String(item.project_id))}`)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Back to Dashboard
                      </button>
                      <button
                        disabled={!pendingProject}
                        onClick={() => {
                          if (!pendingProject) return;
                          setSelectedPendingProject(pendingProject);
                          setModalOpen(true);
                        }}
                        className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Assign Mentor
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-600">Page {board.pagination.page} of {totalPages} · {board.pagination.total} project(s)</p>
              <div className="flex items-center gap-2">
                <button
                  disabled={board.pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  disabled={board.pagination.page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <MentorSelectionModal
        isOpen={modalOpen && !!selectedPendingProject}
        onClose={() => setModalOpen(false)}
        projectId={String(selectedPendingProject?.project_id || "")}
        projectTitle={String(selectedPendingProject?.title || "")}
        onMentorAssigned={handleMentorAssigned}
      />
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
    <button onClick={onClick} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${tones[tone]}`}>
      {label}
    </button>
  );
}

function Badge({ tone, label }: { tone: "healthy" | "warning" | "critical"; label: string }) {
  const tones = {
    healthy: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    critical: "bg-rose-100 text-rose-700",
  };

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{label}</span>;
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "neutral" | "warning" | "critical";
}) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700",
    warning: "bg-amber-100 text-amber-700",
    critical: "bg-rose-100 text-rose-700",
  };

  return (
    <div className={`rounded-lg px-3 py-2 ${tones[tone]}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide">{label}</div>
      <div className="text-base font-bold">{value}</div>
    </div>
  );
}
