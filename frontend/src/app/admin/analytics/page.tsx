"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import EscalationDetailModal from "@/components/modals/EscalationDetailModal";
import MentorEffectivenessDetailModal from "@/components/modals/MentorEffectivenessDetailModal";
import StudentLearningDetailModal from "@/components/modals/StudentLearningDetailModal";
import RiskHeatmap from "@/components/charts/RiskHeatmap";
import HealthDashboard from "@/components/charts/HealthDashboard";
import { Input } from "@/components/ui/input";
import {
  applyAdminEscalationBatchAction,
  downloadStudentLearningExport,
  downloadGovernanceExport,
  downloadMentorEffectivenessExport,
  getAdminComplianceBoard,
  getAdminEscalationBoard,
  getAdminMentorEffectivenessDetail,
  getAdminMentorEffectiveness,
  getAdminMentorLoadTrends,
  getAdminStudentLearningDetail,
  getAdminStudentLearning,
  getEscalationDetail,
  updateEscalationFollowUp,
  type AdminComplianceItem,
  type AdminComplianceSummary,
  type AdminEscalationItem,
  type AdminMentorLoadItem,
  type EscalationDetailResponse,
  type MentorEffectivenessDetail,
  type MentorEffectivenessResponse,
  type StudentLearningDetail,
  type StudentLearningResponse,
} from "@/services/tracker.service";

