'use client';

import { useEffect, useMemo, useState } from 'react';

import Sidebar from '@/components/sidebar/StudentSidebar';
import Topbar from '@/components/dashboard/Topbar';
import UiverseButton from '@/components/ui/uiverse-button';
import { getMyProjects } from '@/services/project.service';
import {
  Meeting,
  MeetingMinute,
  getMeetingMinutes,
  getStudentMeetings,
  submitMeetingMinutes,
} from '@/services/meeting.service';

type ToastType = 'success' | 'error' | 'info';

type ActionItem = {
  task: string;
  assignee?: string;
  due_date?: string;
};

type MomForm = {
  discussion_summary: string;
  key_points: string;
  decisions: string;
  next_meeting_date: string;
  action_items: ActionItem[];
};

const DEFAULT_FORM: MomForm = {
  discussion_summary: '',
  key_points: '',
  decisions: '',
  next_meeting_date: '',
  action_items: [{ task: '', assignee: '', due_date: '' }],
};

const badgeClass: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-rose-100 text-rose-800',
};

export default function StudentMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [projectMap, setProjectMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  const [momMeeting, setMomMeeting] = useState<Meeting | null>(null);
  const [momForm, setMomForm] = useState<MomForm>(DEFAULT_FORM);
  const [submittingMom, setSubmittingMom] = useState(false);

  const [minutesMeeting, setMinutesMeeting] = useState<Meeting | null>(null);
  const [minutes, setMinutes] = useState<MeetingMinute[]>([]);
  const [minutesLoading, setMinutesLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [meetingRes, projectsRes] = await Promise.all([getStudentMeetings(), getMyProjects()]);

      setMeetings(meetingRes?.all || []);

      const map: Record<string, string> = {};
      (projectsRes?.projects || []).forEach((project) => {
        map[String(project.project_id)] = project.title;
      });
      setProjectMap(map);
    } catch {
      setToast({ type: 'error', message: 'Failed to load meetings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredMeetings = useMemo(() => {
    const q = search.trim().toLowerCase();

    return meetings.filter((meeting) => {
      if (statusFilter !== 'all' && meeting.status !== statusFilter) return false;

      if (!q) return true;

      const projectTokens = (meeting.projects || []).flatMap((pid) => {
        const title = projectMap[String(pid)] || '';
        return [String(pid).toLowerCase(), title.toLowerCase(), `${pid} ${title}`.toLowerCase()];
      });

      const haystack = [
        meeting.title,
        meeting.agenda || '',
        meeting.meeting_platform || '',
        ...projectTokens,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [meetings, projectMap, search, statusFilter]);

  const openMomModal = (meeting: Meeting) => {
    setMomMeeting(meeting);
    setMomForm(DEFAULT_FORM);
  };

  const closeMomModal = () => {
    setMomMeeting(null);
    setMomForm(DEFAULT_FORM);
  };

  const addActionItem = () => {
    setMomForm((prev) => ({
      ...prev,
      action_items: [...prev.action_items, { task: '', assignee: '', due_date: '' }],
    }));
  };

  const removeActionItem = (index: number) => {
    setMomForm((prev) => ({
      ...prev,
      action_items: prev.action_items.filter((_, i) => i !== index),
    }));
  };

  const updateActionItem = (index: number, key: keyof ActionItem, value: string) => {
    setMomForm((prev) => ({
      ...prev,
      action_items: prev.action_items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }));
  };

  const submitMom = async () => {
    if (!momMeeting) return;

    try {
      setSubmittingMom(true);

      const actionItems = momForm.action_items
        .map((item) => ({
          task: item.task.trim(),
          assignee: item.assignee?.trim() || undefined,
          due_date: item.due_date || undefined,
        }))
        .filter((item) => item.task);

      await submitMeetingMinutes(momMeeting.id, {
        discussion_summary: momForm.discussion_summary.trim() || undefined,
        key_points: momForm.key_points.trim() || undefined,
        decisions: momForm.decisions.trim() || undefined,
        action_items: actionItems,
        next_meeting_date: momForm.next_meeting_date || undefined,
      });

      setToast({ type: 'success', message: 'MOM submitted successfully' });
      closeMomModal();
    } catch {
      setToast({ type: 'error', message: 'Failed to submit MOM' });
    } finally {
      setSubmittingMom(false);
    }
  };

  const openMinutesModal = async (meeting: Meeting) => {
    try {
      setMinutesMeeting(meeting);
      setMinutesLoading(true);
      const list = await getMeetingMinutes(meeting.id);
      setMinutes(list || []);
    } catch {
      setToast({ type: 'error', message: 'Failed to load MOM notes' });
      setMinutes([]);
    } finally {
      setMinutesLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-300 text-[#1f2a44]">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar title="Meetings" />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6">
          <div className="glass rounded-2xl p-4 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-semibold text-slate-900">My Meetings</h2>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, project ID, project title..."
                  className="w-full sm:w-80 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'scheduled' | 'completed' | 'cancelled')}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {loading && <div className="text-slate-600">Loading meetings...</div>}

          {!loading && filteredMeetings.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center text-slate-700">No meetings found.</div>
          )}

          {!loading && filteredMeetings.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredMeetings.map((meeting) => {
                const projectBadges = (meeting.projects || []).map((projectId) => {
                  const label = projectMap[String(projectId)] || 'Project';
                  return `${projectId} - ${label}`;
                });

                return (
                  <div key={meeting.id} className="glass rounded-2xl p-5 border border-slate-200/70">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">{meeting.title}</h3>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badgeClass[meeting.status] || 'bg-slate-100 text-slate-700'}`}>
                        {meeting.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-700 line-clamp-3">{meeting.agenda || 'No agenda provided.'}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {projectBadges.length > 0 ? (
                        projectBadges.map((label) => (
                          <span key={`${meeting.id}-${label}`} className="rounded-full bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1">
                            {label}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1">No project mapping</span>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700">
                      <p><span className="font-semibold">Date:</span> {meeting.meeting_date}</p>
                      <p><span className="font-semibold">Time:</span> {meeting.start_time || '-'} to {meeting.end_time || '-'}</p>
                      <p><span className="font-semibold">Type:</span> {meeting.meeting_type || '-'}</p>
                      <p><span className="font-semibold">Platform:</span> {meeting.meeting_platform || '-'}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {meeting.meeting_link && meeting.status !== 'cancelled' && (
                        <a
                          href={meeting.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md bg-[#355d91] text-white px-3 py-2 text-sm font-medium hover:bg-[#2c4c7c]"
                        >
                          Join Meeting
                        </a>
                      )}

                      {meeting.status !== 'cancelled' && (
                        <UiverseButton variant="create" onClick={() => openMomModal(meeting)}>
                          Fill MOM
                        </UiverseButton>
                      )}

                      <UiverseButton variant="back" onClick={() => void openMinutesModal(meeting)}>
                        View MOM
                      </UiverseButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : toast.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-slate-700 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {momMeeting && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Submit MOM: {momMeeting.title}</h3>
              <button onClick={closeMomModal} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>

            <textarea
              value={momForm.discussion_summary}
              onChange={(e) => setMomForm((prev) => ({ ...prev, discussion_summary: e.target.value }))}
              placeholder="Discussion summary"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-20"
            />

            <textarea
              value={momForm.key_points}
              onChange={(e) => setMomForm((prev) => ({ ...prev, key_points: e.target.value }))}
              placeholder="Key points"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-20"
            />

            <textarea
              value={momForm.decisions}
              onChange={(e) => setMomForm((prev) => ({ ...prev, decisions: e.target.value }))}
              placeholder="Decisions"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-20"
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-900">Action Items</h4>
                <button onClick={addActionItem} className="text-sm text-blue-700 hover:underline">+ Add Item</button>
              </div>

              {momForm.action_items.map((item, index) => (
                <div key={`item-${index}`} className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <input
                    value={item.task}
                    onChange={(e) => updateActionItem(index, 'task', e.target.value)}
                    placeholder="Task"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={item.assignee || ''}
                    onChange={(e) => updateActionItem(index, 'assignee', e.target.value)}
                    placeholder="Assignee"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={item.due_date || ''}
                      onChange={(e) => updateActionItem(index, 'due_date', e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-full"
                    />
                    {momForm.action_items.length > 1 && (
                      <button onClick={() => removeActionItem(index)} className="px-2 py-1 text-rose-700">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Next Meeting Date</label>
              <input
                type="date"
                value={momForm.next_meeting_date}
                onChange={(e) => setMomForm((prev) => ({ ...prev, next_meeting_date: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <UiverseButton variant="back" onClick={closeMomModal}>Cancel</UiverseButton>
              <UiverseButton variant="create" onClick={() => void submitMom()} disabled={submittingMom}>
                {submittingMom ? 'Submitting...' : 'Submit MOM'}
              </UiverseButton>
            </div>
          </div>
        </div>
      )}

      {minutesMeeting && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">MOM Notes: {minutesMeeting.title}</h3>
              <button
                onClick={() => {
                  setMinutesMeeting(null);
                  setMinutes([]);
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {minutesLoading && <p className="text-slate-600">Loading MOM notes...</p>}

            {!minutesLoading && minutes.length === 0 && (
              <p className="text-slate-600">No MOM notes found for this meeting.</p>
            )}

            {!minutesLoading && minutes.length > 0 && (
              <div className="space-y-3">
                {minutes.map((minute) => (
                  <div key={minute.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50 space-y-2">
                    <p className="text-xs text-slate-500">Submitted by {minute.created_by || '-'} on {new Date(minute.created_at).toLocaleString()}</p>
                    <p><span className="font-semibold">Discussion:</span> {minute.discussion_summary || '-'}</p>
                    <p><span className="font-semibold">Key Points:</span> {minute.key_points || '-'}</p>
                    <p><span className="font-semibold">Decisions:</span> {minute.decisions || '-'}</p>
                    <p><span className="font-semibold">Next Meeting:</span> {minute.next_meeting_date || '-'}</p>
                    <div>
                      <p className="font-semibold">Action Items:</p>
                      {Array.isArray(minute.action_items) && minute.action_items.length > 0 ? (
                        <ul className="list-disc list-inside text-sm text-slate-700">
                          {minute.action_items.map((item, idx) => (
                            <li key={`a-${minute.id}-${idx}`}>
                              {item.task}
                              {item.assignee ? ` | ${item.assignee}` : ''}
                              {item.due_date ? ` | ${item.due_date}` : ''}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-600">No action items.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
