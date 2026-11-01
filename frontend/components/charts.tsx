"use client";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { Tx } from "./types";

const tip = {
  background: "var(--s3)",
  border: "1px solid var(--rule2)",
  borderRadius: 8,
  color: "var(--fg)",
  fontSize: 12,
};

// Daily counts: all transactions as the violet series, flagged ones as an amber line. No animation, no decoration.
export function ActivityChart({ rows }: { rows: Tx[] }) {
  const groups: Record<string, { date: string; transactions: number; flagged: number }> = {};
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
        <AreaChart data={data} margin={{ top: 12, right: 10, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8472ff" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#8472ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
          <XAxis dataKey="date" stroke="#8b92a8" tickLine={false} axisLine={false} fontSize={11} />
          <YAxis stroke="#8b92a8" tickLine={false} axisLine={false} fontSize={11} />
          <Tooltip contentStyle={tip} itemStyle={{ color: "#f5f6fa" }} isAnimationActive={false} cursor={{ stroke: "rgba(255,255,255,0.17)" }} />
          <Area type="monotone" dataKey="transactions" stroke="#b9afff" fill="url(#activity-fill)" strokeWidth={1.75} isAnimationActive={false} />
          <Area type="monotone" dataKey="flagged" stroke="#f3b84b" fill="transparent" strokeWidth={2} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
