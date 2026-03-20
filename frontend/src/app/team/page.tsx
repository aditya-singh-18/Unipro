"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Mail,
  PencilLine,
  Plus,
  Save,
  Users,
  X,
} from "lucide-react";

import Sidebar from "@/components/sidebar/StudentSidebar";
import Topbar from "@/components/dashboard/Topbar";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/store/auth.store";
import {
  getMyTeams,
  getTeamById,
  removeTeamMember,
  changeTeamLeader,
} from "@/services/team/team.service";
import {
  getMyInvitations,
  respondToInvite,
  sendTeamInvite,
} from "@/services/team/invitation.service";
import {
  createProjectTask,
  getProjectTasks,
  updateProjectTaskStatus,
  type TrackerTask,
  type TrackerTaskPriority,
  type TrackerTaskStatus,
} from "@/services/tracker.service";
import {
  getStudentMeetings,
  type Meeting,
} from "@/services/meeting.service";
import { getPublicSystemAccess } from "@/services/systemSettings.service";

type TeamMember = {
  enrollment_id: string;
  is_leader: boolean;
  name?: string;
  student_name?: string;
  full_name?: string;
  display_name?: string;
};

type TeamSummary = {
  team_id: string;
  team_name?: string | null;
  department: string;
  max_team_size: number;
  leader_enrollment_id: string;
  project_title?: string | null;
  created_at?: string;
  members: TeamMember[];
};

type TeamProject = {
  project_id: string;
  title?: string | null;
  status?: string | null;
};

type TeamDetail = {
  team_id: string;
  team_name?: string | null;
  department: string;
  max_team_size: number;
  leader_enrollment_id: string;
  project_title?: string | null;
  created_at?: string;
  members: TeamMember[];
  projects?: TeamProject[];
};

type TeamInvitation = {
  id: number;
  team_id: string;
  invited_by_enrollment_id: string;
};

type PanelKey = "teams" | "invitations" | "invite" | "meetings";

