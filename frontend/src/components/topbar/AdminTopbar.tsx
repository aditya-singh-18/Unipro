"use client";

import { LogOut, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/store/auth.store";
import { useEffect, useRef, useState } from "react";
import NotificationDropdown from "../NotificationDropdown";

const sectionNameByPath: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/users": "User Management",
  "/admin/projects": "Project Oversight",
  "/admin/analytics": "Analytics",
  "/admin/departments": "Department Performance",
  "/admin/approvals": "Approvals",
  "/admin/settings": "System Settings",
  "/admin/profile": "Profile",
};

export default function AdminTopbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentSection =
    Object.entries(sectionNameByPath).find(([path]) =>
      pathname === path || pathname.startsWith(`${path}/`)
    )?.[1] ?? "Admin";

  // 🔒 Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () =>
      document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shadow-sm">
      {/* Left Section */}
      <div className="min-w-0 flex items-center gap-2">
        <h1 className="text-sm sm:text-base font-semibold text-slate-800 truncate max-w-[48vw] sm:max-w-none">
          {currentSection}
        </h1>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 sm:gap-4 relative min-w-0">
        <div className="shrink-0">
          <NotificationDropdown />
        </div>

        {/* 👤 Avatar + Dropdown */}
        <div ref={dropdownRef} className="relative">
          <div
            onClick={() => setOpen((prev) => !prev)}
            className="cursor-pointer flex items-center gap-2 sm:gap-3 hover:bg-slate-50 px-2 sm:px-3 py-2 rounded-xl transition-all duration-200 min-w-0"
          >
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center font-bold uppercase shadow-md">
              {user?.name?.charAt(0) || "A"}
            </div>

            <div className="hidden sm:block text-left min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate max-w-40">
                {user?.name || "Admin"}
              </div>
              <div className="text-xs text-slate-500">Administrator</div>
            </div>
          </div>

          {/* ⬇️ Dropdown */}
          {open && (
            <div
              className="
                absolute
                right-0
                mt-2
                w-52
                bg-white
                text-gray-700
                rounded-xl
                shadow-2xl
                border border-slate-200
                overflow-hidden
                z-50
                animate-in fade-in slide-in-from-top-2 duration-200
              "
            >
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.name || "Admin"}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email || user?.official_email || "admin@university.com"}</p>
              </div>

              <DropdownItem
                icon={<User size={16} />}
                label="Profile"
                onClick={() => {
                  setOpen(false);
                  router.push("/admin/profile");
                }}
              />

              <DropdownItem
                icon={<LogOut size={16} />}
                label="Logout"
                danger
                onClick={() => {
                  logout();
                  router.replace("/login");
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* 🔹 Dropdown Item */
function DropdownItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full
        flex
        items-center
        gap-3
        px-4
        py-3
        text-sm
        text-left
        transition-all
        duration-200
        ${
          danger
            ? "text-red-600 hover:bg-red-50"
            : "hover:bg-slate-50"
        }
      `}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}
