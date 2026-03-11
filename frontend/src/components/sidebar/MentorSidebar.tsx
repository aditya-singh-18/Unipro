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
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

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

  return (
    <aside
      className={`
        h-screen
        sticky
        top-0
        ${collapsed ? "w-18" : "w-64"}
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
        {!collapsed && (
          <h1 className="text-sm font-bold flex items-center gap-2 truncate">
            <span className="text-xl">U</span> UNIVERSITY
          </h1>
        )}

        <button
          onClick={() => setCollapsed((v) => !v)}
          className="p-1 rounded-md hover:bg-white/20 transition"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
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
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && (
                <span className="text-sm truncate">{item.label}</span>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
