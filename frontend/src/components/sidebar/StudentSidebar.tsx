"use client";

import {
  LayoutDashboard,
  Lightbulb,
  Folder,
  Users,
  BarChart,
  Calendar,
  MessageSquare,
  Brain,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type SidebarMode = "stable" | "hover";

const menu = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Project Ideas", icon: Lightbulb, path: "/ideas" },
  { label: "My Project", icon: Folder, path: "/student/my-project" },
  { label: "Team & Collaboration", icon: Users, path: "/team" },
  { label: "Progress Tracker", icon: BarChart, path: "/progress" },
  { label: "Meetings", icon: Calendar, path: "/student/meetings" },
  { label: "Feedback & Marks", icon: MessageSquare, path: "/feedback" },
  { label: "AI Suggestions", icon: Brain, path: "/ai" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

type SidebarProps = {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
};

export default function Sidebar({
  collapsed,
  onCollapsedChange,
}: SidebarProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [mode, setMode] = useState<SidebarMode>(() => {
    if (typeof window === "undefined") return "stable";

    const savedMode = localStorage.getItem("student_sidebar_mode");
    return savedMode === "hover" ? "hover" : "stable";
  });
  const [isHovering, setIsHovering] = useState(false);
  const STORAGE_KEY = "student_sidebar_mode";

  const stableCollapsed =
    typeof collapsed === "boolean" ? collapsed : internalCollapsed;

  const isCollapsed = mode === "hover" ? !isHovering : stableCollapsed;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }, [mode]);

  useEffect(() => {
    onCollapsedChange?.(isCollapsed);
  }, [isCollapsed, onCollapsedChange]);

  const toggleCollapsed = () => {
    if (mode === "hover") return;

    const next = !isCollapsed;

    if (typeof collapsed !== "boolean") {
      setInternalCollapsed(next);
    }

    onCollapsedChange?.(next);
  };

  return (
    <aside
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`
        h-screen
        ${isCollapsed ? "w-15" : "w-54"}
        bg-[#2c4c7c]
        text-white
        flex
        flex-col
        p-3
        shrink-0
        overflow-hidden
        transition-all
        duration-300
        ease-in-out
      `}
    >
      <div className="flex items-center justify-between mb-6">
        {!isCollapsed && (
          <h1 className="text-sm font-bold flex items-center gap-2 truncate">
            <span className="text-xl">U</span> UNIVERSITY
          </h1>
        )}

        <button
          onClick={toggleCollapsed}
          disabled={mode === "hover"}
          className="p-1 rounded-md hover:bg-white/20 transition"
          title={mode === "hover" ? "Disabled in hover mode" : isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {menu.map((item) => {
          const isActive =
            pathname === item.path || pathname.startsWith(item.path + "/");

          return (
            <div
              key={item.label}
              onClick={() => router.push(item.path)}
              className={`
                relative
                group
                flex
                items-center
                gap-3
                px-3
                py-2
                rounded-lg
                cursor-pointer
                transition
                ${isActive ? "bg-[#1f3b63]" : "hover:bg-[#1f3b63]/70"}
              `}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.75 bg-white rounded-r" />
              )}

              <item.icon size={18} className="shrink-0" />

              {!isCollapsed && <span className="text-sm truncate">{item.label}</span>}
            </div>
          );
        })}
      </nav>

      <div className="pt-2 border-t border-white/10">
        <button
          onClick={() => setMode((prev) => (prev === "stable" ? "hover" : "stable"))}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1f3b63]/70 transition"
          title={isCollapsed ? "Toggle sidebar mode" : undefined}
        >
          <Settings size={18} className="shrink-0" />
          {!isCollapsed && (
            <span className="text-xs font-semibold">Sidebar: {mode === "stable" ? "Stable" : "Hover"}</span>
          )}
        </button>
      </div>
    </aside>
  );
}
