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