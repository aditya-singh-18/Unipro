"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { getMyProfile } from "../services/profile.service"; // ✅ relative import

type SocialLink = {
  platform: string;
  link: string;
};
export type UserRole = "STUDENT" | "MENTOR" | "ADMIN";

export type User = {
  // 🔹 COMMON (sab ke liye)
  role?: UserRole;              // ✅ ADD THIS
  userKey?: string;             // enrollmentId OR employeeId

  // 🔹 STUDENT (existing – untouched)
  enrollmentId?: string;
  name: string;
  email: string;
  department?: string;
  year?: number;
  division?: string;
  rollNumber?: string;
  contactNumber?: string;
  status?: string;
  socialLinks?: SocialLink[];

    // mentor/admin
  employee_id?: string;
  designation?: string;
  official_email?: string;
  contact_number?: string;
  is_active?: boolean;
};

type AuthContextType = {
  token: string | null;
  user: User | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(
  null
);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const profile = await getMyProfile();
      setUser(profile);
    } catch (err) {
      console.error("Failed to refresh user:", err);
      logout();
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof window === "undefined") {
          setLoading(false);
          return;
        }

        const storedToken = localStorage.getItem("token");
        if (!storedToken) {
          setLoading(false);
          return;
        }

        setToken(storedToken);
        const profile = await getMyProfile();
        setUser(profile);
      } catch (error) {
        console.error("Auth init error:", error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    await refreshUser();
  };

  // ✅ VERY IMPORTANT: prevent crash during HMR
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{ token, user, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  // ✅ HMR-safe guard (NO THROW)
  if (!ctx) {
    return {
      token: null,
      user: null,
      login: async () => {},
      logout: () => {},
      refreshUser: async () => {},
    };
  }

  return ctx;
}
