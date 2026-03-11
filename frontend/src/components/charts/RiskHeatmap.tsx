"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface RiskHeatmapProps {
  items: Array<{
    project_id: string;
    title?: string | null;
    compliance_status: "critical" | "warning" | "healthy";
    predictive_warning_score?: number;
  }>;
  height?: number;
}

export default function RiskHeatmap({ items, height = 300 }: RiskHeatmapProps) {
  const data = useMemo(() => {
    // Group by risk level and count projects
    const grouped = {
      critical: items.filter(item => item.compliance_status === "critical").length,
      warning: items.filter(item => item.compliance_status === "warning").length,
      healthy: items.filter(item => item.compliance_status === "healthy").length,
    };

    return [
      { name: "Critical", value: grouped.critical, fill: "#dc2626" },
      { name: "Warning", value: grouped.warning, fill: "#f59e0b" },
      { name: "Healthy", value: grouped.healthy, fill: "#10b981" },
    ];
  }, [items]);

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip 
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
            }}
            formatter={(value) => [value, "Projects"]}
          />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
