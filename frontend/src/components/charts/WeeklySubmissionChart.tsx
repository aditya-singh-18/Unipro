"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface WeeklySubmissionChartProps {
  weekTrends: Array<{
    weekNumber: number;
    pending: number;
    submitted: number;
    approved: number;
    rejected: number;
    missedOrLocked?: number;
  }>;
  height?: number;
}

export default function WeeklySubmissionChart({ weekTrends, height = 300 }: WeeklySubmissionChartProps) {
  const data = useMemo(() => {
    return weekTrends.slice(0, 12).map((week) => ({
      name: `W${week.weekNumber}`,
      pending: week.pending,
      submitted: week.submitted,
      approved: week.approved,
      rejected: week.rejected,
      missed: week.missedOrLocked || 0,
    }));
  }, [weekTrends]);

  const colors = {
    pending: "#64748b",
    submitted: "#3b82f6",
    approved: "#10b981",
    rejected: "#dc2626",
    missed: "#f59e0b",
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
            }}
          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          <Bar dataKey="pending" stackId="a" fill={colors.pending} name="Pending" />
          <Bar dataKey="submitted" stackId="a" fill={colors.submitted} name="Submitted" />
          <Bar dataKey="approved" stackId="a" fill={colors.approved} name="Approved" />
          <Bar dataKey="rejected" stackId="a" fill={colors.rejected} name="Rejected" />
          <Bar dataKey="missed" stackId="a" fill={colors.missed} name="Missed/Locked" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
