// src/types/user.ts

/* ================= BASE ================= */

export type BaseUser = {
  id: number;
  name: string;
  email: string;
  department?: string;
  is_active?: boolean;
};

/* ================= STUDENT ================= */

export type StudentUser = BaseUser & {
  role: "STUDENT";
  enrollmentId: string;
  year?: number;
  division?: string;
  rollNumber?: string;
  contactNumber?: string;
  status?: string;
};

/* ================= MENTOR ================= */

export type MentorUser = BaseUser & {
  role: "MENTOR";
  employee_id?: string;
  designation?: string;
  official_email?: string;
  contact_number?: string;
};

/* ================= ADMIN (optional) ================= */

export type AdminUser = BaseUser & {
  role: "ADMIN";
};

/* ================= AUTH USER ================= */

export type AuthUser = StudentUser | MentorUser | AdminUser;

/* ================= TYPE GUARDS ================= */

export const isStudentUser = (
  user: AuthUser | null
): user is StudentUser => {
  return user?.role === "STUDENT";
};

export const isMentorUser = (
  user: AuthUser | null
): user is MentorUser => {
  return user?.role === "MENTOR";
};
