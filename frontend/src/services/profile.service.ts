import api from "@/lib/axios";

/* =========================
   TYPES
========================= */
export type SocialLink = {
  platform: string;
  link: string;
};

/* =========================
   GET PROFILE
========================= */
export const getMyProfile = async () => {
  const res = await api.get("/profile/me");
  const p = res.data;

  return {
    role: p.role,
    userKey: p.enrollment_id || p.employee_id,
    enrollmentId: p.enrollment_id || p.employee_id,
    employee_id: p.employee_id,
    name: p.full_name || p.name,
    email: p.student_email || p.official_email || p.email,
    department: p.department,
    year: p.year,
    division: p.division,
    rollNumber: p.roll_number,
    contactNumber: p.contact_number || p.contact_number,
    status: p.status,
    Bio: p.bio,
    socialLinks: p.social_links ?? [],
  };
};

/* =========================
   UPDATE SOCIAL LINKS (SAVE)
========================= */
export const updateSocialLinks = async (
  links: SocialLink[]
) => {
  const res = await api.put("/profile/me", {
    social_links: links,
  });

  return res.data;
};

/* =========================
   DELETE SOCIAL LINK (IMMEDIATE)
   🔥 EXACT BACKEND CONTRACT
   DELETE /profile/me/social-links/:platform
========================= */
export const deleteSocialLink = async (
  platform: string
) => {
  if (!platform) {
    throw new Error("Platform is required for delete");
  }

  const res = await api.delete(
    `/profile/me/social-links/${platform}`
  );

  return res.data;
};
