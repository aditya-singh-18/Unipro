import api from "@/lib/axios";

export const getMyProfile = async () => {
  const res = await api.get("/profile/me");
  return res.data;
};

export const updateMyProfile = async (payload: {
  full_name: string;
  year: number;
  division: string;
  contact_number: string;
}) => {
  const res = await api.put("/profile/me", payload);
  return res.data;
};
