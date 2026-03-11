import axios from "@/lib/axios";

/* GET profile */
export const getStudentProfile = async () => {
  try {
    const res = await axios.get("/student/profile");
    return res.data?.data || res.data;
  } catch (err: unknown) {
    // Gracefully handle missing profile as null instead of throwing
    if (
      typeof err === "object" &&
      err !== null &&
      "response" in err &&
      typeof (err as { response?: { status?: number } }).response?.status === "number" &&
      (err as { response?: { status?: number } }).response?.status === 404
    ) {
      return null;
    }
    throw err;
  }
};

/* UPDATE bio */
export const updateStudentBio = async (bio: string) => {
  const res = await axios.put("/student/bio", { bio });
  return res.data?.data || res.data;
};

/* GET skills */
export const getStudentSkills = async () => {
  const res = await axios.get("/student/skills");
  const skills = (res.data?.data || res.data || []).map((s: Record<string, unknown>) => ({
    id: s.id,
    skill: s.skill_name,
    created_at: s.created_at,
  }));
  return skills;
};

/* ADD skill */
export const addStudentSkill = async (body: { skill: string }) => {
  const res = await axios.post("/student/skills", {
    skill_name: body.skill,
  });
  return res.data?.data || res.data;
};

/* DELETE skill */
export const deleteStudentSkill = async (skillId: number) => {
  await axios.delete(`/student/skills/${skillId}`);
};
