"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Filter,
  Link2,
  Plus,
  Search,
  Video,
  X,
  CircleCheck,
  CircleX,
  CircleDashed,
  Edit,
} from "lucide-react";
import { useAuth } from "@/store/auth.store";
import {
  createMeeting,
  getMentorMeetings,
  updateMeetingStatus,
  updateMeeting,
  type Meeting,
  type MeetingStatus,
} from "@/services/meeting.service";
import axios from "@/lib/axios";

type MentorProject = {
  project_id: string | number;
  title: string;
  status?: string;
};

type Toast = {
  message: string;
  type: "success" | "error" | "info";
};

const statusBadge: Record<MeetingStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
};

export default function MentorMeetingsPage() {
  const { user } = useAuth();
  const mentorId = user?.employee_id || user?.userKey || "";

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [projects, setProjects] = useState<MentorProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MeetingStatus>("all");
  const [showScheduler, setShowScheduler] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [editForm, setEditForm] = useState({
    project_ids: [] as string[],
    title: "",
    meeting_date: "",
    start_time: "",
    end_time: "",
    meeting_platform: "Google Meet",
    meeting_link: "",
    agenda: "",
  });

  const [form, setForm] = useState({
    project_ids: [] as string[],
    title: "",
    meeting_date: "",
    start_time: "",
    end_time: "",
    meeting_platform: "Google Meet",
    meeting_link: "",
    agenda: "",
    scope: "selected" as "all" | "selected",
  });

  // Toast auto-dismiss effect
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const schedulableProjects = useMemo(
    () =>
      projects.filter((project) => {
        const status = (project.status || "").toUpperCase();
        return (
          status === "ASSIGNED_TO_MENTOR" ||
          status === "RESUBMITTED" ||
          status === "APPROVED" ||
          status === "ACTIVE" ||
          status === "COMPLETED"
        );
      }),
    [projects]
  );

  const allProjectIds = useMemo(
    () => schedulableProjects.map((project) => String(project.project_id)),
    [schedulableProjects]
  );

  const loadMeetings = async () => {
    setLoading(true);
    setError("");

    try {
      const assignedProjectsPromise = axios.get("/project/mentor/assigned");
      const meetingsPromise = mentorId
        ? getMentorMeetings(String(mentorId))
        : Promise.resolve([] as Meeting[]);

      const [meetingData, assignedProjects] = await Promise.all([
        meetingsPromise,
        assignedProjectsPromise,
      ]);

      setMeetings(meetingData || []);
      setProjects(assignedProjects?.data?.projects || []);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(message || "Failed to load meetings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentorId]);

  const filteredMeetings = useMemo(() => {
    const q = search.trim().toLowerCase();
    
    const projectMap = new Map(
      projects.map((p) => [String(p.project_id), p.title])
    );

    return meetings.filter((meeting) => {
      const meetingProjectIds = Array.isArray(meeting.projects)
        ? meeting.projects
        : [];
      
      const projectDetails = meetingProjectIds.map((id) => ({
        id: String(id),
        title: projectMap.get(String(id)) || "Unknown Project",
      }));
      
      const projectSearchText = projectDetails
        .map((p) => `${p.id} ${p.title}`)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !q ||
        meeting.title.toLowerCase().includes(q) ||
        projectSearchText.includes(q) ||
        (meeting.agenda || "").toLowerCase().includes(q) ||
        (meeting.meeting_platform || "").toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" || meeting.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [meetings, search, statusFilter, projects]);
  const upcomingMeetings = filteredMeetings.filter((meeting) => {
    const dt = new Date(meeting.meeting_date);
    return dt >= new Date();
  });

  const scheduleMeeting = async () => {
    const selectedProjectIds =
      form.scope === "all" ? allProjectIds : form.project_ids;

    if (!form.title || !form.meeting_date || selectedProjectIds.length === 0) {
      setError("Project selection, title and date are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await createMeeting({
        project_ids: selectedProjectIds,
        project_id: selectedProjectIds[0],
        title: form.title.trim(),
        meeting_date: form.meeting_date,
        start_time: form.start_time || undefined,
        end_time: form.end_time || undefined,
        meeting_platform: form.meeting_platform || undefined,
        meeting_link: form.meeting_link || undefined,
        agenda: form.agenda || undefined,
        scope: form.scope,
      });

      setShowScheduler(false);
      setForm({
        project_ids: [],
        title: "",
        meeting_date: "",
        start_time: "",
        end_time: "",
        meeting_platform: "Google Meet",
        meeting_link: "",
        agenda: "",
        scope: "selected",
      });

      await loadMeetings();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(message || "Failed to schedule meeting.");
    } finally {
      setSaving(false);
    }
  };

  const toggleProjectSelection = (projectId: string) => {
    setForm((prev) => {
      const exists = prev.project_ids.includes(projectId);
      return {
        ...prev,
        scope: "selected",
        project_ids: exists
          ? prev.project_ids.filter((id) => id !== projectId)
          : [...prev.project_ids, projectId],
      };
    });
  };

  const toggleAllProjects = () => {
    setForm((prev) => {
      const isAllSelected = prev.scope === "all";
      return {
        ...prev,
        scope: isAllSelected ? "selected" : "all",
        project_ids: isAllSelected ? [] : allProjectIds,
      };
    });
  };

  const onUpdateStatus = async (meetingId: number, status: MeetingStatus) => {
    try {
      await updateMeetingStatus(meetingId, status);
      await loadMeetings();
      
      if (status === "completed") {
        setToast({
          message: "Meeting marked as completed successfully!",
          type: "success",
        });
      } else if (status === "cancelled") {
        setToast({
          message: "Meeting cancelled successfully!",
          type: "success",
        });
      } else if (status === "scheduled") {
        setToast({
          message: "Meeting rescheduled successfully!",
          type: "success",
        });
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setToast({
        message: message || "Failed to update meeting status.",
        type: "error",
      });
    }
  };

  const openEditModal = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setEditForm({
      project_ids: Array.isArray(meeting.projects) ? meeting.projects : [],
      title: meeting.title,
      meeting_date: meeting.meeting_date,
      start_time: meeting.start_time || "",
      end_time: meeting.end_time || "",
      meeting_platform: meeting.meeting_platform || "Google Meet",
      meeting_link: meeting.meeting_link || "",
      agenda: meeting.agenda || "",
    });
    setShowEditModal(true);
  };

  const saveEditedMeeting = async () => {
    if (!editingMeeting) return;
    
    if (!editForm.title || !editForm.meeting_date || editForm.project_ids.length === 0) {
      setToast({
        message: "Title, date, and at least one project are required.",
        type: "error",
      });
      return;
    }

    setSaving(true);
    setError("");

    try {
      await updateMeeting(editingMeeting.id, {
        project_ids: editForm.project_ids,
        title: editForm.title.trim(),
        meeting_date: editForm.meeting_date,
        start_time: editForm.start_time || undefined,
        end_time: editForm.end_time || undefined,
        meeting_platform: editForm.meeting_platform || undefined,
        meeting_link: editForm.meeting_link || undefined,
        agenda: editForm.agenda || undefined,
      });

      setShowEditModal(false);
      setEditingMeeting(null);
      setToast({
        message: "Meeting updated successfully!",
        type: "success",
      });
      await loadMeetings();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setToast({
        message: message || "Failed to update meeting.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full h-full space-y-4">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`rounded-xl px-4 py-2.5 text-sm font-medium animate-in fade-in slide-in-from-top-2 ${
            toast.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : toast.type === "error"
              ? "border border-rose-200 bg-rose-50 text-rose-700"
              : "border border-blue-200 bg-blue-50 text-blue-700"
          }`}
        >
          {toast.message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-linear-to-br from-white via-slate-50 to-[#eef3fb] p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Upcoming Meetings</h2>

          <button
            onClick={() => setShowScheduler(true)}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Schedule Meeting
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px]">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search meetings"
              className="w-full bg-transparent px-2 py-2.5 text-sm text-slate-700 outline-none"
            />
          </div>

          <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | MeetingStatus)}
              className="w-full bg-transparent px-2 py-2.5 text-sm text-slate-700 outline-none"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Meeting Timeline</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {upcomingMeetings.length} upcoming
            </span>
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-slate-500">Loading meetings...</p>
          ) : filteredMeetings.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No meetings found.</p>
          ) : (
            <div className="space-y-3">
              {filteredMeetings.map((meeting) => {
                const projectMap = new Map(
                  projects.map((p) => [String(p.project_id), p.title])
                );
                const meetingProjects = (Array.isArray(meeting.projects) ? meeting.projects : []).map(
                  (id) => ({
                    id: String(id),
                    title: projectMap.get(String(id)) || "Unknown Project",
                  })
                );

                return (
                <article
                  key={meeting.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 transition hover:border-[#2c4c7c]/30 hover:bg-white"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusBadge[meeting.status]}`}>
                      {meeting.status.toUpperCase()}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-900">{meeting.title}</h4>
                  </div>

                  {meetingProjects.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {meetingProjects.map((project) => (
                        <span
                          key={project.id}
                          className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200"
                        >
                          <span className="font-semibold">{project.id}</span>
                          {" - "}
                          {project.title}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(meeting.meeting_date).toLocaleDateString()}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {(meeting.start_time || "TBD")} - {(meeting.end_time || "TBD")}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Video className="h-3.5 w-3.5" />
                      {meeting.meeting_platform || "Online"}
                    </span>
                  </div>

                  {meeting.agenda && (
                    <p className="mt-2 text-xs text-slate-700">{meeting.agenda}</p>
                  )}

                  {meeting.meeting_link && (
                    <a
                      href={meeting.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#2c4c7c]/10 px-2 py-1 text-xs font-medium text-[#2c4c7c] hover:bg-[#2c4c7c]/20"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Join Link
                    </a>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {meeting.status === "scheduled" && (
                      <button
                        onClick={() => openEditModal(meeting)}
                        className="inline-flex items-center rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        <Edit className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </button>
                    )}

                    {meeting.status !== "completed" && (
                      <button
                        onClick={() => onUpdateStatus(meeting.id, "completed")}
                        className="inline-flex items-center rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <CircleCheck className="mr-1 h-3.5 w-3.5" />
                        Mark Completed
                      </button>
                    )}

                    {meeting.status !== "cancelled" && (
                      <button
                        onClick={() => onUpdateStatus(meeting.id, "cancelled")}
                        className="inline-flex items-center rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                      >
                        <CircleX className="mr-1 h-3.5 w-3.5" />
                        Cancel
                      </button>
                    )}

                    {meeting.status !== "scheduled" && (
                      <button
                        onClick={() => onUpdateStatus(meeting.id, "scheduled")}
                        className="inline-flex items-center rounded-lg bg-slate-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        <CircleDashed className="mr-1 h-3.5 w-3.5" />
                        Re-Schedule
                      </button>
                    )}
                  </div>
                </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Project Schedules</h3>
          <p className="mt-1 text-xs text-slate-500">Quick snapshot from your assigned projects.</p>

          <div className="mt-4 space-y-3">
            {projects.length === 0 ? (
              <p className="text-sm text-slate-500">No assigned projects.</p>
            ) : (
              projects.slice(0, 6).map((project) => {
                const projectMeetings = meetings.filter((m) =>
                  Array.isArray(m.projects) && m.projects.includes(String(project.project_id))
                );

                return (
                  <div key={project.project_id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <h4 className="truncate text-sm font-semibold text-slate-900">{project.title}</h4>
                    <p className="mt-1 text-xs text-slate-600">Project ID: {project.project_id}</p>
                    <p className="mt-2 text-xs text-slate-700">
                      Meetings: <span className="font-semibold">{projectMeetings.length}</span>
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </section>

      {showScheduler && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Schedule New Meeting</h3>
              <button
                onClick={() => setShowScheduler(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-300 p-3 md:col-span-2">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Select Projects</p>
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.scope === "all"}
                      onChange={toggleAllProjects}
                      className="h-4 w-4 rounded border-slate-300 text-[#2c4c7c] focus:ring-[#2c4c7c]"
                    />
                    All Projects
                  </label>
                </div>

                {schedulableProjects.length === 0 ? (
                  <p className="text-xs text-slate-500">No assigned, active, or completed projects available for scheduling.</p>
                ) : (
                  <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                    {schedulableProjects.map((project) => {
                      const projectId = String(project.project_id);
                      const checked =
                        form.scope === "all" || form.project_ids.includes(projectId);

                      return (
                        <label
                          key={project.project_id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProjectSelection(projectId)}
                            disabled={form.scope === "all"}
                            className="h-4 w-4 rounded border-slate-300 text-[#2c4c7c] focus:ring-[#2c4c7c]"
                          />
                          <span className="truncate">
                            {project.project_id} - {project.title}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Meeting title"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#2c4c7c]"
              />

              <input
                type="date"
                value={form.meeting_date}
                onChange={(e) => setForm((prev) => ({ ...prev, meeting_date: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#2c4c7c]"
              />

              <div className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700">
                Scope: <span className="font-semibold">{form.scope === "all" ? "All Projects" : "Selected Projects"}</span>
              </div>

              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#2c4c7c]"
              />

              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#2c4c7c]"
              />

              <input
                value={form.meeting_platform}
                onChange={(e) => setForm((prev) => ({ ...prev, meeting_platform: e.target.value }))}
                placeholder="Platform (Google Meet, Zoom, Teams...)"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#2c4c7c] md:col-span-2"
              />

              <input
                value={form.meeting_link}
                onChange={(e) => setForm((prev) => ({ ...prev, meeting_link: e.target.value }))}
                placeholder="Meeting link"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#2c4c7c] md:col-span-2"
              />

              <textarea
                value={form.agenda}
                onChange={(e) => setForm((prev) => ({ ...prev, agenda: e.target.value }))}
                placeholder="Agenda"
                rows={3}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#2c4c7c] md:col-span-2"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowScheduler(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={scheduleMeeting}
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Scheduling..." : "Schedule Meeting"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Edit Meeting</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMeeting(null);
                }}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-300 p-3 md:col-span-2">
                <p className="mb-2 text-sm font-semibold text-slate-800">Select Projects</p>
                {schedulableProjects.length === 0 ? (
                  <p className="text-xs text-slate-500">No assigned, active, or completed projects available.</p>
                ) : (
                  <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                    {schedulableProjects.map((project) => {
                      const projectId = String(project.project_id);
                      const checked = editForm.project_ids.includes(projectId);

                      return (
                        <label
                          key={project.project_id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setEditForm((prev) => {
                                const exists = prev.project_ids.includes(projectId);
                                return {
                                  ...prev,
                                  project_ids: exists
                                    ? prev.project_ids.filter((id) => id !== projectId)
                                    : [...prev.project_ids, projectId],
                                };
                              });
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-[#2c4c7c] focus:ring-[#2c4c7c]"
                          />
                          <span className="truncate">
                            {project.project_id} - {project.title}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <input
                value={editForm.title}
                onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Meeting title"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#2c4c7c]"
              />

              <input
                type="date"
                value={editForm.meeting_date}
                onChange={(e) => setEditForm((prev) => ({ ...prev, meeting_date: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#2c4c7c]"
              />

              <input
                type="time"
                value={editForm.start_time}
                onChange={(e) => setEditForm((prev) => ({ ...prev, start_time: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#2c4c7c]"
              />

              <input
                type="time"
                value={editForm.end_time}
                onChange={(e) => setEditForm((prev) => ({ ...prev, end_time: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#2c4c7c]"
              />

              <input
                value={editForm.meeting_platform}
                onChange={(e) => setEditForm((prev) => ({ ...prev, meeting_platform: e.target.value }))}
                placeholder="Platform (Google Meet, Zoom, Teams...)"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#2c4c7c] md:col-span-2"
              />

              <input
                value={editForm.meeting_link}
                onChange={(e) => setEditForm((prev) => ({ ...prev, meeting_link: e.target.value }))}
                placeholder="Meeting link"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#2c4c7c] md:col-span-2"
              />

              <textarea
                value={editForm.agenda}
                onChange={(e) => setEditForm((prev) => ({ ...prev, agenda: e.target.value }))}
                placeholder="Agenda"
                rows={3}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#2c4c7c] md:col-span-2"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMeeting(null);
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEditedMeeting}
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
