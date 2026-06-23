"use client";
// Recharts wrappers — RISA clinical palette. Grid/axes use the RISA gray scale.
// Bar and area charts animate on first paint (single pass). Pie/gauge stay static.
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  PieChart, Pie, Area, AreaChart, LabelList, RadialBarChart, RadialBar,
} from "recharts";

const GRID = "#E6E6E6";
const AXIS = "#5C5C5C";
const ANIM = 700;
const tick = { fontSize: 11, fill: AXIS, fontFamily: "var(--font-sans)" } as const;
const tip = {
  fontFamily: "var(--font-sans)", fontSize: 12, borderRadius: 8,
  border: "1px solid #E6E6E6", boxShadow: "0px 1px 2px 0px rgba(16,24,40,0.05)",
  padding: "8px 10px", color: "#1F1F1F",
} as const;
const labelStyle = { fontSize: 10, fill: AXIS, fontFamily: "var(--font-sans)" } as const;

/* ---------------- Donut with center readout ---------------- */
export function Donut({
  data, height = 240, total, totalLabel, unit = "", onSelect,
}: { data: { name: string; value: number; color: string }[]; height?: number; total?: number; totalLabel?: string; unit?: string; onSelect?: (name: string) => void }) {
  const sum = total ?? data.reduce((a, d) => a + d.value, 0);
  return (
    <div className="relative grid place-items-center animate-fade">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%"
            paddingAngle={data.length > 1 ? 2 : 0} stroke="none" isAnimationActive={false} cornerRadius={3}
            cursor={onSelect ? "pointer" : undefined}
            onClick={onSelect ? (_d, index) => onSelect(String(data[index]?.name ?? "")) : undefined}>
            {data.map((e, i) => <Cell key={i} fill={e.color} />)}
          </Pie>
          <Tooltip contentStyle={tip} formatter={(v: number, n: string) => [`${v}${unit}`, n]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute text-center pointer-events-none">
        <div className="text-[26px] font-bold text-ink tnum leading-none">{sum}{unit}</div>
        {totalLabel && <div className="text-[10px] uppercase tracking-wide text-slate-400 mt-1">{totalLabel}</div>}
      </div>
    </div>
  );
}

export function HBar({
  data, unit = "%", height = 300, highlightName,
}: { data: { name: string; value: number }[]; unit?: string; height?: number; highlightName?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 46 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
        <XAxis type="number" unit={unit} tick={tick} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: "#3D3D3D" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tip} formatter={(v: number) => `${(+v).toFixed(1)}${unit}`} cursor={{ fill: "#F5F5F5" }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive animationDuration={ANIM}>
          {data.map((e, i) => <Cell key={i} fill={e.name === highlightName ? "var(--brand)" : "#D6D6D6"} />)}
          <LabelList dataKey="value" position="right" formatter={(v: number) => `${(+v).toFixed(1)}${unit}`} style={labelStyle} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VBar({
  data, dataKey = "visibility", color = "var(--brand)", height = 240, unit = "", onSelect,
}: { data: Record<string, unknown>[]; dataKey?: string; color?: string; height?: number; unit?: string; onSelect?: (name: string) => void }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 14, right: 6, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="name" tick={tick} axisLine={{ stroke: GRID }} tickLine={false} interval={0} />
        <YAxis tick={tick} axisLine={false} tickLine={false} width={36} />
        <Tooltip contentStyle={tip} cursor={{ fill: "#F5F5F5" }} formatter={(v: number) => `${(+v).toFixed(1)}${unit}`} />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} barSize={30} isAnimationActive animationDuration={ANIM}
          cursor={onSelect ? "pointer" : undefined}
          onClick={onSelect ? (_d, index) => onSelect(String((data[index] as { name?: string })?.name ?? "")) : undefined}>
          <LabelList dataKey={dataKey} position="top" formatter={(v: number) => `${(+v).toFixed(0)}${unit}`} style={labelStyle} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* Grouped two-series bars */
export function GroupBar({
  data, keys, height = 240,
}: { data: Record<string, unknown>[]; keys: { key: string; color: string; label: string }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 6, left: -10 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="name" tick={tick} axisLine={{ stroke: GRID }} tickLine={false} interval={0} />
        <YAxis tick={tick} axisLine={false} tickLine={false} width={36} />
        <Tooltip contentStyle={tip} cursor={{ fill: "#F5F5F5" }} />
        {keys.map((k) => (
          <Bar key={k.key} dataKey={k.key} name={k.label} fill={k.color} radius={[3, 3, 0, 0]} barSize={16} isAnimationActive animationDuration={ANIM} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Trend({
  data, dataKey = "visibility_score", height = 70, color = "var(--brand)",
}: { data: Record<string, unknown>[]; dataKey?: string; height?: number; color?: string }) {
  if (!data || data.length < 2) return <p className="text-[11px] text-slate-400 text-center mt-2">Trend appears after the next run</p>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, bottom: 0, left: 0, right: 0 }}>
        <defs>
          <linearGradient id="trendfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area dataKey={dataKey} stroke={color} fill="url(#trendfill)" strokeWidth={2} dot={false} isAnimationActive animationDuration={ANIM} />
        <Tooltip contentStyle={tip} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* Half-circle score gauge */
export function Gauge({ value, height = 168 }: { value: number; height?: number }) {
  const v = Math.max(0, Math.min(100, value));
  const color = "#0056D6"; // data viz is blue-primary; the number conveys the level
  const data = [{ v }, { v: 100 - v }];
  return (
    <div className="relative grid place-items-center animate-fade">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="v" startAngle={215} endAngle={-35} innerRadius="66%" outerRadius="92%" stroke="none" isAnimationActive={false} cornerRadius={6}>
            <Cell fill={color} />
            <Cell fill="#E6E6E6" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute text-center -mt-2">
        <div className="text-[40px] font-bold text-ink tnum leading-none">{v.toFixed(1)}</div>
        <div className="text-[10px] uppercase tracking-wide text-slate-400 mt-1">out of 100</div>
      </div>
    </div>
  );
}

/* Radial multi-ring */
export function RadialRings({
  data, height = 200,
}: { data: { name: string; value: number; fill: string }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadialBarChart innerRadius="30%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
        <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "#E6E6E6" }} isAnimationActive={false} />
        <Tooltip contentStyle={tip} formatter={(v: number, _n, p: { payload?: { name?: string } }) => [`${Math.round(+v)}`, p?.payload?.name ?? ""]} />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}
