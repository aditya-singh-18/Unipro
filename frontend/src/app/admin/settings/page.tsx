"use client";

import { useEffect, useState } from "react";
import {
  CalendarRange,
  Cog,
  FileText,
  GraduationCap,
  Layers3,
  Users,
} from "lucide-react";
import {
  activateProjectCycle,
  createProjectCycle,
  getAdminSystemSettings,
  getProjectCycles,
  updateAdminSystemSettings,
  type AdminSystemSettings,
  type ProjectCycle,
} from "@/services/systemSettings.service";

const defaultSettings: AdminSystemSettings = {
  university_name: "ABC University",
  department_name: "Computer Science Engineering",
  academic_year: "2026-2027",
  semesters: ["Semester 7", "Semester 8"],

  allow_student_login: true,
  allow_mentor_login: true,
  allow_team_creation: true,
  allow_project_creation: true,
  mentor_assignment_mode: 'manual_only',
  mentor_auto_assign_threshold: 75,
  mentor_default_max_active_projects: 5,
  mentor_recommendation_top_n: 3,
  mentor_load_balance_enabled: true,

  max_projects_per_student: 1,
  max_projects_per_team: 1,
  max_teams_per_project_idea: 1,

  default_project_status: "PENDING",
  default_submission_status: "pending",

  project_start_date: null,
  project_end_date: null,
  total_project_weeks: 20,
  days_per_week: 7,
  submission_allowed_days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
  deadline_day: "sunday",
  deadline_time: "23:59:00",

  grace_enabled: false,
  grace_period_hours: 24,
  auto_lock_week_after_deadline: true,
  allow_late_submission: false,
  mark_week_as_missed_automatically: true,
  allow_admin_unlock_week: true,

  min_team_size: 2,
  max_team_size: 4,
  allow_solo_projects: false,
  max_teams_per_student: 3,
  max_teams_per_project: 1,
  team_leader_required: true,
  allow_leader_change: false,
  allow_member_add_after_creation: true,
  allow_member_removal: true,
  max_member_change_allowed: 2,
  auto_lock_team_after_project_approval: true,
  lock_team_after_week: 2,

  enable_weekly_submissions: true,
  total_submission_weeks: 20,
  required_submission_fields: ["progress_description", "github_repository_link", "file_upload"],
  allowed_file_types: ["pdf", "docx", "ppt", "zip"],
  max_file_size_mb: 20,
  max_files_per_submission: 3,
  allow_resubmission: true,
  max_resubmissions: 2,
  late_submission_penalty_percent: 10,
  auto_lock_week_after_review: false,
};

