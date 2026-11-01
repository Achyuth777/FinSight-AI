"use client";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { Tx } from "./types";
const tip = {
  background: "var(--surface-3)",
  border: "1px solid var(--line-strong)",
  borderRadius: 8,
  color: "var(--text)",
};
export function ActivityChart({ rows }: { rows: Tx[] }) {
  const groups: Record<
    string,
    { date: string; transactions: number; flagged: number }
  > = {};
  rows.forEach((t) => {
    const date = t.timestamp.slice(5, 10);
    groups[date] ??= { date, transactions: 0, flagged: 0 };
    groups[date].transactions++;
    groups[date].flagged += Number(t.flagged);
  });
  const data = Object.values(groups);
  return (
    <div
      className="chart"
      role="img"
      aria-label={`Daily transaction counts: ${data.map((d) => `${d.date}: ${d.transactions}, flagged ${d.flagged}`).join("; ")}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 15, right: 10, left: -25, bottom: 0 }}
        >
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="var(--muted)"
            tickLine={false}
            axisLine={false}
            fontSize={11}
          />
          <YAxis
            stroke="var(--muted)"
            tickLine={false}
            axisLine={false}
            fontSize={11}
          />
          <Tooltip contentStyle={tip} />
          <Area
            type="monotone"
            dataKey="transactions"
            stroke="var(--muted)"
            fill="transparent"
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="flagged"
            stroke="var(--accent)"
            fill="transparent"
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