type MentorSortKey = "mentorName" | "reviewCount" | "avgTurnaroundMs" | "avgFeedbackDepth" | "richFeedbackRatioPercent" | "activeProjectCount";
type StudentSortKey = "studentName" | "projectId" | "avgQualityScore" | "revisionCount" | "acceptanceRate" | "learningVelocity";
type ComplianceStatusFilter = "all" | "critical" | "warning" | "healthy";

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [complianceItems, setComplianceItems] = useState<AdminComplianceItem[]>([]);
  const [complianceSummary, setComplianceSummary] = useState<AdminComplianceSummary>({
    total_projects: 0,
    critical_projects: 0,
    warning_projects: 0,
    healthy_projects: 0,
    follow_up_required: 0,
  });
  const [complianceTotal, setComplianceTotal] = useState(0);
  const [escalations, setEscalations] = useState<AdminEscalationItem[]>([]);
  const [mentorLoad, setMentorLoad] = useState<AdminMentorLoadItem[]>([]);
  const [studentLearning, setStudentLearning] = useState<StudentLearningResponse>({
    summary: {
      totalStudents: 0,
      improvingCount: 0,
      stableCount: 0,
      decliningCount: 0,
      avgAcceptanceRate: 0,
    },
    items: [],
  });
  const [selectedStudentLearning, setSelectedStudentLearning] = useState<StudentLearningDetail | null>(null);
  const [studentLearningModalOpen, setStudentLearningModalOpen] = useState(false);
  const [studentLearningDetailLoading, setStudentLearningDetailLoading] = useState(false);
  const [selectedMentorEffectiveness, setSelectedMentorEffectiveness] = useState<MentorEffectivenessDetail | null>(null);
  const [mentorEffectivenessModalOpen, setMentorEffectivenessModalOpen] = useState(false);
  const [mentorEffectivenessDetailLoading, setMentorEffectivenessDetailLoading] = useState(false);
  const [selectedEscalationDetail, setSelectedEscalationDetail] = useState<EscalationDetailResponse | null>(null);
  const [escalationModalOpen, setEscalationModalOpen] = useState(false);
  const [escalationDetailLoading, setEscalationDetailLoading] = useState(false);
  const [escalationStateBusy, setEscalationStateBusy] = useState(false);
  const [resolutionState, setResolutionState] = useState<"open" | "acknowledged" | "in_follow_up" | "resolved" | "deferred">("acknowledged");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [mentorEffectiveness, setMentorEffectiveness] = useState<MentorEffectivenessResponse>({
    summary: {
      totalMentors: 0,
      avgReviewCount: 0,
      avgTurnaroundMs: 0,
      avgFeedbackDepth: 0,
      healthyCount: 0,
      warningCount: 0,
      criticalCount: 0,
    },
    items: [],
  });
  const [exporting, setExporting] = useState<"json" | "csv" | "">("");
  const [selectedEscalations, setSelectedEscalations] = useState<string[]>([]);
  const [batchNote, setBatchNote] = useState("");
  const [batchAction, setBatchAction] = useState<"acknowledge" | "follow_up">("acknowledge");
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchMessage, setBatchMessage] = useState("");
  const [mentorQuery, setMentorQuery] = useState(() => searchParams.get("mq") ?? "");
  const [studentQuery, setStudentQuery] = useState(() => searchParams.get("sq") ?? "");
  const [escalationQuery, setEscalationQuery] = useState(() => searchParams.get("eq") ?? "");
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatusFilter>(() => ((searchParams.get("cst") as ComplianceStatusFilter) || "all"));
  const [compliancePage, setCompliancePage] = useState(() => Number(searchParams.get("cp") || 1));
  const [compliancePageSize, setCompliancePageSize] = useState(() => Number(searchParams.get("cps") || 20));
  const [mentorSortKey, setMentorSortKey] = useState<MentorSortKey>(() => ((searchParams.get("msk") as MentorSortKey) || "reviewCount"));
  const [mentorSortDirection, setMentorSortDirection] = useState<"asc" | "desc">(() => (searchParams.get("msd") === "asc" ? "asc" : "desc"));
  const [studentSortKey, setStudentSortKey] = useState<StudentSortKey>(() => ((searchParams.get("ssk") as StudentSortKey) || "avgQualityScore"));
  const [studentSortDirection, setStudentSortDirection] = useState<"asc" | "desc">(() => (searchParams.get("ssd") === "asc" ? "asc" : "desc"));
  const [mentorVisibleCount, setMentorVisibleCount] = useState(() => Number(searchParams.get("mlim") || 50));
  const [studentVisibleCount, setStudentVisibleCount] = useState(() => Number(searchParams.get("slim") || 50));
  const [escalationVisibleCount, setEscalationVisibleCount] = useState(() => Number(searchParams.get("elim") || 8));
  const mentorRefetchMountRef = useRef(false);
  const studentRefetchMountRef = useRef(false);
  const complianceRefetchMountRef = useRef(false);
  const initialSearchParamsRef = useRef(searchParams);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        const initialMq = initialSearchParamsRef.current.get("mq") ?? "";
        const initialMlim = Number(initialSearchParamsRef.current.get("mlim") || 50);
        const initialSq = initialSearchParamsRef.current.get("sq") ?? "";
        const initialSlim = Number(initialSearchParamsRef.current.get("slim") || 50);
        const initialCst = ((initialSearchParamsRef.current.get("cst") as ComplianceStatusFilter) || "all");
        const initialCp = Number(initialSearchParamsRef.current.get("cp") || 1);
        const initialCps = Number(initialSearchParamsRef.current.get("cps") || 20);

        const [board, escalationBoard, mentorItems, effectivenessData, learningData] = await Promise.all([
          getAdminComplianceBoard({
            status: initialCst === "all" ? undefined : initialCst,
            page: Math.max(1, initialCp),
            pageSize: [10, 20, 50].includes(initialCps) ? initialCps : 20,
          }),
          getAdminEscalationBoard(20),
          getAdminMentorLoadTrends(20),
          getAdminMentorEffectiveness({ q: initialMq, pageSize: initialMlim }),
          getAdminStudentLearning({ q: initialSq, pageSize: initialSlim }),
        ]);

        setComplianceItems(board.items || []);
        setComplianceSummary(board.summary);
        setComplianceTotal(board.pagination?.total || 0);
        complianceRefetchMountRef.current = true;
        setEscalations(escalationBoard.items || []);
        setMentorLoad(mentorItems || []);
        setMentorEffectiveness(effectivenessData);
        mentorRefetchMountRef.current = true;
        setStudentLearning(learningData);
        studentRefetchMountRef.current = true;
      } catch {
        setError("Failed to load admin analytics");
      } finally {
        setLoading(false);
      }
    };

    void loadAnalytics();
  }, []);

  useEffect(() => {
    if (!actionFeedback) return;

    const timer = window.setTimeout(() => setActionFeedback(null), 3000);
    return () => window.clearTimeout(timer);
  }, [actionFeedback]);

  useEffect(() => {
    setMentorQuery(searchParams.get("mq") ?? "");
    setStudentQuery(searchParams.get("sq") ?? "");
    setEscalationQuery(searchParams.get("eq") ?? "");
    setComplianceStatus(((searchParams.get("cst") as ComplianceStatusFilter) || "all"));
    setCompliancePage(Math.max(1, Number(searchParams.get("cp") || 1)));
    setCompliancePageSize([10, 20, 50].includes(Number(searchParams.get("cps") || 20)) ? Number(searchParams.get("cps") || 20) : 20);
    setMentorSortKey(((searchParams.get("msk") as MentorSortKey) || "reviewCount"));
    setMentorSortDirection(searchParams.get("msd") === "asc" ? "asc" : "desc");
    setStudentSortKey(((searchParams.get("ssk") as StudentSortKey) || "avgQualityScore"));
    setStudentSortDirection(searchParams.get("ssd") === "asc" ? "asc" : "desc");
    setMentorVisibleCount(Number(searchParams.get("mlim") || 50));
    setStudentVisibleCount(Number(searchParams.get("slim") || 50));
    setEscalationVisibleCount(Number(searchParams.get("elim") || 8));
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    setQueryParam(params, "mq", mentorQuery);
    setQueryParam(params, "sq", studentQuery);
    setQueryParam(params, "eq", escalationQuery);
    setQueryParam(params, "cst", complianceStatus, "all");
    setNumericQueryParam(params, "cp", compliancePage, 1);
    setNumericQueryParam(params, "cps", compliancePageSize, 20);
    setQueryParam(params, "msk", mentorSortKey, "reviewCount");
    setQueryParam(params, "msd", mentorSortDirection, "desc");
    setQueryParam(params, "ssk", studentSortKey, "avgQualityScore");
    setQueryParam(params, "ssd", studentSortDirection, "desc");
    setNumericQueryParam(params, "mlim", mentorVisibleCount, 50);
    setNumericQueryParam(params, "slim", studentVisibleCount, 50);
    setNumericQueryParam(params, "elim", escalationVisibleCount, 8);
    setQueryParam(params, "md", mentorEffectivenessModalOpen && selectedMentorEffectiveness?.mentorId ? selectedMentorEffectiveness.mentorId : "");
    setQueryParam(params, "sp", studentLearningModalOpen && selectedStudentLearning?.projectId ? selectedStudentLearning.projectId : "");
    setQueryParam(params, "su", studentLearningModalOpen && selectedStudentLearning?.studentKey ? selectedStudentLearning.studentKey : "");
    setQueryParam(params, "ed", escalationModalOpen && selectedEscalationDetail?.escalationId ? selectedEscalationDetail.escalationId : "");

    const next = params.toString();
    const current = searchParams.toString();
    if (next !== current) {
      router.replace(`${pathname}${next ? `?${next}` : ""}`, { scroll: false });
    }
  }, [
    escalationModalOpen,
    compliancePage,
    compliancePageSize,
    complianceStatus,
    escalationQuery,
    escalationVisibleCount,
    mentorEffectivenessModalOpen,
    mentorQuery,
    mentorSortDirection,
    mentorSortKey,
    mentorVisibleCount,
    pathname,
    router,
    searchParams,
    selectedEscalationDetail,
    selectedMentorEffectiveness,
    selectedStudentLearning,
    studentLearningModalOpen,
    studentQuery,
    studentSortDirection,
    studentSortKey,
    studentVisibleCount,
  ]);

  // Re-fetch mentors when query or page size changes (skips initial mount)
  useEffect(() => {
    if (!mentorRefetchMountRef.current) return;
    const timer = window.setTimeout(async () => {
      try {
        const data = await getAdminMentorEffectiveness({ q: mentorQuery, pageSize: mentorVisibleCount });
        setMentorEffectiveness(data);
      } catch { /* silent */ }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [mentorQuery, mentorVisibleCount]);

  // Re-fetch students when query or page size changes (skips initial mount)
  useEffect(() => {
    if (!studentRefetchMountRef.current) return;
    const timer = window.setTimeout(async () => {
      try {
        const data = await getAdminStudentLearning({ q: studentQuery, pageSize: studentVisibleCount });
        setStudentLearning(data);
      } catch { /* silent */ }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [studentQuery, studentVisibleCount]);

  // Re-fetch compliance board when filters/pagination change (skips initial mount)
  useEffect(() => {
    if (!complianceRefetchMountRef.current) return;
    const timer = window.setTimeout(async () => {
      try {
        const board = await getAdminComplianceBoard({
          status: complianceStatus === "all" ? undefined : complianceStatus,
          page: compliancePage,
          pageSize: compliancePageSize,
        });
        setComplianceItems(board.items || []);
        setComplianceSummary(board.summary);
        setComplianceTotal(board.pagination?.total || 0);
      } catch {
        // keep current data if transient request fails
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [compliancePage, compliancePageSize, complianceStatus]);

  const warningDistribution = useMemo(() => ({
    high: complianceItems.filter((item) => item.predictive_warning_priority === "high").length,
    medium: complianceItems.filter((item) => item.predictive_warning_priority === "medium").length,
    low: complianceItems.filter((item) => item.predictive_warning_priority === "low").length,
  }), [complianceItems]);

  const topWarnings = useMemo(
    () => [...complianceItems].sort((a, b) => b.predictive_warning_score - a.predictive_warning_score),
    [complianceItems]
  );

  const filteredEscalations = useMemo(() => {
    const query = escalationQuery.trim().toLowerCase();
    if (!query) return escalations;

    return escalations.filter((item) =>
      `${item.project_id} ${item.week_number} ${item.escalation_type} ${item.risk_level}`.toLowerCase().includes(query)
    );
  }, [escalations, escalationQuery]);

  const sortedMentorEffectiveness = useMemo(() => {
    return [...mentorEffectiveness.items].sort((left, right) => {
      const direction = mentorSortDirection === "asc" ? 1 : -1;
      switch (mentorSortKey) {
        case "mentorName":
          return direction * left.mentorName.localeCompare(right.mentorName);
        case "avgTurnaroundMs":
          return direction * ((left.avgTurnaroundMs || 0) - (right.avgTurnaroundMs || 0));
        case "avgFeedbackDepth":
          return direction * (left.avgFeedbackDepth - right.avgFeedbackDepth);
        case "richFeedbackRatioPercent":
          return direction * (left.richFeedbackRatioPercent - right.richFeedbackRatioPercent);
        case "activeProjectCount":
          return direction * (left.activeProjectCount - right.activeProjectCount);
        case "reviewCount":
        default:
          return direction * (left.reviewCount - right.reviewCount);
      }
    });
  }, [mentorEffectiveness.items, mentorSortDirection, mentorSortKey]);

  const sortedStudentLearning = useMemo(() => {
    return [...studentLearning.items].sort((left, right) => {
      const direction = studentSortDirection === "asc" ? 1 : -1;
      switch (studentSortKey) {
        case "studentName":
          return direction * left.studentName.localeCompare(right.studentName);
        case "projectId":
          return direction * left.projectId.localeCompare(right.projectId);
        case "revisionCount":
          return direction * (left.revisionCount - right.revisionCount);
        case "acceptanceRate":
          return direction * (left.acceptanceRate - right.acceptanceRate);
        case "learningVelocity":
          return direction * (left.learningVelocity - right.learningVelocity);
        case "avgQualityScore":
        default:
          return direction * (left.avgQualityScore - right.avgQualityScore);
      }
    });
  }, [studentLearning.items, studentSortDirection, studentSortKey]);

  useEffect(() => {
    if (loading) return;

    const mentorId = searchParams.get("md");
    const studentProjectId = searchParams.get("sp");
    const studentKey = searchParams.get("su");
    const escalationId = searchParams.get("ed");

    if (!mentorId && mentorEffectivenessModalOpen) {
      setMentorEffectivenessModalOpen(false);
      setSelectedMentorEffectiveness(null);
    } else if (mentorId && (!mentorEffectivenessModalOpen || selectedMentorEffectiveness?.mentorId !== mentorId)) {
      void (async () => {
        setMentorEffectivenessModalOpen(true);
        setMentorEffectivenessDetailLoading(true);
        try {
          const detail = await getAdminMentorEffectivenessDetail(mentorId);
          setSelectedMentorEffectiveness(detail);
        } finally {
          setMentorEffectivenessDetailLoading(false);
        }
      })();
    }

    if ((!studentProjectId || !studentKey) && studentLearningModalOpen) {
      setStudentLearningModalOpen(false);
      setSelectedStudentLearning(null);
    } else if (
      studentProjectId &&
      studentKey &&
      (!studentLearningModalOpen || selectedStudentLearning?.projectId !== studentProjectId || selectedStudentLearning?.studentKey !== studentKey)
    ) {
      void (async () => {
        setStudentLearningModalOpen(true);
        setStudentLearningDetailLoading(true);
        try {
          const detail = await getAdminStudentLearningDetail(studentProjectId, studentKey);
          setSelectedStudentLearning(detail);
        } finally {
          setStudentLearningDetailLoading(false);
        }
      })();
    }

    if (!escalationId && escalationModalOpen) {
      setEscalationModalOpen(false);
      setSelectedEscalationDetail(null);
    } else if (escalationId && (!escalationModalOpen || selectedEscalationDetail?.escalationId !== escalationId)) {
      void (async () => {
        setEscalationModalOpen(true);
        setEscalationDetailLoading(true);
        try {
          const detail = await getEscalationDetail(Number(escalationId));
          setSelectedEscalationDetail(detail);
          setResolutionState(detail?.currentState || "acknowledged");
          setResolutionNotes("");
        } finally {
          setEscalationDetailLoading(false);
        }
      })();
    }
  }, [
    escalationModalOpen,
    loading,
    mentorEffectivenessModalOpen,
    searchParams,
    selectedEscalationDetail,
    selectedMentorEffectiveness,
    selectedStudentLearning,
    studentLearningModalOpen,
  ]);

  const handleDownload = async (format: "json" | "csv") => {
    try {
      setExporting(format);
      const blob = await downloadGovernanceExport(format, {
        status: complianceStatus === "all" ? undefined : complianceStatus,
        page: compliancePage,
        pageSize: compliancePageSize,
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `tracker-governance.${format}`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      setActionFeedback({ type: "success", message: `Governance export downloaded as ${format.toUpperCase()}.` });
    } catch {
      setActionFeedback({ type: "error", message: "Governance export failed." });
    } finally {
      setExporting("");
    }
  };

  const handleDownloadMentorEffectiveness = async (format: "json" | "csv") => {
    try {
      setExporting(format);
      const blob = await downloadMentorEffectivenessExport(format);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `mentor-effectiveness.${format}`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      setActionFeedback({ type: "success", message: `Mentor effectiveness export downloaded as ${format.toUpperCase()}.` });
    } catch {
      setActionFeedback({ type: "error", message: "Mentor effectiveness export failed." });
    } finally {
      setExporting("");
    }
  };

  const handleDownloadStudentLearning = async (format: "json" | "csv") => {
    try {
      setExporting(format);
      const blob = await downloadStudentLearningExport(format);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `student-learning.${format}`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      setActionFeedback({ type: "success", message: `Student learning export downloaded as ${format.toUpperCase()}.` });
    } catch {
      setActionFeedback({ type: "error", message: "Student learning export failed." });
    } finally {
      setExporting("");
    }
  };

  const toggleEscalation = (key: string) => {
    setSelectedEscalations((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const handleBatchAction = async () => {
    const selected = escalations.filter((item) =>
      selectedEscalations.includes(`${item.project_id}:${item.week_id}`)
    );

    if (selected.length === 0) {
      setBatchMessage("Select at least one escalation item.");
      setActionFeedback({ type: "error", message: "Select at least one escalation before applying a batch action." });
      return;
    }

    try {
      setBatchBusy(true);
      setBatchMessage("");

      await applyAdminEscalationBatchAction({
        action: batchAction,
        note: batchNote,
        items: selected.map((item) => ({
          projectId: item.project_id,
          weekId: item.week_id,
          escalationType: item.escalation_type,
          escalationSeverity: item.escalation_severity,
        })),
      });

      setBatchMessage(`${selected.length} escalation item(s) updated.`);
      setActionFeedback({ type: "success", message: `${selected.length} escalation item(s) updated.` });
      setSelectedEscalations([]);
      setBatchNote("");
    } catch {
      setBatchMessage("Failed to apply escalation batch action.");
      setActionFeedback({ type: "error", message: "Escalation batch action failed." });
    } finally {
      setBatchBusy(false);
    }
  };

  const openStudentLearningDetail = async (projectId: string, studentKey: string) => {
    try {
      setStudentLearningModalOpen(true);
      setStudentLearningDetailLoading(true);
      const detail = await getAdminStudentLearningDetail(projectId, studentKey);
      setSelectedStudentLearning(detail);
    } finally {
      setStudentLearningDetailLoading(false);
    }
  };

  const openMentorEffectivenessDetail = async (mentorId: string) => {
    try {
      setMentorEffectivenessModalOpen(true);
      setMentorEffectivenessDetailLoading(true);
      const detail = await getAdminMentorEffectivenessDetail(mentorId);
      setSelectedMentorEffectiveness(detail);
    } finally {
      setMentorEffectivenessDetailLoading(false);
    }
  };

  const openEscalationDetail = async (weekId: number) => {
    try {
      setEscalationModalOpen(true);
      setEscalationDetailLoading(true);
      const detail = await getEscalationDetail(weekId);
      setSelectedEscalationDetail(detail);
      setResolutionState(detail?.currentState || "acknowledged");
      setResolutionNotes("");
    } finally {
      setEscalationDetailLoading(false);
    }
  };

  const submitEscalationFollowUp = async () => {
    if (!selectedEscalationDetail) return;

    try {
      setEscalationStateBusy(true);
      const updated = await updateEscalationFollowUp(Number(selectedEscalationDetail.escalationId), {
        resolutionState,
        resolutionNotes: resolutionNotes.trim() || undefined,
      });

      if (updated) {
        setSelectedEscalationDetail(updated);
        setResolutionState(updated.currentState);
        setResolutionNotes("");
        setActionFeedback({ type: "success", message: `Escalation moved to ${updated.currentState.replace(/_/g, " ")}.` });
      }
    } catch {
      setActionFeedback({ type: "error", message: "Escalation follow-up update failed." });
    } finally {
      setEscalationStateBusy(false);
    }
  };

  const toggleMentorSort = (key: MentorSortKey) => {
    if (mentorSortKey === key) {
      setMentorSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setMentorSortKey(key);
    setMentorSortDirection(key === "mentorName" ? "asc" : "desc");
  };

  const toggleStudentSort = (key: StudentSortKey) => {
    if (studentSortKey === key) {
      setStudentSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setStudentSortKey(key);
    setStudentSortDirection(key === "studentName" || key === "projectId" ? "asc" : "desc");
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Tracker Analytics</h1>
            <p className="mt-1 text-sm text-slate-500">
              Predictive warnings, governance export, and mentor workload visibility for tracker operations.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void handleDownload("json")}
              disabled={exporting !== ""}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
            >
              {exporting === "json" ? "Exporting..." : "Export JSON"}
            </button>
            <button
              onClick={() => void handleDownload("csv")}
              disabled={exporting !== ""}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {exporting === "csv" ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {actionFeedback ? (
        <div className={`rounded-xl px-4 py-3 text-sm ${actionFeedback.type === "success" ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-rose-200 bg-rose-50 text-rose-700"}`}>
          {actionFeedback.message}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">Loading analytics...</div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard title="High Warning Score" value={warningDistribution.high} subtitle="Immediate intervention" tone="critical" />
            <SummaryCard title="Medium Warning Score" value={warningDistribution.medium} subtitle="Watch closely" tone="warning" />
            <SummaryCard title="Active Escalations" value={escalations.length} subtitle="Pending SLA breach handling" tone={escalations.length > 0 ? "critical" : "healthy"} />
            <SummaryCard title="Follow-up Required" value={complianceSummary.follow_up_required} subtitle="Compliance board summary" tone={complianceSummary.follow_up_required > 0 ? "warning" : "healthy"} />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
              <h2 className="font-semibold text-slate-900 mb-4">Project Health Distribution</h2>
              <HealthDashboard summary={complianceSummary} height={350} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
              <h2 className="font-semibold text-slate-900 mb-4">Project Risk Heatmap</h2>
              <RiskHeatmap items={complianceItems} height={350} />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-900">Predictive Warning Queue</h2>
                    <p className="text-sm text-slate-500">Projects sorted by warning score and explainable factors.</p>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={complianceStatus}
                      onChange={(event) => {
                        setComplianceStatus(event.target.value as ComplianceStatusFilter);
                        setCompliancePage(1);
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                    >
                      <option value="all">All statuses</option>
                      <option value="critical">Critical</option>
                      <option value="warning">Warning</option>
                      <option value="healthy">Healthy</option>
                    </select>

                    <select
                      value={compliancePageSize}
                      onChange={(event) => {
                        setCompliancePageSize(Number(event.target.value));
                        setCompliancePage(1);
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                    >
                      <option value={10}>10 / page</option>
                      <option value={20}>20 / page</option>
                      <option value={50}>50 / page</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="space-y-3 p-4">
                {topWarnings.length === 0 ? (
                  <p className="text-sm text-slate-500">No tracker warning data available.</p>
                ) : (
                  topWarnings.map((item) => (
                    <div key={item.project_id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">{item.title || item.project_id}</h3>
                            <PriorityBadge priority={item.predictive_warning_priority} />
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{item.project_id}</span>
                          </div>
                          <p className="mt-2 text-xs text-slate-600">
                            Reasons: {item.predictive_warning_reasons.length > 0 ? item.predictive_warning_reasons.join(", ") : "none"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Warning score</p>
                          <p className="text-2xl font-bold text-slate-900">{item.predictive_warning_score}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-600">
                  <span>
                    Page {compliancePage} · Showing {complianceItems.length} of {complianceTotal}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={compliancePage <= 1}
                      onClick={() => setCompliancePage((current) => Math.max(1, current - 1))}
                      className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={compliancePage * compliancePageSize >= complianceTotal}
                      onClick={() => setCompliancePage((current) => current + 1)}
                      className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">Escalation Summary</h2>
              <div className="mt-3">
                <Input
                  value={escalationQuery}
                  onChange={(event) => setEscalationQuery(event.target.value)}
                  placeholder="Search by project, week, escalation type, or risk"
                />
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {filteredEscalations.length === 0 ? (
                  <p className="text-slate-500">No live escalations.</p>
                ) : (
                  filteredEscalations.slice(0, escalationVisibleCount).map((item) => (
                    <div key={`${item.project_id}-${item.week_id}`} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedEscalations.includes(`${item.project_id}:${item.week_id}`)}
                        onChange={() => toggleEscalation(`${item.project_id}:${item.week_id}`)}
                        className="mt-1 h-4 w-4"
                      />
                      <button
                        type="button"
                        onClick={() => void openEscalationDetail(item.week_id)}
                        className="flex-1 text-left"
                      >
                        <p className="font-semibold text-slate-800">{item.project_id} · Week {item.week_number}</p>
                        <p className="text-xs text-slate-600">{item.escalation_type} · {Number(item.overdue_hours).toFixed(1)}h · {item.risk_level}</p>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {filteredEscalations.length > escalationVisibleCount ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setEscalationVisibleCount((current) => current + 8)}
                    className="text-xs font-semibold text-blue-700 hover:underline"
                  >
                    Show more escalations ({filteredEscalations.length - escalationVisibleCount} more)
                  </button>
                </div>
              ) : null}

              {escalations.length > 0 ? (
                <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBatchAction("acknowledge")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${batchAction === "acknowledge" ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-300"}`}
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={() => setBatchAction("follow_up")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${batchAction === "follow_up" ? "bg-blue-600 text-white" : "bg-white text-slate-700 border border-slate-300"}`}
                    >
                      Add Follow-up Note
                    </button>
                  </div>

                  <textarea
                    value={batchNote}
                    onChange={(event) => setBatchNote(event.target.value)}
                    rows={3}
                    placeholder="Optional note for selected escalation items"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">Selected: {selectedEscalations.length}</p>
                    <button
                      onClick={() => void handleBatchAction()}
                      disabled={batchBusy}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      {batchBusy ? "Applying..." : "Apply Batch Action"}
                    </button>
                  </div>

                  {batchMessage ? <p className="text-xs text-slate-600">{batchMessage}</p> : null}
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">Mentor Effectiveness</h2>
                  <p className="text-sm text-slate-500">Review turnaround, feedback quality, and workload distribution.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleDownloadMentorEffectiveness("json")}
                    disabled={exporting !== ""}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                  >
                    {exporting === "json" ? "Exporting..." : "Export JSON"}
                  </button>
                  <button
                    onClick={() => void handleDownloadMentorEffectiveness("csv")}
                    disabled={exporting !== ""}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {exporting === "csv" ? "Exporting..." : "Export CSV"}
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <Input
                  value={mentorQuery}
                  onChange={(event) => setMentorQuery(event.target.value)}
                  placeholder="Search mentor name, ID, or workload band"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <SortableHeader label="Mentor Name" active={mentorSortKey === "mentorName"} direction={mentorSortDirection} onClick={() => toggleMentorSort("mentorName")} />
                    <SortableHeader label="Reviews" active={mentorSortKey === "reviewCount"} direction={mentorSortDirection} onClick={() => toggleMentorSort("reviewCount")} />
                    <SortableHeader label="Avg Turnaround" active={mentorSortKey === "avgTurnaroundMs"} direction={mentorSortDirection} onClick={() => toggleMentorSort("avgTurnaroundMs")} />
                    <SortableHeader label="Feedback Depth" active={mentorSortKey === "avgFeedbackDepth"} direction={mentorSortDirection} onClick={() => toggleMentorSort("avgFeedbackDepth")} />
                    <SortableHeader label="Rich %" active={mentorSortKey === "richFeedbackRatioPercent"} direction={mentorSortDirection} onClick={() => toggleMentorSort("richFeedbackRatioPercent")} />
                    <SortableHeader label="Active Projects" active={mentorSortKey === "activeProjectCount"} direction={mentorSortDirection} onClick={() => toggleMentorSort("activeProjectCount")} />
                    <th className="px-4 py-3 text-left">Workload Band</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMentorEffectiveness.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-500">No mentor matches the current search.</td>
                    </tr>
                  ) : (
                    sortedMentorEffectiveness.map((item) => (
                      <tr key={item.mentorId} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          <button
                            type="button"
                            onClick={() => void openMentorEffectivenessDetail(item.mentorId)}
                            className="text-left text-blue-700 hover:underline"
                          >
                            {item.mentorName || item.mentorId}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{item.reviewCount}</td>
                        <td className="px-4 py-3 text-slate-700">{item.avgTurnaroundFormatted}</td>
                        <td className="px-4 py-3 text-slate-700">{item.avgFeedbackDepth} chars</td>
                        <td className="px-4 py-3 text-slate-700">{item.richFeedbackRatioPercent.toFixed(0)}%</td>
                        <td className="px-4 py-3 text-slate-700">{item.activeProjectCount}</td>
                        <td className="px-4 py-3"><LoadBandBadge band={item.workloadBand} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!!mentorEffectiveness.hasMore ? (
              <div className="border-t border-slate-200 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setMentorVisibleCount((current) => current + 10)}
                  className="text-xs font-semibold text-blue-700 hover:underline"
                >
                  Show more mentors ({(mentorEffectiveness.total ?? 0) - sortedMentorEffectiveness.length} more)
                </button>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Mentor Load Trends</h2>
              <p className="text-sm text-slate-500">Queue pressure and risk concentration by mentor.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Mentor</th>
                    <th className="px-4 py-3 text-left">Assigned</th>
                    <th className="px-4 py-3 text-left">Review Queue</th>
                    <th className="px-4 py-3 text-left">Avg Queue Age</th>
                    <th className="px-4 py-3 text-left">Oldest Queue Age</th>
                    <th className="px-4 py-3 text-left">High Risk</th>
                    <th className="px-4 py-3 text-left">Band</th>
                  </tr>
                </thead>
                <tbody>
                  {mentorLoad.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-500">No mentor analytics data available.</td>
                    </tr>
                  ) : (
                    mentorLoad.map((item) => (
                      <tr key={item.mentor_employee_id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-800">{item.mentor_name || item.mentor_employee_id}</td>
                        <td className="px-4 py-3 text-slate-700">{item.assigned_projects}</td>
                        <td className="px-4 py-3 text-slate-700">{item.review_queue}</td>
                        <td className="px-4 py-3 text-slate-700">{Number(item.avg_queue_age_hours).toFixed(1)}h</td>
                        <td className="px-4 py-3 text-slate-700">{Number(item.oldest_queue_age_hours).toFixed(1)}h</td>
                        <td className="px-4 py-3 text-slate-700">{item.high_risk_projects}</td>
                        <td className="px-4 py-3"><LoadBandBadge band={item.load_band} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">Student Learning Progression</h2>
                  <p className="text-sm text-slate-500">Quality trend, revisions, acceptance rate, and regression risk.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleDownloadStudentLearning("json")}
                    disabled={exporting !== ""}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                  >
                    {exporting === "json" ? "Exporting..." : "Export JSON"}
                  </button>
                  <button
                    onClick={() => void handleDownloadStudentLearning("csv")}
                    disabled={exporting !== ""}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {exporting === "csv" ? "Exporting..." : "Export CSV"}
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <Input
                  value={studentQuery}
                  onChange={(event) => setStudentQuery(event.target.value)}
                  placeholder="Search student, key, project, or trend direction"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <SortableHeader label="Student" active={studentSortKey === "studentName"} direction={studentSortDirection} onClick={() => toggleStudentSort("studentName")} />
                    <SortableHeader label="Project" active={studentSortKey === "projectId"} direction={studentSortDirection} onClick={() => toggleStudentSort("projectId")} />
                    <SortableHeader label="Avg Score" active={studentSortKey === "avgQualityScore"} direction={studentSortDirection} onClick={() => toggleStudentSort("avgQualityScore")} />
                    <SortableHeader label="Revisions" active={studentSortKey === "revisionCount"} direction={studentSortDirection} onClick={() => toggleStudentSort("revisionCount")} />
                    <SortableHeader label="Acceptance" active={studentSortKey === "acceptanceRate"} direction={studentSortDirection} onClick={() => toggleStudentSort("acceptanceRate")} />
                    <SortableHeader label="Velocity" active={studentSortKey === "learningVelocity"} direction={studentSortDirection} onClick={() => toggleStudentSort("learningVelocity")} />
                    <th className="px-4 py-3 text-left">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudentLearning.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-500">No student matches the current search.</td>
                    </tr>
                  ) : (
                    sortedStudentLearning.map((item) => (
                      <tr key={`${item.projectId}-${item.studentKey}`} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          <button
                            type="button"
                            onClick={() => void openStudentLearningDetail(item.projectId, item.studentKey)}
                            className="text-left text-blue-700 hover:underline"
                          >
                            {item.studentName}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{item.projectId}</td>
                        <td className="px-4 py-3 text-slate-700">{item.avgQualityScore.toFixed(1)}</td>
                        <td className="px-4 py-3 text-slate-700">{item.revisionCount}</td>
                        <td className="px-4 py-3 text-slate-700">{item.acceptanceRate.toFixed(0)}%</td>
                        <td className="px-4 py-3 text-slate-700">
                          <span className={item.learningVelocityDirection === "improving" ? "text-emerald-700" : item.learningVelocityDirection === "declining" ? "text-rose-700" : "text-amber-700"}>
                            {item.learningVelocity > 0 ? `+${item.learningVelocity}` : item.learningVelocity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{item.riskRegression ? "Regression" : "Stable"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!!studentLearning.hasMore ? (
              <div className="border-t border-slate-200 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setStudentVisibleCount((current) => current + 10)}
                  className="text-xs font-semibold text-blue-700 hover:underline"
                >
                  Show more students ({(studentLearning.total ?? 0) - sortedStudentLearning.length} more)
                </button>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Escalation Follow-up Actions</h2>
            <p className="mt-1 text-sm text-slate-500">Open an escalation to review its timeline, change state, and add notes in one place.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {escalations.slice(0, 6).map((item) => (
                <div key={`followup-${item.project_id}-${item.week_id}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-800">{item.project_id} · Week {item.week_number}</p>
                  <p className="text-[11px] text-slate-500">{item.escalation_type} · {Number(item.overdue_hours).toFixed(1)}h overdue</p>
                  <button
                    onClick={() => void openEscalationDetail(item.week_id)}
                    className="mt-2 rounded bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white"
                  >
                    Open detail
                  </button>
                </div>
              ))}
            </div>
            {selectedEscalationDetail ? <p className="mt-3 text-xs text-slate-600">Current selection: {selectedEscalationDetail.detail.project_id} · Week {selectedEscalationDetail.detail.week_number} · {selectedEscalationDetail.currentState}</p> : null}
          </section>
        </>
      )}

      <StudentLearningDetailModal
        open={studentLearningModalOpen}
        loading={studentLearningDetailLoading}
        detail={selectedStudentLearning}
        onClose={() => {
          setStudentLearningModalOpen(false);
          setSelectedStudentLearning(null);
        }}
      />

      <MentorEffectivenessDetailModal
        open={mentorEffectivenessModalOpen}
        loading={mentorEffectivenessDetailLoading}
        detail={selectedMentorEffectiveness}
        onClose={() => {
          setMentorEffectivenessModalOpen(false);
          setSelectedMentorEffectiveness(null);
        }}
      />

      <EscalationDetailModal
        open={escalationModalOpen}
        loading={escalationDetailLoading}
        saving={escalationStateBusy}
        detail={selectedEscalationDetail}
        resolutionState={resolutionState}
        resolutionNotes={resolutionNotes}
        onClose={() => {
          setEscalationModalOpen(false);
          setSelectedEscalationDetail(null);
        }}
        onStateChange={setResolutionState}
        onNotesChange={setResolutionNotes}
        onSubmit={() => void submitEscalationFollowUp()}
      />
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string;
  value: number;
  subtitle: string;
  tone: "neutral" | "healthy" | "warning" | "critical";
}) {
  const tones = {
    neutral: "border-slate-200 bg-white text-slate-900",
    healthy: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    critical: "border-rose-200 bg-rose-50 text-rose-900",
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs opacity-80">{subtitle}</p>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: "low" | "medium" | "high" }) {
  const tones = {
    low: "bg-slate-200 text-slate-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-rose-100 text-rose-700",
  };

  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[priority]}`}>{priority}</span>;
}

function SortableHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th className="px-4 py-3 text-left">
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1 font-semibold hover:text-slate-900">
        <span>{label}</span>
        <span className={`text-[10px] ${active ? "text-slate-900" : "text-slate-400"}`}>
          {active ? (direction === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

function setQueryParam(params: URLSearchParams, key: string, value: string, defaultValue = "") {
  if (!value || value === defaultValue) {
    params.delete(key);
    return;
  }

  params.set(key, value);
}

function setNumericQueryParam(params: URLSearchParams, key: string, value: number, defaultValue: number) {
  if (!Number.isFinite(value) || value === defaultValue) {
    params.delete(key);
    return;
  }

  params.set(key, String(value));
}

function LoadBandBadge({ band }: { band: "healthy" | "warning" | "critical" }) {
  const tones = {
    healthy: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    critical: "bg-rose-100 text-rose-700",
  };

  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${tones[band]}`}>{band}</span>;
}
