// ===============================
// PROJECT TYPES
// ===============================

export interface Project {
  project_id: string;
  title: string;
  description?: string;

  track: string;                 // ✅ NEW
  tech_stack: string[];           // ✅ ARRAY

  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'APPROVED' | 'RESUBMITTED';

  mentor_employee_id?: string;
  mentor_feedback?: string;

  created_at: string;
  approved_at?: string;
}


// ===============================
// API RESPONSES
// ===============================

export interface MyProjectsResponse {
  success: boolean;
  count: number;
  projects: Project[];
}

// ===============================
// CREATE PROJECT PAYLOAD
// ===============================

export interface CreateProjectPayload {
  teamId: string;
  title: string;
  description: string;
  track: string;          // ✅ REQUIRED
  techStack: string[];    // ✅ ARRAY
}
