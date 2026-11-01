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
          <defs>
            <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            stroke="var(--accent)"
            fill="url(#area)"
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="flagged"
            stroke="var(--cyan)"
            fill="transparent"
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function RiskChart({ rows }: { rows: Tx[] }) {
  const data = [
    { name: "Below 80th", value: rows.filter((t) => t.risk_score < 80).length },
    {
      name: "80th–95th",
      value: rows.filter((t) => t.risk_score >= 80 && t.risk_score < 95).length,
    },
    {
      name: "95th and above",
      value: rows.filter((t) => t.risk_score >= 95).length,
    },
  ];
  const colors = ["var(--muted)", "var(--purple)", "var(--accent)"];
  return (
    <>
      <div
        className="donut"
        role="img"
        aria-label={data.map((d) => `${d.name}: ${d.value}`).join(", ")}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius="65%"
              outerRadius="88%"
              paddingAngle={4}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={colors[i]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tip} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-label">
          <strong>{rows.length.toLocaleString()}</strong>
          <span>transactions</span>
        </div>
      </div>
      <div className="legend-list">
        {data.map((d, i) => (
          <div key={d.name}>
            <span>
              <i style={{ background: colors[i] }} />
              {d.name}
            </span>
            <b>{d.value}</b>
          </div>
        ))}
      </div>
    </>
  );
}
