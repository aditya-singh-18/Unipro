import axios from '@/lib/axios';
import { MyProjectsResponse, CreateProjectPayload } from '@/types/project';

export interface MentorAssignedProject {
  project_id: number | string;
  title: string;
  description?: string;
  tech_stack?: string[];
  status: string;
  created_at: string;
  approved_at?: string | null;
}

export interface MentorAssignedProjectsResponse {
  count: number;
  projects: MentorAssignedProject[];
}

export interface MentorRecommendation {
  recommendation_id?: number;
  mentor_employee_id: string;
  mentor_name?: string;
  mentor_email?: string;
  rank_position: number;
  score: number;
  track_score: number;
  tech_score: number;
  proficiency_score: number;
  workload_score: number;
  fairness_score?: number;
  assigned_projects?: number;
  max_active_projects?: number;
  reason_json?: {
    trackMatch?: string;
    techMatches?: string[];
    proficiencyScore?: number;
    currentLoad?: number;
    maxActiveProjects?: number;
    fairnessNote?: string;
  };
}

export interface ProjectMentorRecommendationsResponse {
  project: {
    project_id: string;
    title: string;
    track: string;
    tech_stack: string[];
    status: string;
    mentor_employee_id?: string | null;
  };
  recommendation_count: number;
  recommendations: MentorRecommendation[];
}

/**
 * STUDENT: Get My Projects
 * GET /project/my-projects
 */
export const getMyProjects = async (): Promise<MyProjectsResponse> => {
  const response = await axios.get<MyProjectsResponse>(
    '/project/my-projects'
  );

  return response.data;
};

/**
 * STUDENT: Get Project Detail by ID
 * GET /project/:projectId
 */
export const getProjectDetail = async (projectId: string) => {
  const response = await axios.get(`/project/${projectId}`);
  return response.data;
};

/**
 * STUDENT: Create Project
 * POST /project/create
 */
export const createProject = async (
  payload: CreateProjectPayload
): Promise<void> => {
  await axios.post('/project/create', payload);
};
/**
 * STUDENT: Update Project (before approval)
 * PUT /project/:projectId/edit
 */
export const updateProject = async (
  projectId: string,
  payload: Omit<CreateProjectPayload, 'teamId'>
) => {
  const response = await axios.put(`/project/${projectId}/edit`, payload);
  return response.data;
};

/**
 * MENTOR: Get assigned projects
 * GET /project/mentor/assigned
 */
export const getMentorAssignedProjects = async (): Promise<MentorAssignedProjectsResponse> => {
  const response = await axios.get<MentorAssignedProjectsResponse>('/project/mentor/assigned');
  return response.data;
};

export const getProjectMentorRecommendations = async (
  projectId: string,
  options?: { refresh?: boolean; limit?: number }
): Promise<ProjectMentorRecommendationsResponse> => {
  const params = new URLSearchParams();
  if (options?.refresh) params.set('refresh', 'true');
  if (options?.limit) params.set('limit', String(options.limit));

  const query = params.toString();
  const response = await axios.get<ProjectMentorRecommendationsResponse>(
    `/project/admin/${projectId}/mentor-recommendations${query ? `?${query}` : ''}`
  );
  return response.data;
};

export const approveRecommendedMentor = async (payload: {
  projectId: string;
  mentorEmployeeId: string;
}) => {
  const response = await axios.post('/project/admin/approve-recommended-mentor', payload);
  return response.data;
};