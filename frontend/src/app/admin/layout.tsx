"use client";

import AdminSidebar from "@/components/sidebar/AdminSidebar";
import AdminTopbar from "../../components/topbar/AdminTopbar";
import { useAuth } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, token } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected.current) return;

    // Wait for auth to initialize
    if (token === null && user === null) {
      return; // Still loading
    }

    // Check authentication
    if (!token) {
      hasRedirected.current = true;
      router.replace("/login");
      return;
    }

    // Check role once user is loaded
    if (user && user.role !== "ADMIN") {
      hasRedirected.current = true;
      router.replace("/login");
      return;
    }
  }, [token, user, router]);

  // Show loading only during initial auth check
  if (token === null || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Don't render if not admin (will redirect)
  if (user.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">
      {/* SIDEBAR */}
      <AdminSidebar />

      {/* CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar />

        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
