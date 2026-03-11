"use client";

import Image from "next/image";

interface UserProfileCardProps {
  name: string;
  role: string;
  enrollmentId: string;
  avatarUrl?: string;
  isLeader?: boolean;
}

export default function UserProfileCard({
  name,
  role,
  enrollmentId,
  avatarUrl,
  isLeader = false,
}: UserProfileCardProps) {
  return (
    <div className="w-full max-w-sm rounded-2xl bg-white shadow-md hover:shadow-xl transition overflow-hidden">
      
      {/* Top Banner */}
      <div className="h-24 bg-gradient-to-r from-indigo-500 to-blue-500 relative">
        <div className="absolute left-1/2 -bottom-10 -translate-x-1/2">
          <div className="h-20 w-20 rounded-full border-4 border-white bg-slate-200 overflow-hidden">
            <Image
              src={avatarUrl || "/avatar-placeholder.png"}
              alt={name}
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="pt-14 pb-6 px-6 text-center">
        <h3 className="text-lg font-semibold text-slate-800">
          {name}
        </h3>

        <p className="text-sm text-slate-500">
          {role}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Enrollment: {enrollmentId}
        </p>

        {isLeader && (
          <span className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            Team Leader
          </span>
        )}

        {/* Actions */}
        <div className="mt-5 flex justify-center gap-3">
          <button className="rounded-full bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">
            View Profile
          </button>

          <button className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Message
          </button>
        </div>
      </div>
    </div>
  );
}
