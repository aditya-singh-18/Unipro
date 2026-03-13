"use client";

import {
  LayoutDashboard,
  Folder,
  Users,
  BarChart,
  Calendar,
  Brain,
  ClipboardList,
  User,
  ChevronLeft,
  ChevronRight,
  Settings,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type SidebarMode = "stable" | "hover";

const menu = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/mentor/dashboard" },
  { label: "Assigned Projects", icon: Folder, path: "/mentor/projects" },
  { label: "Students & Teams", icon: Users, path: "/mentor/students" },
  { label: "Analytics", icon: BarChart, path: "/mentor/analytics" },
  { label: "Meetings & Schedule", icon: Calendar, path: "/mentor/meetings" },
  { label: "AI Review", icon: Brain, path: "/mentor/ai-review" },
  { label: "Evaluation & Marks", icon: ClipboardList, path: "/mentor/evaluation" },
  { label: "Exams", icon: ClipboardList, path: "/mentor/exams" },
  { label: "Profile & Skills", icon: User, path: "/mentor/profile" },
];

export default function MentorSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mode, setMode] = useState<SidebarMode>(() => {
    if (typeof window === "undefined") return "stable";

    const savedMode = localStorage.getItem("mentor_sidebar_mode");
    return savedMode === "hover" ? "hover" : "stable";
  });
  const [isHovering, setIsHovering] = useState(false);
  const STORAGE_KEY = "mentor_sidebar_mode";

  const effectiveCollapsed = mode === "hover" ? !isHovering : collapsed;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }, [mode]);

  useEffect(() => {
    const offsetPx =
      mode === "stable" ? (collapsed ? 72 : 256) : 72;

    document.documentElement.style.setProperty(
      "--mentor-sidebar-offset",
      `${offsetPx}px`
    );

    return () => {
      document.documentElement.style.removeProperty("--mentor-sidebar-offset");
    };
  }, [mode, collapsed]);

  return (
    <aside
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`
        h-screen
        fixed
        left-0
        top-0
        z-40
        ${effectiveCollapsed ? "w-18" : "w-64"}
        min-w-18
        bg-[#2c4c7c]
        text-white
        flex
        flex-col
        p-3
        shrink-0
        overflow-hidden
        transition-all
        duration-300
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        {!effectiveCollapsed && (
          <h1 className="text-sm font-bold flex items-center gap-2 truncate">
            <span className="text-xl">U</span> UNIVERSITY
          </h1>
        )}

        <button
          onClick={() => setCollapsed((v) => !v)}
          disabled={mode === "hover"}
          className="p-1 rounded-md hover:bg-white/20 transition"
          title={mode === "hover" ? "Disabled in hover mode" : effectiveCollapsed ? "Expand" : "Collapse"}
        >
          {effectiveCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto">
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
                gap-3
                px-3
                py-2
                rounded-lg
                cursor-pointer
                transition
                ${
                  active
                    ? "bg-[#1f3b63] border-l-4 border-white"
                    : "hover:bg-[#1f3b63]/70"
                }
              `}
              title={effectiveCollapsed ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              {!effectiveCollapsed && (
                <span className="text-sm truncate">{item.label}</span>
              )}
            </div>
          );
        })}
      </nav>

      <div className="pt-2 border-t border-white/10">
        <button
          onClick={() => setMode((prev) => (prev === "stable" ? "hover" : "stable"))}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1f3b63]/70 transition"
          title={effectiveCollapsed ? "Toggle sidebar mode" : undefined}
        >
          <Settings size={18} className="shrink-0" />
          {!effectiveCollapsed && (
            <span className="text-xs font-semibold">Sidebar: {mode === "stable" ? "Stable" : "Hover"}</span>
          )}
        </button>
      </div>
    </aside>
  );
}
