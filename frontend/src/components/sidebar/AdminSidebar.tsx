"use client";

import {
  LayoutDashboard,
  Users,
  FolderKanban,
  BarChart3,
  Building2,
  CheckSquare,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/store/auth.store";

type SidebarMode = "stable" | "hover";

const menu = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
  { label: "User Management", icon: Users, path: "/admin/users" },
  { label: "Project Oversight", icon: FolderKanban, path: "/admin/projects" },
  { label: "Analytics", icon: BarChart3, path: "/admin/analytics" },
  { label: "Reports & Exports", icon: FileText, path: "/admin/reports" },
  { label: "Department Performance", icon: Building2, path: "/admin/departments" },
  { label: "Approvals", icon: CheckSquare, path: "/admin/approvals" },
  { label: "System Settings", icon: Settings, path: "/admin/settings" },
];

export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mode, setMode] = useState<SidebarMode>(() => {
    if (typeof window === "undefined") return "stable";

    const savedMode = localStorage.getItem("admin_sidebar_mode");
    return savedMode === "hover" ? "hover" : "stable";
  });
  const [isHovering, setIsHovering] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const STORAGE_KEY = "admin_sidebar_mode";

  const resolveSidebarMode = (value: string | null): SidebarMode =>
    value === "hover" ? "hover" : "stable";

  const effectiveCollapsed = mode === "hover" ? !isHovering : collapsed;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore storage errors
    }
  }, [mode]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setMode(resolveSidebarMode(event.newValue));
    };

    const handleCustomSidebarMode = (event: Event) => {
      const customEvent = event as CustomEvent<SidebarMode>;
      setMode(resolveSidebarMode(customEvent.detail ?? null));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("admin-sidebar-mode-change", handleCustomSidebarMode as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("admin-sidebar-mode-change", handleCustomSidebarMode as EventListener);
    };
  }, []);

  useEffect(() => {
    const offsetPx =
      mode === "stable" ? (collapsed ? 64 : 224) : 64;

    document.documentElement.style.setProperty(
      "--admin-sidebar-offset",
      `${offsetPx}px`
    );

    return () => {
      document.documentElement.style.removeProperty("--admin-sidebar-offset");
    };
  }, [mode, collapsed]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node)
      ) {
        setShowLogoutModal(false);
      }
    };

    if (showLogoutModal) {
      document.addEventListener("mousedown", handler);
    }
    return () =>
      document.removeEventListener("mousedown", handler);
  }, [showLogoutModal]);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <aside
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`
        fixed left-0 top-0 z-40
        h-screen
        ${effectiveCollapsed ? "w-16" : "w-56"}
        shrink-0
        bg-linear-to-b from-[#1e3a5f] via-[#243b63] to-[#1a2f4a]
        text-white
        flex
        flex-col
        shadow-2xl
        border-r border-white/10
        transition-all
        duration-300
        ease-in-out
        overflow-hidden
      `}
    >
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between">
          {!effectiveCollapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-linear-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">
                U
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold tracking-tight truncate">UNIVERSITY</h1>
                <p className="text-xs text-blue-200/80 truncate">Admin Portal</p>
              </div>
            </div>
          )}

          <button
            onClick={() => setCollapsed((v) => !v)}
            disabled={mode === "hover"}
            className="p-2 rounded-lg hover:bg-white/10 transition-all duration-200 ml-auto"
            title={mode === "hover" ? "Disabled in hover mode" : effectiveCollapsed ? "Expand" : "Collapse"}
          >
            {effectiveCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2">
        <div className="space-y-0.5">
          {menu.map((item) => {
            const active =
              pathname === item.path ||
              pathname.startsWith(item.path + "/");

            return (
              <div
                key={item.label}
                onClick={() => router.push(item.path)}
                className={`
                  group
                  flex
                  items-center
                  gap-2.5
                  px-3
                  py-2.5
                  rounded-lg
                  cursor-pointer
                  transition-all
                  duration-200
                  ${
                    active
                      ? "bg-linear-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/30 scale-[1.02]"
                      : "hover:bg-white/10 hover:translate-x-1"
                  }
                `}
                title={effectiveCollapsed ? item.label : undefined}
              >
                <item.icon 
                  size={19} 
                  className={`shrink-0 ${active ? 'text-white' : 'text-blue-200'} transition-colors`} 
                />
                {!effectiveCollapsed && (
                  <span className={`text-sm font-medium truncate ${active ? 'text-white' : 'text-gray-100'}`}>
                    {item.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Sidebar mode settings */}
      <div className="px-2 pb-2">
        <button
          onClick={() => setMode((prev) => (prev === "stable" ? "hover" : "stable"))}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-all duration-200 text-blue-100"
          title={effectiveCollapsed ? "Toggle sidebar mode" : undefined}
        >
          <Settings size={18} className="shrink-0" />
          {!effectiveCollapsed && (
            <span className="text-xs font-semibold tracking-wide">
              Sidebar: {mode === "stable" ? "Stable" : "Hover"}
            </span>
          )}
        </button>
      </div>

      {/* Footer - Logout */}
      <div className="border-t border-white/10 px-2 py-3">
        <button
          onClick={handleLogoutClick}
          className="
            w-full
            flex
            items-center
            gap-2.5
            px-3
            py-2.5
            rounded-lg
            hover:bg-red-500/20
            text-red-300
            hover:text-red-200
            transition-all
            duration-200
            group
          "
          title={effectiveCollapsed ? "Logout" : undefined}
        >
          <LogOut size={20} className="shrink-0 group-hover:rotate-12 transition-transform" />
          {!effectiveCollapsed && (
            <span className="text-sm font-medium">Logout</span>
          )}
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div 
            ref={modalRef}
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-in fade-in duration-200"
          >
            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-900">Confirm Logout</h3>
              <p className="text-slate-600 mt-2">Are you sure you want to logout?</p>
            </div>

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2.5 border-2 border-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="px-4 py-2.5 bg-linear-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-red-500/30 transition-all duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
