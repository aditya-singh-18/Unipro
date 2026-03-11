"use client";

interface StatCardProps {
  title: string;
  value: string | number;
  bg: string; // e.g. "from-blue-400 to-blue-600"
  footer?: string; // e.g. "View", "Open", "Details"
  onClick?: () => void;
}

export default function StatCard({
  title,
  value,
  bg,
  footer = "View",
  onClick,
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        relative
        cursor-pointer
        rounded-2xl
        p-5
        h-[140px]
        flex
        flex-col
        text-white
        overflow-hidden
        bg-gradient-to-r ${bg}
        category-hover
        active:scale-[0.98]
      `}
    >
      {/* Soft overlay */}
      <div className="absolute inset-0 bg-white/10 pointer-events-none" />

      {/* Title */}
      <h3 className="relative z-10 text-sm font-medium tracking-wide opacity-90 truncate">
        {title}
      </h3>

      {/* Value */}
      <div className="relative z-10 text-3xl font-bold leading-tight truncate mt-1">
        {value}
      </div>

      {/* Footer (View Pill like Team page) */}
      <div className="relative z-10 mt-auto">
        <span
          className="
            inline-block
            px-4
            py-1.5
            rounded-full
            text-xs
            font-medium
            bg-white/25
            hover:bg-white/35
            transition
          "
        >
          {footer}
        </span>
      </div>
    </div>
  );
}
