"use client";

import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/auth.store";
import { useEffect, useRef, useState } from "react";
import NotificationDropdown from "../NotificationDropdown";

interface TopbarProps {
  title: string;
  showSearch?: boolean;
}

export default function Topbar({ title, showSearch = false }: TopbarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative h-12 bg-[#355d91] flex items-center justify-between px-4 md:px-6 text-white">
      {/* Left: Title */}
      <div className="flex items-center shrink-0 min-w-0">
        <h1 className="text-base md:text-lg font-semibold truncate max-w-full sm:max-w-md">
          {title}
        </h1>
      </div>

      {/* Center: Search */}
      {showSearch && (
        <div className="absolute left-1/2 -translate-x-1/2 hidden sm:block">
          <div className="search-shell-top">
            <div className="flex items-center h-full w-full">
              <span className="pl-4 pr-2 text-blue-200 text-sm">🔍</span>

              <input
                placeholder="Search students or teams..."
                className="search-input-clean flex-1 text-sm text-blue-50 placeholder-blue-200/70"
              />

              <button className="send-btn-top mr-2 text-blue-100">
                ▲
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right actions */}
      <div className="flex items-center gap-4 shrink-0 relative">
        {/* Notification */}
        <NotificationDropdown />

        {/* Avatar + Dropdown */}
        <div ref={dropdownRef} className="relative">
          <div
            onClick={() => setOpen((prev) => !prev)}
            className="cursor-pointer flex items-center gap-2"
          >
            <div className="h-8 w-8 rounded-full bg-white text-[#2c4c7c] flex items-center justify-center font-bold uppercase text-sm">
              {user?.name?.charAt(0) || "U"}
            </div>

            <span className="hidden sm:block">
              {user?.name || "User"}
            </span>
          </div>

          {open && (
            <div className="absolute right-0 mt-2 w-44 bg-white text-gray-700 rounded-lg shadow-lg overflow-hidden z-50">
              <DropdownItem
                icon={<User size={16} />}
                label="Profile"
                onClick={() => {
                  setOpen(false);
                  router.push("/StudentProfile");
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
        w-full flex items-center gap-3 px-4 py-2 text-sm text-left
        hover:bg-gray-100
        ${danger ? "text-red-600 hover:bg-red-50" : ""}
      `}
    >
      {icon}
      {label}
    </button>
  );
}
