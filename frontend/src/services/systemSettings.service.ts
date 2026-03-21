import axios from '@/lib/axios';

export type AdminSystemSettings = {
  university_name: string;
  department_name: string;
  academic_year: string;
  semesters: string[];

  allow_student_login: boolean;
  allow_mentor_login: boolean;
  auth_rate_limit_enabled: boolean;
  student_auth_rate_limit_max: number;
  mentor_auth_rate_limit_max: number;
  admin_auth_rate_limit_max: number;
  student_auth_rate_limit_window_ms: number;
  mentor_auth_rate_limit_window_ms: number;
  admin_auth_rate_limit_window_ms: number;
  allow_team_creation: boolean;
  allow_project_creation: boolean;
  mentor_assignment_mode: 'manual_only' | 'recommendation_required' | 'auto_assign';
  mentor_auto_assign_threshold: number;
  mentor_default_max_active_projects: number;
  mentor_recommendation_top_n: number;
  mentor_load_balance_enabled: boolean;

  max_projects_per_student: number;
  max_projects_per_team: number;
  max_teams_per_project_idea: number;

  default_project_status: string;
  default_submission_status: string;

  project_start_date: string | null;
  project_end_date: string | null;
  total_project_weeks: number;
  days_per_week: number;
  submission_allowed_days: string[];
  deadline_day: string;
  deadline_time: string;

  grace_enabled: boolean;
  grace_period_hours: number;
  auto_lock_week_after_deadline: boolean;
  allow_late_submission: boolean;
  mark_week_as_missed_automatically: boolean;
  allow_admin_unlock_week: boolean;

  min_team_size: number;
  max_team_size: number;
  allow_solo_projects: boolean;
  max_teams_per_student: number;
  max_teams_per_project: number;
  team_leader_required: boolean;
  allow_leader_change: boolean;
  allow_member_add_after_creation: boolean;
  allow_member_removal: boolean;
  max_member_change_allowed: number;
  auto_lock_team_after_project_approval: boolean;
  lock_team_after_week: number;

  enable_weekly_submissions: boolean;
  total_submission_weeks: number;
  required_submission_fields: string[];
  allowed_file_types: string[];
  max_file_size_mb: number;
  max_files_per_submission: number;
  allow_resubmission: boolean;
  max_resubmissions: number;
  late_submission_penalty_percent: number;
  auto_lock_week_after_review: boolean;
};

export type ProjectCycle = {
  cycle_id: number;
  cycle_name: string;
  batch_start_year: number;
  batch_end_year: number;
  project_mode: 'team_based' | 'individual' | 'both';
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PublicSystemAccess = {
  allow_student_login: boolean;
  allow_mentor_login: boolean;
  allow_team_creation: boolean;
  allow_project_creation: boolean;
  enable_weekly_submissions: boolean;
  team_leader_required: boolean;
  allow_leader_change: boolean;
  allow_member_removal: boolean;
  min_team_size: number;
  max_team_size: number;
  allow_solo_projects: boolean;
};

export const getAdminSystemSettings = async (): Promise<AdminSystemSettings> => {
  const res = await axios.get('/admin/system-settings');
  return res.data?.data;
};

export const updateAdminSystemSettings = async (
  payload: Partial<AdminSystemSettings>
): Promise<AdminSystemSettings> => {
  const res = await axios.put('/admin/system-settings', payload);
  return res.data?.data;
};

export const getProjectCycles = async (): Promise<ProjectCycle[]> => {
  const res = await axios.get('/admin/system-settings/project-cycles');
  return res.data?.data || [];
};

export const createProjectCycle = async (payload: {
  cycle_name: string;
  batch_start_year: number;
  batch_end_year: number;
  project_mode: 'team_based' | 'individual' | 'both';
}): Promise<ProjectCycle> => {
  const res = await axios.post('/admin/system-settings/project-cycles', payload);
  return res.data?.data;
};

export const activateProjectCycle = async (cycleId: number): Promise<ProjectCycle> => {
  const res = await axios.patch(`/admin/system-settings/project-cycles/${cycleId}/activate`);
  return res.data?.data;
};

export const getPublicSystemAccess = async (): Promise<PublicSystemAccess> => {
  const res = await axios.get('/public/system-access');
  return (
    res.data?.data || {
      allow_student_login: true,
      allow_mentor_login: true,
      allow_team_creation: true,
      allow_project_creation: true,
      enable_weekly_submissions: true,
      team_leader_required: true,
      allow_leader_change: false,
      allow_member_removal: true,
      min_team_size: 2,
      max_team_size: 4,
      allow_solo_projects: false,
    }
  );
};
