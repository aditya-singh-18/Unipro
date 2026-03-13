"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/auth.store";

import MentorSidebar from "@/components/sidebar/MentorSidebar";
import MentorTopbar from "@/components/topbar/MentorTopbar";

/* ---------- SECURE TYPE DEFINITIONS ---------- */

type UserRole = "MENTOR" | "STUDENT" | "ADMIN";

type AuthUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: UserRole;
  [key: string]: unknown;
};

/* ---------- SECURE TYPE GUARD ---------- */

function isMentorUser(user: unknown): user is AuthUser & { role: "MENTOR" } {
  if (!user || typeof user !== "object") return false;
  
  const userObj = user as Record<string, unknown>;
  return userObj.role === "MENTOR" && typeof userObj.role === "string";
}

/* ---------- MENTOR LAYOUT ---------- */

export default function MentorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, token } = useAuth();
  const router = useRouter();

  // Debug logging
  useEffect(() => {
    console.log("🔍 Mentor Layout Debug:", { user, token, role: user?.role });
  }, [user, token]);

  useEffect(() => {
    // If user is loading (token exists but user not yet loaded), wait
    if (token && user === null) {
      return; // Still loading user profile
    }

    // If no token, user is not logged in
    if (!token) {
      router.replace("/login");
      return;
    }

    // If user exists but not a mentor
    if (user && !isMentorUser(user)) {
      console.log("❌ Not a mentor:", user);
      router.replace("/login");
      return;
    }

    console.log("✅ Mentor authorized:", user);
  }, [token, user, router]);

  // Still loading
  if (token && !user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="text-xl font-semibold text-slate-700">
            Loading profile...
          </div>
          <div className="text-sm text-slate-500 mt-2">
            Please wait while we verify your access
          </div>
        </div>
      </div>
    );
  }

  // No token = not logged in
  if (!token) {
    return null;
  }

  // User exists but not mentor
  if (!isMentorUser(user)) {
    return null;
  }

  // ✅ User is an authorized mentor - render the layout
  return (
    <div className="h-screen bg-slate-100 overflow-hidden">
      <MentorSidebar />

      <div
        className="h-screen flex flex-col"
        style={{ marginLeft: "var(--mentor-sidebar-offset, 72px)" }}
      >
        <MentorTopbar />
        <main className="p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
