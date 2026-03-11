"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface GrowthRateChartProps {
  weekTrends: Array<{
    weekNumber: number;
    pending: number;
    submitted: number;
    approved: number;
    rejected: number;
  }>;
  height?: number;
  title?: string;
}

export default function GrowthRateChart({ weekTrends, height = 300, title = "Weekly Submission Trend" }: GrowthRateChartProps) {
  const data = useMemo(() => {
    return weekTrends.map((week) => {
      const total = week.pending + week.submitted + week.approved + week.rejected;
      const approvalRate = total > 0 ? ((week.approved / total) * 100).toFixed(1) : 0;

      return {
        week: `Week ${week.weekNumber}`,
        weekNumber: week.weekNumber,
        pending: week.pending,
        submitted: week.submitted,
        approved: week.approved,
        rejected: week.rejected,
        total: total,
        approvalRate: parseFloat(approvalRate as string),
      };
    });
  }, [weekTrends]);

  return (
    <div className="w-full">
      <p className="text-sm font-semibold text-slate-900 mb-3">{title}</p>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="week" stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
            }}
            formatter={(value) => {
              if (typeof value === "number") {
                return value.toFixed(1);
              }
              return value;
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="approvalRate"
            stroke="#10b981"
            name="Approval Rate %"
            strokeWidth={2}
            dot={{ fill: "#10b981", r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="submitted"
            stroke="#3b82f6"
            name="Submitted"
            strokeWidth={2}
            dot={{ fill: "#3b82f6", r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="approved"
            stroke="#059669"
            name="Approved"
            strokeWidth={2}
            dot={{ fill: "#059669", r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="rejected"
            stroke="#dc2626"
            name="Rejected"
            strokeWidth={2}
            dot={{ fill: "#dc2626", r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
