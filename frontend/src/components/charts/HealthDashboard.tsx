"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface HealthDashboardProps {
  summary: {
    total_projects: number;
    critical_projects: number;
    warning_projects: number;
    healthy_projects: number;
  };
  height?: number;
}

export default function HealthDashboard({ summary, height = 300 }: HealthDashboardProps) {
  const data = useMemo(() => {
    return [
      {
        name: "Healthy",
        value: summary.healthy_projects,
        fill: "#10b981",
        percentage: ((summary.healthy_projects / summary.total_projects) * 100).toFixed(1),
      },
      {
        name: "Warning",
        value: summary.warning_projects,
        fill: "#f59e0b",
        percentage: ((summary.warning_projects / summary.total_projects) * 100).toFixed(1),
      },
      {
        name: "Critical",
        value: summary.critical_projects,
        fill: "#dc2626",
        percentage: ((summary.critical_projects / summary.total_projects) * 100).toFixed(1),
      },
    ].filter(item => item.value > 0);
  }, [summary]);

  return (
    <div className="w-full flex flex-col items-center">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => value}
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      
      <div className="grid grid-cols-3 gap-4 mt-4 w-full">
        {data.map((item) => (
          <div key={item.name} className="text-center">
            <div
              className="h-2 rounded-full mb-2"
              style={{ backgroundColor: item.fill }}
            />
            <p className="text-sm font-semibold text-slate-900">{item.name}</p>
            <p className="text-lg font-bold text-slate-900">{item.value}</p>
            <p className="text-xs text-slate-600">{item.percentage}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
