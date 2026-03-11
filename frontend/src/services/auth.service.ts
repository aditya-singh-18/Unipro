// src/services/auth.service.ts
import api from "../lib/axios";

type LoginPayload = {
  identifier: string;
  password: string;
  role: "STUDENT" | "ADMIN" | "MENTOR";
};

export const loginUser = async (payload: LoginPayload) => {
  const res = await api.post("/auth/login", payload);
  return res.data;
};
