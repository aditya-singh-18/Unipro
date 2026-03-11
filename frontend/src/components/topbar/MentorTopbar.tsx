"use client";

import { LogOut, User } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/store/auth.store";
import { useEffect, useRef, useState } from "react";
import NotificationDropdown from "../NotificationDropdown";

interface MentorTopbarProps {
  title?: string;
}

export default function MentorTopbar({ title }: MentorTopbarProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Derive title from pathname if not provided
  const getPageTitle = () => {
    if (title) return title;
    
    if (pathname.includes('/projects')) return 'Assigned Projects';
    if (pathname.includes('/dashboard')) return 'Dashboard';
    if (pathname.includes('/students')) return 'Students & Teams';
    if (pathname.includes('/profile')) return 'Profile & Skills';
    if (pathname.includes('/analytics')) return 'Analytics';
    if (pathname.includes('/meetings')) return 'Meetings & Schedule';
    if (pathname.includes('/evaluation')) return 'Evaluation & Marks';
    if (pathname.includes('/exams')) return 'Exams';
    
    return 'Mentor Portal';
  };

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
    <div className="h-12 bg-[#355d91] flex items-center justify-between px-6 py-0 text-white border-b border-[#2c4c7c]">
      {/* Left: Page Title */}
      <div className="flex items-center shrink-0 min-w-0">
        <h1 className="text-base md:text-lg font-semibold truncate">
          {getPageTitle()}
        </h1>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-4 relative ml-auto">
        {/* 🔔 Notification */}
        <NotificationDropdown />

        {/* 👤 Avatar + Dropdown */}
        <div ref={dropdownRef} className="relative">
          <div
            onClick={() => setOpen((prev) => !prev)}
            className="cursor-pointer flex items-center gap-2"
          >
            <div className="h-8 w-8 rounded-full bg-white text-[#2c4c7c] flex items-center justify-center font-bold uppercase text-sm">
              {user?.name?.charAt(0) || "M"}
            </div>

            {/* ✅ REAL USER NAME */}
            <span className="hidden sm:block">
              {user?.name || "Mentor"}
            </span>
          </div>

          {/* ⬇️ Dropdown */}
          {open && (
            <div
              className="
                absolute
                right-0
                mt-2
                w-44
                bg-white
                text-gray-700
                rounded-lg
                shadow-lg
                overflow-hidden
                z-50
              "
            >
              <DropdownItem
                icon={<User size={16} />}
                label="Profile"
                onClick={() => {
                  setOpen(false);
                  router.push("/mentor/profile");
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
        py-2
        text-sm
        text-left
        hover:bg-gray-100
        ${
          danger
            ? "text-red-600 hover:bg-red-50"
            : ""
        }
      `}
    >
      {icon}
      {label}
    </button>
  );
}