type SettingsSectionId =
  | "general"
  | "mentor"
  | "timeline"
  | "team"
  | "submissions"
  | "cycles";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cycleLoading, setCycleLoading] = useState(false);
  const [cycleSaving, setCycleSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<AdminSystemSettings>(defaultSettings);
  const [cycles, setCycles] = useState<ProjectCycle[]>([]);
  const [newCycleName, setNewCycleName] = useState("Final Year Major Project");
  const [newCycleStartYear, setNewCycleStartYear] = useState(2023);
  const [newCycleEndYear, setNewCycleEndYear] = useState(2027);
  const [newCycleMode, setNewCycleMode] = useState<'team_based' | 'individual' | 'both'>('team_based');
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("general");

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError("");
        const [fetchedSettings, fetchedCycles] = await Promise.all([
          getAdminSystemSettings(),
          getProjectCycles(),
        ]);

        setSettings(fetchedSettings);
        setCycles(fetchedCycles);
      } catch {
        setError("Failed to load system settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setNumber = (key: keyof AdminSystemSettings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: Number(value),
    }));
  };

  const setText = (key: keyof AdminSystemSettings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const setBool = (key: keyof AdminSystemSettings, value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const setCsvArray = (key: keyof AdminSystemSettings, value: string) => {
    const items = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    setSettings((prev) => ({
      ...prev,
      [key]: items,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const updated = await updateAdminSystemSettings(settings);
      setSettings(updated);
      setMessage("System settings saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save system settings");
    } finally {
      setSaving(false);
    }
  };

  const refreshCycles = async () => {
    setCycleLoading(true);
    try {
      setCycles(await getProjectCycles());
    } finally {
      setCycleLoading(false);
    }
  };

  const handleCreateCycle = async () => {
    try {
      setCycleSaving(true);
      setError("");
      setMessage("");
      await createProjectCycle({
        cycle_name: newCycleName,
        batch_start_year: Number(newCycleStartYear),
        batch_end_year: Number(newCycleEndYear),
        project_mode: newCycleMode,
      });
      await refreshCycles();
      setMessage("Project cycle created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project cycle");
    } finally {
      setCycleSaving(false);
    }
  };

  const handleActivateCycle = async (cycleId: number) => {
    try {
      setCycleSaving(true);
      setError("");
      setMessage("");
      await activateProjectCycle(cycleId);
      await refreshCycles();
      setMessage("Project cycle activated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate project cycle");
    } finally {
      setCycleSaving(false);
    }
  };

  const sections: Array<{
    id: SettingsSectionId;
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: "general",
      title: "General Settings",
      subtitle: "Campus, department, login controls",
      icon: Cog,
    },
    {
      id: "mentor",
      title: "Mentor Assignment",
      subtitle: "Assignment mode, scoring and load balance",
      icon: Users,
    },
    {
      id: "timeline",
      title: "Project Timeline",
      subtitle: "Dates, deadlines and lock windows",
      icon: CalendarRange,
    },
    {
      id: "team",
      title: "Team Rules",
      subtitle: "Team composition and change policies",
      icon: GraduationCap,
    },
    {
      id: "submissions",
      title: "Weekly Submissions",
      subtitle: "Submission payload and late penalties",
      icon: FileText,
    },
    {
      id: "cycles",
      title: "Project Cycles",
      subtitle: "Manage batch cycles and active intake",
      icon: Layers3,
    },
  ];

  const activeSectionMeta =
    sections.find((section) => section.id === activeSection) || sections[0];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-linear-to-r from-slate-100 via-white to-cyan-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
            <p className="mt-1 text-sm text-slate-600">
              Configure platform behavior from one place. Click a category to open only that settings block.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
            <StatChip label="Student Login" value={settings.allow_student_login ? "On" : "Off"} />
            <StatChip label="Mentor Login" value={settings.allow_mentor_login ? "On" : "Off"} />
            <StatChip label="Weekly Submissions" value={settings.enable_weekly_submissions ? "Enabled" : "Disabled"} />
            <StatChip label="Mentor Mode" value={settings.mentor_assignment_mode.replaceAll("_", " ")} />
          </div>
        </div>
      </section>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-500">Loading settings...</div>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Configuration Menu</div>
            <div className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      isActive
                        ? "border-blue-200 bg-blue-50 shadow-sm"
                        : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-lg p-2 ${isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm font-semibold ${isActive ? "text-blue-900" : "text-slate-900"}`}>{section.title}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{section.subtitle}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 border-b border-slate-200 pb-4">
              <h2 className="text-lg font-semibold text-slate-900">{activeSectionMeta.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{activeSectionMeta.subtitle}</p>
            </div>

            {activeSection === "general" ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <TextField label="University Name" value={settings.university_name} onChange={(value) => setText('university_name', value)} />
                  <TextField label="Department Name" value={settings.department_name} onChange={(value) => setText('department_name', value)} />
                  <TextField label="Academic Year" value={settings.academic_year} onChange={(value) => setText('academic_year', value)} />
                  <TextField
                    label="Semesters (comma separated)"
                    value={settings.semesters.join(', ')}
                    onChange={(value) => setCsvArray('semesters', value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <ToggleField label="Allow Student Login" checked={settings.allow_student_login} onChange={(value) => setBool('allow_student_login', value)} />
                  <ToggleField label="Allow Mentor Login" checked={settings.allow_mentor_login} onChange={(value) => setBool('allow_mentor_login', value)} />
                  <ToggleField label="Allow Team Creation" checked={settings.allow_team_creation} onChange={(value) => setBool('allow_team_creation', value)} />
                  <ToggleField label="Allow Project Creation" checked={settings.allow_project_creation} onChange={(value) => setBool('allow_project_creation', value)} />
                </div>
              </div>
            ) : null}

            {activeSection === "mentor" ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="rounded-xl border border-slate-200 p-4 md:col-span-2">
                    <div className="text-sm font-semibold text-slate-900">Assignment Mode</div>
                    <select
                      value={settings.mentor_assignment_mode}
                      onChange={(event) => setText('mentor_assignment_mode', event.target.value)}
                      className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="manual_only">Manual Only</option>
                      <option value="recommendation_required">Recommendation Required</option>
                      <option value="auto_assign">Auto Assign</option>
                    </select>
                  </label>
                  <NumberField
                    label="Auto Assign Threshold"
                    value={settings.mentor_auto_assign_threshold}
                    onChange={(value) => setNumber('mentor_auto_assign_threshold', value)}
                    help="Minimum score out of 100"
                  />
                  <NumberField
                    label="Top Recommendations"
                    value={settings.mentor_recommendation_top_n}
                    onChange={(value) => setNumber('mentor_recommendation_top_n', value)}
                    help="How many mentors to shortlist"
                  />
                  <NumberField
                    label="Default Max Active Projects"
                    value={settings.mentor_default_max_active_projects}
                    onChange={(value) => setNumber('mentor_default_max_active_projects', value)}
                    help="Used when mentor capacity is not set"
                  />
                  <ToggleField
                    label="Load Balance Recommendations"
                    checked={settings.mentor_load_balance_enabled}
                    onChange={(value) => setBool('mentor_load_balance_enabled', value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <NumberField label="Max Projects per Student" value={settings.max_projects_per_student} onChange={(value) => setNumber('max_projects_per_student', value)} help="Upper cap per student" />
                  <NumberField label="Max Projects per Team" value={settings.max_projects_per_team} onChange={(value) => setNumber('max_projects_per_team', value)} help="Upper cap per team" />
                  <NumberField label="Max Teams per Idea" value={settings.max_teams_per_project_idea} onChange={(value) => setNumber('max_teams_per_project_idea', value)} help="Idea concurrency limit" />
                </div>
              </div>
            ) : null}

            {activeSection === "timeline" ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <DateField label="Project Start Date" value={settings.project_start_date || ''} onChange={(value) => setText('project_start_date', value)} />
                  <DateField label="Project End Date" value={settings.project_end_date || ''} onChange={(value) => setText('project_end_date', value)} />
                  <NumberField label="Total Project Weeks" value={settings.total_project_weeks} onChange={(value) => setNumber('total_project_weeks', value)} help="Tracker timeline weeks" />
                  <NumberField label="Days per Week" value={settings.days_per_week} onChange={(value) => setNumber('days_per_week', value)} help="Usually 7" />
                  <TextField label="Submission Allowed Days (comma separated)" value={settings.submission_allowed_days.join(', ')} onChange={(value) => setCsvArray('submission_allowed_days', value)} />
                  <TextField label="Deadline Day" value={settings.deadline_day} onChange={(value) => setText('deadline_day', value)} />
                  <TimeField label="Deadline Time" value={settings.deadline_time} onChange={(value) => setText('deadline_time', value)} />
                  <NumberField label="Grace Hours" value={settings.grace_period_hours} onChange={(value) => setNumber('grace_period_hours', value)} help="Late grace window" />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
                  <ToggleField label="Enable Grace" checked={settings.grace_enabled} onChange={(value) => setBool('grace_enabled', value)} />
                  <ToggleField label="Lock After Deadline" checked={settings.auto_lock_week_after_deadline} onChange={(value) => setBool('auto_lock_week_after_deadline', value)} />
                  <ToggleField label="Allow Late Submission" checked={settings.allow_late_submission} onChange={(value) => setBool('allow_late_submission', value)} />
                  <ToggleField label="Auto Mark Missed" checked={settings.mark_week_as_missed_automatically} onChange={(value) => setBool('mark_week_as_missed_automatically', value)} />
                  <ToggleField label="Allow Admin Unlock" checked={settings.allow_admin_unlock_week} onChange={(value) => setBool('allow_admin_unlock_week', value)} />
                  <ToggleField label="Lock Week After Review" checked={settings.auto_lock_week_after_review} onChange={(value) => setBool('auto_lock_week_after_review', value)} />
                </div>
              </div>
            ) : null}

            {activeSection === "team" ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <NumberField label="Min Team Size" value={settings.min_team_size} onChange={(value) => setNumber('min_team_size', value)} help="Minimum members" />
                  <NumberField label="Max Team Size" value={settings.max_team_size} onChange={(value) => setNumber('max_team_size', value)} help="Maximum members" />
                  <NumberField label="Max Teams per Student" value={settings.max_teams_per_student} onChange={(value) => setNumber('max_teams_per_student', value)} help="Create or join cap" />
                  <NumberField label="Max Teams per Project" value={settings.max_teams_per_project} onChange={(value) => setNumber('max_teams_per_project', value)} help="Project team cap" />
                  <NumberField label="Max Member Changes" value={settings.max_member_change_allowed} onChange={(value) => setNumber('max_member_change_allowed', value)} help="Allowed member edits" />
                  <NumberField label="Lock Team After Week" value={settings.lock_team_after_week} onChange={(value) => setNumber('lock_team_after_week', value)} help="Week cutoff for edits" />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
                  <ToggleField label="Allow Solo Projects" checked={settings.allow_solo_projects} onChange={(value) => setBool('allow_solo_projects', value)} />
                  <ToggleField label="Team Leader Required" checked={settings.team_leader_required} onChange={(value) => setBool('team_leader_required', value)} />
                  <ToggleField label="Allow Leader Change" checked={settings.allow_leader_change} onChange={(value) => setBool('allow_leader_change', value)} />
                  <ToggleField label="Allow Member Add" checked={settings.allow_member_add_after_creation} onChange={(value) => setBool('allow_member_add_after_creation', value)} />
                  <ToggleField label="Allow Member Remove" checked={settings.allow_member_removal} onChange={(value) => setBool('allow_member_removal', value)} />
                  <ToggleField label="Auto Lock After Approval" checked={settings.auto_lock_team_after_project_approval} onChange={(value) => setBool('auto_lock_team_after_project_approval', value)} />
                </div>
              </div>
            ) : null}

            {activeSection === "submissions" ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <NumberField label="Total Submission Weeks" value={settings.total_submission_weeks} onChange={(value) => setNumber('total_submission_weeks', value)} help="Total reporting weeks" />
                  <TextField label="Required Fields (comma separated)" value={settings.required_submission_fields.join(', ')} onChange={(value) => setCsvArray('required_submission_fields', value)} />
                  <TextField label="Allowed File Types (comma separated)" value={settings.allowed_file_types.join(', ')} onChange={(value) => setCsvArray('allowed_file_types', value)} />
                  <NumberField label="Max File Size (MB)" value={settings.max_file_size_mb} onChange={(value) => setNumber('max_file_size_mb', value)} help="Per file" />
                  <NumberField label="Max Files per Submission" value={settings.max_files_per_submission} onChange={(value) => setNumber('max_files_per_submission', value)} help="Attachment count" />
                  <NumberField label="Max Resubmissions" value={settings.max_resubmissions} onChange={(value) => setNumber('max_resubmissions', value)} help="Retry cap" />
                  <NumberField label="Late Penalty %" value={settings.late_submission_penalty_percent} onChange={(value) => setNumber('late_submission_penalty_percent', value)} help="Score deduction" />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
                  <ToggleField label="Enable Weekly Submissions" checked={settings.enable_weekly_submissions} onChange={(value) => setBool('enable_weekly_submissions', value)} />
                  <ToggleField label="Allow Resubmission" checked={settings.allow_resubmission} onChange={(value) => setBool('allow_resubmission', value)} />
                </div>
              </div>
            ) : null}

            {activeSection === "cycles" ? (
              <div className="space-y-5">
                <p className="text-sm text-slate-500">Create cycles and activate one current cycle for project intake.</p>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <TextField label="Cycle Name" value={newCycleName} onChange={setNewCycleName} />
                  <NumberField label="Batch Start Year" value={newCycleStartYear} onChange={(value) => setNewCycleStartYear(Number(value))} help="Example: 2023" />
                  <NumberField label="Batch End Year" value={newCycleEndYear} onChange={(value) => setNewCycleEndYear(Number(value))} help="Example: 2027" />
                  <label className="rounded-xl border border-slate-200 p-4">
                    <div className="text-sm font-semibold text-slate-900">Project Mode</div>
                    <select
                      value={newCycleMode}
                      onChange={(event) => setNewCycleMode(event.target.value as 'team_based' | 'individual' | 'both')}
                      className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="team_based">Team Based</option>
                      <option value="individual">Individual</option>
                      <option value="both">Both</option>
                    </select>
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => void handleCreateCycle()}
                    disabled={cycleSaving}
                    className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {cycleSaving ? 'Saving...' : 'Add Project Cycle'}
                  </button>
                </div>

                <div className="space-y-3">
                  {cycleLoading ? <div className="text-sm text-slate-500">Loading cycles...</div> : null}
                  {cycles.map((cycle) => (
                    <div key={cycle.cycle_id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                      <div>
                        <div className="font-semibold text-slate-900">{cycle.cycle_name}</div>
                        <div className="text-xs text-slate-500">Batch {cycle.batch_start_year} - {cycle.batch_end_year} • Mode: {cycle.project_mode}</div>
                      </div>
                      <button
                        onClick={() => void handleActivateCycle(cycle.cycle_id)}
                        disabled={cycleSaving || cycle.is_active}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                      >
                        {cycle.is_active ? 'Active' : 'Set Active'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {activeSection !== "cycles" ? (
              <div className="mt-6 flex justify-end border-t border-slate-200 pt-4">
                <button
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-center">
      <div className="truncate text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 truncate text-xs font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
      <div className="text-sm font-semibold text-slate-900">{label}</div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="rounded-xl border border-slate-200 p-4">
      <div className="text-sm font-semibold text-slate-900">{label}</div>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="rounded-xl border border-slate-200 p-4">
      <div className="text-sm font-semibold text-slate-900">{label}</div>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
    </label>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="rounded-xl border border-slate-200 p-4">
      <div className="text-sm font-semibold text-slate-900">{label}</div>
      <input
        type="time"
        value={String(value || '').slice(0, 5)}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
  help: string;
}) {
  return (
    <label className="rounded-xl border border-slate-200 p-4">
      <div className="text-sm font-semibold text-slate-900">{label}</div>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
      <div className="mt-2 text-xs text-slate-500">{help}</div>
    </label>
  );
}
