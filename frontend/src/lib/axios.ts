import axios, { AxiosError } from "axios";

/* ================= AXIOS INSTANCE ================= */

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: false,
});

/* ================= REQUEST INTERCEPTOR ================= */

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");

      if (token) {
        // ✅ Axios v1 compatible way
        config.headers?.set("Authorization", `Bearer ${token}`);
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);


/* ================= RESPONSE INTERCEPTOR ================= */

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (typeof window !== "undefined") {
      const status = error.response?.status;
      const requestUrl = error.config?.url || "";
      // Only redirect to login if we're not already on login page AND token exists in storage
      // This prevents redirect loops during initial page load
      const token = localStorage.getItem("token");
      const isLoginPage = window.location.pathname === "/login" || window.location.pathname === "/register";
      const isAuthProfileRequest = requestUrl.includes("/auth/profile");

      // Treat only true auth failures as session-expired events.
      // 403 can be endpoint-level permission denial and should not force logout.
      if ((status === 401 || (status === 403 && isAuthProfileRequest)) && token && !isLoginPage) {
        console.warn(`🔒 [Axios] Session expired (${status}), clearing token and redirecting to login`);
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
