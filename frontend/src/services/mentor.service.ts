import axios from "@/lib/axios";

export type MentorSkill = {
  id: number;
  mentor_id: string;
  tech_stack: string;
  track: string;
  skill_type: string;
  proficiency_level: string;
  created_at: string;
};

export type MentorProfile = {
  employee_id: string;
  full_name: string;
  official_email: string;
  department: string | null;
  designation: string | null;
  contact_number: string | null;
  is_active: boolean;
  primary_track: string | null;
  secondary_tracks: string[];
  created_at: string;
  updated_at: string;
  skills?: MentorSkill[];
};

export type UpsertSkillPayload = {
  tech_stack: string;
  track: string;
  skill_type?: string;
  proficiency_level?: string;
};

export type UpdateProfilePayload = {
  department?: string;
  designation?: string;
  contact_number?: string;
  primary_track?: string;
  secondary_tracks?: string[];
};

export const getMentorProfile = async (): Promise<MentorProfile> => {
  const res = await axios.get("/mentor/profile");
  return res.data?.data;
};

export const getStudentViewMentorProfile = async (
  employeeId: string
): Promise<MentorProfile> => {
  const res = await axios.get(`/mentor/student-view/${employeeId}`);
  return res.data?.data;
};

export const updateMentorProfile = async (
  payload: UpdateProfilePayload
): Promise<MentorProfile> => {
  const res = await axios.put("/mentor/profile", payload);
  return res.data?.data;
};

export const getMentorSkills = async (): Promise<MentorSkill[]> => {
  const res = await axios.get("/mentor/skills");
  return res.data?.data || [];
};

export const addMentorSkill = async (
  payload: UpsertSkillPayload
): Promise<MentorSkill> => {
  const res = await axios.post("/mentor/skills", payload);
  return res.data?.data;
};

export const updateMentorSkill = async (
  skillId: number,
  payload: Partial<UpsertSkillPayload>
): Promise<MentorSkill> => {
  const res = await axios.put(`/mentor/skills/${skillId}`, payload);
  return res.data?.data;
};

export const deleteMentorSkill = async (skillId: number) => {
  await axios.delete(`/mentor/skills/${skillId}`);
};