const boardColumns: Array<{ key: TrackerTaskStatus; title: string }> = [
  { key: "todo", title: "To Do" },
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

const meetingBadgeClass: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

export default function TeamDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  const [activePanel, setActivePanel] = useState<PanelKey>("teams");
  const [teamCount, setTeamCount] = useState<number>(0);
  const [inviteCount, setInviteCount] = useState<number>(0);
  const [meetingCount, setMeetingCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [myId, setMyId] = useState("");

  const [panelError, setPanelError] = useState<string>("");
  const [panelSuccess, setPanelSuccess] = useState<string>("");

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamDetail | null>(null);
  const [teamDetailLoading, setTeamDetailLoading] = useState(false);
  const [confirmMember, setConfirmMember] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);
  const [confirmLeaderTransfer, setConfirmLeaderTransfer] = useState<TeamMember | null>(null);
  const [changingLeaderId, setChangingLeaderId] = useState<string | null>(null);
  const [teamEditMode, setTeamEditMode] = useState(false);
  const [teamInfoEditOpen, setTeamInfoEditOpen] = useState(false);
  const [teamInfoDraft, setTeamInfoDraft] = useState({
    team_name: "",
    project_title: "",
    max_team_size: 0,
  });
  const [teamPolicy, setTeamPolicy] = useState({
    team_leader_required: true,
    allow_leader_change: false,
    allow_member_removal: true,
  });

  const [kanbanTasks, setKanbanTasks] = useState<TrackerTask[]>([]);
  const [kanbanLoading, setKanbanLoading] = useState(false);
  const [kanbanSaving, setKanbanSaving] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    priority: "medium" as TrackerTaskPriority,
    assignedToUserKey: "",
  });

  const [inviteForm, setInviteForm] = useState({
    teamId: "",
    enrollmentId: "",
  });
  const [sendingInvite, setSendingInvite] = useState(false);
  const [respondingInviteId, setRespondingInviteId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setMyId((localStorage.getItem("enrollmentId") || "").trim());
    }
  }, []);

  useEffect(() => {
    const requestedPanel = searchParams.get("panel") as PanelKey | null;
    const requestedTeamId = searchParams.get("teamId");
    if (requestedPanel && ["teams", "invitations", "invite", "meetings"].includes(requestedPanel)) {
      setActivePanel(requestedPanel);
    }
    if (requestedTeamId) {
      setActivePanel("teams");
      setSelectedTeamId(requestedTeamId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!token || user?.role !== "STUDENT") {
      router.replace("/login");
    }
  }, [token, user?.role, router]);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setPanelError("");
      const [teamRes, inviteRes, meetingRes] = await Promise.all([
        getMyTeams(),
        getMyInvitations(),
        getStudentMeetings(),
      ]);
      const access = await getPublicSystemAccess();

      const nextTeams = teamRes?.teams || [];
      const nextInvitations = inviteRes?.invitations || [];
      const nextMeetings = meetingRes?.all || [];

      setTeams(nextTeams);
      setInvitations(nextInvitations);
      setMeetings(nextMeetings);
      setTeamPolicy({
        team_leader_required: Boolean(access.team_leader_required),
        allow_leader_change: Boolean(access.allow_leader_change),
        allow_member_removal: Boolean(access.allow_member_removal),
      });
      setTeamCount(teamRes?.count ?? nextTeams.length ?? 0);
      setInviteCount(inviteRes?.count ?? nextInvitations.length ?? 0);
      setMeetingCount(nextMeetings.filter((item) => item.status === "scheduled").length);

      if (!inviteForm.teamId && nextTeams.length > 0) {
        setInviteForm((prev) => ({ ...prev, teamId: nextTeams[0].team_id }));
      }
    } catch (error) {
      console.error("Failed to fetch team workspace data", error);
      setPanelError("Failed to load team workspace");
    } finally {
      setLoading(false);
    }
  }, [inviteForm.teamId]);

  const loadTeamWorkspace = useCallback(async (teamId: string) => {
    try {
      setTeamDetailLoading(true);
      setPanelError("");
      const res = await getTeamById(teamId);
      const data = res?.data ?? res;
      const normalized: TeamDetail = {
        ...data.team,
        members: data.members || [],
        projects: data.projects || [],
      };
      setSelectedTeam(normalized);

      const projectId = String(normalized.projects?.[0]?.project_id || "");
      if (projectId) {
        await loadKanbanTasks(projectId);
      } else {
        setKanbanTasks([]);
      }
    } catch (error) {
      console.error(error);
      setPanelError("Failed to load team workspace");
    } finally {
      setTeamDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token || user?.role !== "STUDENT") return;
    void loadDashboardData();
  }, [loadDashboardData, token, user?.role]);

  useEffect(() => {
    if (!token || user?.role !== "STUDENT") return;
    if (!selectedTeamId) {
      setSelectedTeam(null);
      setKanbanTasks([]);
      setTeamEditMode(false);
      setTeamInfoEditOpen(false);
      return;
    }

    void loadTeamWorkspace(selectedTeamId);
  }, [selectedTeamId, loadTeamWorkspace, token, user?.role]);

  useEffect(() => {
    if (!selectedTeam) {
      setTeamInfoDraft({ team_name: "", project_title: "", max_team_size: 0 });
      return;
    }

    setTeamInfoDraft({
      team_name: selectedTeam.team_name || "",
      project_title: selectedTeam.project_title || "",
      max_team_size: selectedTeam.max_team_size,
    });
    setTeamInfoEditOpen(false);
  }, [selectedTeam]);

  const loadKanbanTasks = async (projectId: string) => {
    try {
      setKanbanLoading(true);
      const tasks = await getProjectTasks(projectId);
      setKanbanTasks(tasks);
    } catch {
      setPanelError("Failed to load team tasks");
      setKanbanTasks([]);
    } finally {
      setKanbanLoading(false);
    }
  };

  const handleInvitation = async (inviteId: number, action: "ACCEPT" | "REJECT") => {
    try {
      setRespondingInviteId(inviteId);
      setPanelError("");
      setPanelSuccess("");
      await respondToInvite(inviteId, action);
      setInvitations((prev) => prev.filter((item) => item.id !== inviteId));
      setInviteCount((prev) => Math.max(0, prev - 1));
      setPanelSuccess(action === "ACCEPT" ? "Invitation accepted" : "Invitation rejected");
      if (action === "ACCEPT") {
        await loadDashboardData();
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setPanelError(message || "Unable to process invitation");
    } finally {
      setRespondingInviteId(null);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.teamId || !inviteForm.enrollmentId.trim()) {
      setPanelError("Team and Enrollment ID are required");
      return;
    }

    try {
      setSendingInvite(true);
      setPanelError("");
      setPanelSuccess("");
      await sendTeamInvite(inviteForm.teamId, inviteForm.enrollmentId.trim());
      setInviteForm((prev) => ({ ...prev, enrollmentId: "" }));
      setPanelSuccess("Invitation sent successfully");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setPanelError(message || "Failed to send invite");
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedTeam || !confirmMember) return;
    try {
      setRemoving(true);
      setPanelError("");
      await removeTeamMember(selectedTeam.team_id, confirmMember.enrollment_id);
      setConfirmMember(null);
      await loadTeamWorkspace(selectedTeam.team_id);
      await loadDashboardData();
      setPanelSuccess("Member removed successfully");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setPanelError(message || "Failed to remove member");
    } finally {
      setRemoving(false);
    }
  };

  const handleChangeLeader = async (newLeaderEnrollmentId: string) => {
    if (!selectedTeam) return;

    try {
      setChangingLeaderId(newLeaderEnrollmentId);
      setPanelError("");
      setPanelSuccess("");
      await changeTeamLeader(selectedTeam.team_id, newLeaderEnrollmentId);
      await loadTeamWorkspace(selectedTeam.team_id);
      await loadDashboardData();
      setPanelSuccess(`Leadership transferred to ${newLeaderEnrollmentId}`);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setPanelError(message || "Failed to change team leader");
    } finally {
      setChangingLeaderId(null);
    }
  };

  const createKanbanTask = async () => {
    const projectId = String(selectedTeam?.projects?.[0]?.project_id || "");
    if (!projectId) {
      setPanelError("This team has no linked project yet");
      return;
    }

    if (!taskForm.title.trim()) {
      setPanelError("Task title is required");
      return;
    }

    try {
      setKanbanSaving(true);
      setPanelError("");
      await createProjectTask(projectId, {
        title: taskForm.title.trim(),
        priority: taskForm.priority,
        assignedToUserKey: taskForm.assignedToUserKey || undefined,
      });
      setTaskForm({ title: "", priority: "medium", assignedToUserKey: "" });
      await loadKanbanTasks(projectId);
      setPanelSuccess("Task created successfully");
    } catch {
      setPanelError("Unable to create task");
    } finally {
      setKanbanSaving(false);
    }
  };

  const moveKanbanTask = async (taskId: number, status: TrackerTaskStatus) => {
    const projectId = String(selectedTeam?.projects?.[0]?.project_id || "");
    if (!projectId) return;

    try {
      setPanelError("");
      await updateProjectTaskStatus(taskId, status);
      await loadKanbanTasks(projectId);
    } catch {
      setPanelError("Unable to update task status");
    }
  };

  const saveTeamInfoLocal = () => {
    if (!selectedTeam) return;

    const parsedMaxSize = Number(teamInfoDraft.max_team_size);
    const normalizedMaxSize = Number.isFinite(parsedMaxSize)
      ? Math.max(selectedTeam.members.length, parsedMaxSize)
      : selectedTeam.max_team_size;

    const updatedTeam: TeamDetail = {
      ...selectedTeam,
      team_name: teamInfoDraft.team_name.trim() || selectedTeam.team_name,
      project_title: teamInfoDraft.project_title.trim() || selectedTeam.project_title,
      max_team_size: normalizedMaxSize,
    };

    setSelectedTeam(updatedTeam);
    setTeams((prev) =>
      prev.map((team) =>
        team.team_id === updatedTeam.team_id
          ? {
              ...team,
              team_name: updatedTeam.team_name,
              project_title: updatedTeam.project_title,
              max_team_size: updatedTeam.max_team_size,
            }
          : team
      )
    );
    setTeamInfoEditOpen(false);
    setPanelSuccess("Team details updated");
  };

  const scheduledMeetings = useMemo(
    () => meetings.filter((item) => item.status === "scheduled"),
    [meetings]
  );

  const cardConfig = [
    {
      key: "teams" as const,
      title: "My Teams",
      value: loading ? "…" : String(teamCount),
      description: "Open team list",
      className: "from-blue-500 to-blue-600",
      icon: <Users size={18} />,
    },
    {
      key: "invitations" as const,
      title: "New Invitations",
      value: loading ? "…" : String(inviteCount),
      description: "Respond inline",
      className: "from-emerald-500 to-emerald-600",
      icon: <Mail size={18} />,
    },
    {
      key: "invite" as const,
      title: "Send Invite",
      value: "Invite member",
      description: "Open send form",
      className: "from-amber-500 to-orange-500",
      icon: <Plus size={18} />,
    },
    {
      key: "meetings" as const,
      title: "Meetings",
      value: loading ? "…" : String(meetingCount),
      description: "Connected to meeting tab",
      className: "from-indigo-500 to-violet-600",
      icon: <CalendarDays size={18} />,
    },
  ];

  const renderActivePanel = () => {
    if (activePanel === "teams") {
      if (selectedTeamId && selectedTeam) {
        const projectId = String(selectedTeam.projects?.[0]?.project_id || "");
        const currentEnrollment = (myId || user?.enrollmentId || user?.userKey || "").trim();
        const isLeader = !!currentEnrollment && selectedTeam.leader_enrollment_id.trim() === currentEnrollment;
        const linkedProject = selectedTeam.projects?.[0];
        const normalizedProjectStatus = String(linkedProject?.status || "").toLowerCase().trim();
        const isProjectActive = normalizedProjectStatus === "active";
        const canEditTeam = isLeader && !isProjectActive;
        const allowLeaderChange =
          teamPolicy.team_leader_required && teamPolicy.allow_leader_change;
        const doneTasks = kanbanTasks.filter((task) => task.status === "done").length;
        const totalTasks = kanbanTasks.length;
        const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
        const occupancyPct = Math.round(
          (selectedTeam.members.length / Math.max(1, selectedTeam.max_team_size)) * 100
        );

        return (
          <section className="workspace-card space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTeamId(null);
                    setSelectedTeam(null);
                    setKanbanTasks([]);
                    setTeamEditMode(false);
                    router.replace("/team");
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft size={16} />
                  Back To My Teams
                </button>
                <h2 className="mt-4 text-2xl font-bold text-slate-900">
                  Team Workspace
                </h2>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 p-4 shrink-0">
                <Users className="text-indigo-600" size={32} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    {selectedTeam.team_name || "Unnamed team"}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    {selectedTeam.team_id}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    {selectedTeam.department}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    {selectedTeam.members.length}/{selectedTeam.max_team_size}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    {selectedTeam.project_title || "No project title"}
                  </span>
                </div>

                {isLeader ? (
                  <button
                    type="button"
                    disabled={!canEditTeam}
                    onClick={() => {
                      if (!canEditTeam) return;
                      setTeamInfoEditOpen((prev) => !prev);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {canEditTeam ? (teamInfoEditOpen ? <X size={16} /> : <PencilLine size={16} />) : <PencilLine size={16} />}
                    {canEditTeam ? (teamInfoEditOpen ? "Close" : "Edit") : "Edit Locked"}
                  </button>
                ) : null}
              </div>

              {teamInfoEditOpen && canEditTeam ? (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <input
                    value={teamInfoDraft.team_name}
                    onChange={(e) => setTeamInfoDraft((prev) => ({ ...prev, team_name: e.target.value }))}
                    placeholder="Team name"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <input
                    value={teamInfoDraft.project_title}
                    onChange={(e) => setTeamInfoDraft((prev) => ({ ...prev, project_title: e.target.value }))}
                    placeholder="Project title"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <input
                    type="number"
                    min={selectedTeam.members.length}
                    value={teamInfoDraft.max_team_size}
                    onChange={(e) =>
                      setTeamInfoDraft((prev) => ({ ...prev, max_team_size: Number(e.target.value || 0) }))
                    }
                    placeholder="Team size"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <div className="md:col-span-3 flex justify-end">
                    <button
                      type="button"
                      onClick={saveTeamInfoLocal}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      <Save size={14} />
                      Save
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-lg font-semibold text-slate-900">Team Tracker</h3>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                  {normalizedProjectStatus || "not_started"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                    <span>Team Filled</span>
                    <span>{selectedTeam.members.length}/{selectedTeam.max_team_size}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-blue-500" style={{ inlineSize: `${Math.min(100, occupancyPct)}%` }} />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                    <span>Tasks Completed</span>
                    <span>{doneTasks}/{totalTasks}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-emerald-500" style={{ inlineSize: `${Math.min(100, completionPct)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Team Members</h3>
                  <p className="text-sm text-slate-500">
                    {isLeader && isProjectActive ? (
                      <span className="font-medium text-amber-700">
                        Project is active. Team edit is locked.
                      </span>
                    ) : isLeader && teamEditMode ? (
                      <span className="font-medium text-emerald-700">Member edit mode is enabled.</span>
                    ) : isLeader ? (
                      <span>Click Edit Members to manage team members.</span>
                    ) : (
                      <span>Only team leader can edit team structure.</span>
                    )}{" "}
                    {isLeader && teamPolicy.team_leader_required && !teamPolicy.allow_leader_change ? (
                      <span className="font-medium text-amber-600">
                        Leader transfer is currently disabled by admin.
                      </span>
                    ) : null}
                  </p>
                </div>

                {isLeader ? (
                  <button
                    type="button"
                    disabled={!canEditTeam}
                    onClick={() => setTeamEditMode((prev) => !prev)}
                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {canEditTeam
                      ? teamEditMode
                        ? "Done Editing"
                        : "Edit Members"
                      : "Edit Locked (Project Active)"}
                  </button>
                ) : null}
              </div>

              <div className="space-y-3">
                {selectedTeam.members.map((member) => {
                  const removable =
                    canEditTeam && teamEditMode && teamPolicy.allow_member_removal && !member.is_leader;
                  const transferable =
                    canEditTeam && teamEditMode && allowLeaderChange && !member.is_leader;
                  return (
                    <div
                      key={member.enrollment_id}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${member.is_leader ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white"}`}
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{getMemberDisplayName(member)}</p>
                        <p className="text-xs text-slate-500">{member.enrollment_id}</p>
                        {member.is_leader && <p className="text-xs font-semibold text-indigo-600 mt-1">Team Leader</p>}
                      </div>

                      <div className="flex items-center gap-2">
                        {transferable ? (
                          <button
                            type="button"
                            onClick={() => setConfirmLeaderTransfer(member)}
                            disabled={changingLeaderId === member.enrollment_id}
                            className="rounded-lg bg-indigo-100 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-200 disabled:opacity-50"
                          >
                            {changingLeaderId === member.enrollment_id ? "Transferring..." : "Make Leader"}
                          </button>
                        ) : null}

                        {removable ? (
                          <button
                            type="button"
                            onClick={() => setConfirmMember(member)}
                            className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-200"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Team Task Kanban</h3>
                  <p className="text-sm text-slate-500">
                    {projectId ? `Project ${projectId}` : "Project link required"}
                  </p>
                </div>

                {projectId ? (
                  <button
                    type="button"
                    onClick={() => void loadKanbanTasks(projectId)}
                    className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100"
                  >
                    Refresh
                  </button>
                ) : null}
              </div>

              {projectId ? (
                <>
                  <div className="grid grid-cols-1 items-center gap-3 lg:grid-cols-12">
                    <input
                      value={taskForm.title}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Task title"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 lg:col-span-4"
                    />
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value as TrackerTaskPriority }))}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 lg:col-span-3"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                    <select
                      value={taskForm.assignedToUserKey}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, assignedToUserKey: e.target.value }))}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 lg:col-span-3"
                    >
                      <option value="">Unassigned</option>
                      {selectedTeam.members.map((member) => (
                        <option key={member.enrollment_id} value={member.enrollment_id}>
                          {getMemberDisplayName(member)} ({member.enrollment_id})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={createKanbanTask}
                      disabled={kanbanSaving}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 lg:col-span-2"
                    >
                      {kanbanSaving ? "Adding..." : "Add Task"}
                    </button>
                  </div>

                  <div className="overflow-x-auto pb-1">
                    <div className="grid min-w-280 grid-cols-5 gap-4">
                      {boardColumns.map((column) => {
                        const columnTasks = kanbanTasks.filter((task) => task.status === column.key);
                        return (
                          <div key={column.key} className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3 min-h-56">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-slate-700">{column.title}</h4>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                                {columnTasks.length}
                              </span>
                            </div>

                            {kanbanLoading ? (
                              <p className="text-xs text-slate-400">Loading tasks...</p>
                            ) : columnTasks.length === 0 ? (
                              <p className="text-xs text-slate-400">No tasks</p>
                            ) : (
                              <div className="space-y-2">
                                {columnTasks.map((task) => (
                                  <div key={task.task_id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                                    <div className="text-sm font-semibold text-slate-900">{task.title}</div>
                                    <div className="text-[11px] text-slate-500">Priority: {task.priority}</div>
                                    <div className="text-[11px] text-slate-500">
                                      Assignee: {getMemberLabel(selectedTeam.members, task.assigned_to_user_key)}
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {nextMoves[task.status].map((nextStatus) => (
                                        <button
                                          key={nextStatus}
                                          type="button"
                                          onClick={() => void moveKanbanTask(task.task_id, nextStatus)}
                                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                                        >
                                          Move to {nextStatus}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </section>
        );
      }

      return (
        <section className="workspace-card space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">My Teams</h2>
              <p className="text-sm text-slate-500 mt-1">Select a team card to open its workspace below.</p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/team/create")}
              className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(22,163,74,0.28)] hover:bg-emerald-700"
            >
              + Create Team
            </button>
          </div>

          {loading ? (
            <div className="text-slate-500">Loading teams...</div>
          ) : teams.length === 0 ? (
            <EmptyState text="You are not part of any team yet." />
          ) : (
            <div className="space-y-3">
              {teams.map((team) => (
                <button
                  key={team.team_id}
                  type="button"
                  onClick={() => {
                    setSelectedTeamId(team.team_id);
                    router.replace(`/team?teamId=${team.team_id}`);
                    setTeamEditMode(false);
                    setPanelError("");
                    setPanelSuccess("");
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{team.team_name || `Team ${team.team_id}`}</p>
                      <p className="text-sm text-slate-500">{team.department} · {team.members.length}/{team.max_team_size} members</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project</p>
                      <p className="text-sm font-medium text-slate-800">{team.project_title || "Pending"}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (activePanel === "invitations") {
      return (
        <section className="workspace-card space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">New Invitations</h2>
            <p className="text-sm text-slate-500 mt-1">Review and respond to team invitations from this panel.</p>
          </div>

          {loading ? (
            <div className="text-slate-500">Loading invitations...</div>
          ) : invitations.length === 0 ? (
            <EmptyState text="You don’t have any team invitations right now." />
          ) : (
            <div className="space-y-3">
              {invitations.map((invite) => (
                <div key={invite.id} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">Team {invite.team_id}</p>
                      <p className="text-sm text-slate-500">Invited by {invite.invited_by_enrollment_id}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={respondingInviteId === invite.id}
                        onClick={() => void handleInvitation(invite.id, "ACCEPT")}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={respondingInviteId === invite.id}
                        onClick={() => void handleInvitation(invite.id, "REJECT")}
                        className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (activePanel === "invite") {
      return (
        <section className="workspace-card space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Send Invite</h2>
          </div>

          <form onSubmit={handleSendInvite} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <select
              value={inviteForm.teamId}
              onChange={(e) => setInviteForm((prev) => ({ ...prev, teamId: e.target.value }))}
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Select Team</option>
              {teams.map((team) => (
                <option key={team.team_id} value={team.team_id}>
                  {team.team_name || team.team_id}
                </option>
              ))}
            </select>

            <input
              value={inviteForm.enrollmentId}
              onChange={(e) => setInviteForm((prev) => ({ ...prev, enrollmentId: e.target.value }))}
              placeholder="Student Enrollment ID"
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
            />

            <button
              type="submit"
              disabled={sendingInvite}
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {sendingInvite ? "Sending..." : "Send Invite"}
            </button>
          </form>
        </section>
      );
    }

    return (
      <section className="workspace-card space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Meetings</h2>
        </div>

        {loading ? (
          <div className="text-slate-500">Loading meetings...</div>
        ) : scheduledMeetings.length === 0 ? (
          <EmptyState text="No scheduled meetings found." />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {scheduledMeetings.map((meeting) => (
              <div key={meeting.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{meeting.title}</p>
                    <p className="text-sm text-slate-500 mt-1">{meeting.agenda || "No agenda provided."}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${meetingBadgeClass[meeting.status] || "bg-slate-100 text-slate-700"}`}>
                    {meeting.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
                  <p><span className="font-semibold">Date:</span> {meeting.meeting_date}</p>
                  <p><span className="font-semibold">Time:</span> {meeting.start_time || "-"} to {meeting.end_time || "-"}</p>
                  <p><span className="font-semibold">Type:</span> {meeting.meeting_type || "-"}</p>
                  <p><span className="font-semibold">Platform:</span> {meeting.meeting_platform || "-"}</p>
                </div>

                {meeting.meeting_link ? (
                  <div className="mt-4">
                    <a
                      href={meeting.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-lg bg-[#355d91] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2c4c7c]"
                    >
                      Join Meeting
                    </a>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#cad6e6] text-[#1f2a44]">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar title="Team & Collaboration" showSearch />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6 team-shell">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cardConfig.map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={() => {
                  setActivePanel(card.key);
                  setPanelError("");
                  setPanelSuccess("");
                  if (card.key !== "teams") {
                    setSelectedTeamId(null);
                    setSelectedTeam(null);
                    setTeamEditMode(false);
                  }
                }}
                className={`card-tile bg-gradient-to-r ${card.className} text-left ${activePanel === card.key ? "ring-4 ring-white/60" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm opacity-90">{card.title}</p>
                    <p className="mt-1 text-2xl font-bold leading-tight">{card.value}</p>
                    <p className="mt-1 text-xs opacity-85">{card.description}</p>
                  </div>
                  <div className="rounded-xl bg-white/20 p-2.5">{card.icon}</div>
                </div>
              </button>
            ))}
          </div>

          {panelError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{panelError}</div>
          ) : null}

          {panelSuccess ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{panelSuccess}</div>
          ) : null}

          {teamDetailLoading ? <div className="workspace-card text-slate-500">Loading team workspace...</div> : renderActivePanel()}
        </main>
      </div>

      {confirmLeaderTransfer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Transfer Leadership?</h3>
            <p className="mt-2 text-sm text-slate-600">
              You are about to transfer team leadership to{" "}
              <b>{confirmLeaderTransfer.name || confirmLeaderTransfer.student_name || confirmLeaderTransfer.enrollment_id}</b>{" "}
              <span className="text-slate-400">({confirmLeaderTransfer.enrollment_id})</span>.
              You will become a regular member.
            </p>
            <p className="mt-2 text-xs text-amber-600 font-medium">
              This action cannot be undone unless the new leader transfers it back.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmLeaderTransfer(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = confirmLeaderTransfer;
                  setConfirmLeaderTransfer(null);
                  void handleChangeLeader(target.enrollment_id);
                }}
                disabled={changingLeaderId === confirmLeaderTransfer.enrollment_id}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Yes, Transfer Leadership
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmMember ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Remove Member?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to remove <b>{confirmMember.enrollment_id}</b> from this team?
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmMember(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRemoveMember()}
                disabled={removing}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {removing ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .team-shell {
          background: radial-gradient(circle at 18% -14%, rgba(79, 131, 214, 0.18) 0%, rgba(202, 214, 230, 0.92) 42%, #cad6e6 100%);
        }

        .card-tile {
          border-radius: 22px;
          padding: 14px;
          color: white;
          box-shadow: 0 14px 30px rgba(48, 71, 110, 0.16);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .card-tile:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 36px rgba(48, 71, 110, 0.22);
        }

        .workspace-card {
          background: rgba(255, 255, 255, 0.84);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.55);
          border-radius: 28px;
          padding: 22px;
          box-shadow: 0 18px 38px rgba(45, 66, 103, 0.11);
        }
      `}</style>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
      {text}
    </div>
  );
}

function getMemberDisplayName(member: TeamMember) {
  return member.name || member.student_name || member.full_name || member.display_name || "Student";
}

function getMemberLabel(members: TeamMember[], userKey: string | null) {
  if (!userKey) return "Unassigned";
  const member = members.find((item) => item.enrollment_id === userKey);
  if (!member) return userKey;
  return `${getMemberDisplayName(member)} (${member.enrollment_id})`;
}
