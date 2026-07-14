// RISA clinical design system — Lato font, gray palette, black buttons.
// Server-safe (no hooks). Motion in globals.css (.meter-fill / .stagger / .animate-*).
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight, Database, Hammer } from "lucide-react";
import { CountUp } from "@/components/CountUp";
import { InfoDot } from "@/components/Tooltip";

/* ---------------- surfaces ---------------- */
export function Card({
  children, className = "", lift = false, interactive = false,
}: { children: ReactNode; className?: string; lift?: boolean; interactive?: boolean }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 ${lift ? "lift shadow-sm hover:shadow-md" : "shadow-xs"} ${interactive ? "press cursor-pointer" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function Title({ children, hint, brief, right }: { children: ReactNode; hint?: string; brief?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-4 gap-3">
      <div>
        <h3 className="text-[13px] font-semibold text-slate-800 tracking-tight flex items-center gap-1.5">
          {children}{brief && <InfoDot brief={brief} />}
        </h3>
        {hint && <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

export function Section({ label, right }: { label: string; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mt-2 mb-1">
      <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{label}</h2>
      <div className="flex-1 h-px bg-slate-200" />
      {right}
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4 animate-fade">
      <div>
        <h1 className="text-xl font-semibold text-ink tracking-[-0.01em]">{title}</h1>
        {subtitle && <p className="text-[13px] text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

/* icon tile for module headers */
export function IconTile({ children, size = "md" }: { children: ReactNode; size?: "sm" | "md" }) {
  const s = size === "sm" ? "w-7 h-7" : "w-8 h-8";
  return (
    <span className={`${s} rounded-lg grid place-items-center shrink-0 bg-slate-100 text-slate-500`}>
      {children}
    </span>
  );
}

/* ---------------- sparkline + delta ---------------- */
export function Sparkline({ data, className = "", stroke = "var(--brand)" }: { data: number[]; className?: string; stroke?: string }) {
  if (!data || data.length < 2) return null;
  const w = 100, h = 26, min = Math.min(...data), max = Math.max(...data), rng = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / rng) * (h - 4) - 2}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={`w-full h-6 ${className}`}>
      <polygon points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill={stroke} fillOpacity={0.07} />
      <polyline points={pts.join(" ")} fill="none" stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Delta({ value, invert = false, suffix = "" }: { value?: number | null; invert?: boolean; suffix?: string }) {
  if (value == null || Math.abs(value) < 0.05) return <span className="text-[11px] text-slate-300 font-medium">—</span>;
  const up = value > 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tnum px-1.5 py-0.5 rounded ${good ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"}`}>
      <Icon className="w-3 h-3" />{Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

/* ---------------- Grafana stat block — borderless, used in divided rows ---------------- */
export function Stat({
  label, value, sub, icon, delta, deltaInvert, deltaSuffix = "", series, tone,
}: {
  label: string; value: ReactNode; sub?: string; icon?: ReactNode;
  delta?: number | null; deltaInvert?: boolean; deltaSuffix?: string; series?: number[]; tone?: "good" | "warn" | "bad";
}) {
  const c = tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-yellow-600" : tone === "bad" ? "text-red-500" : "text-ink";
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
        {icon && <span className="text-slate-400">{icon}</span>}{label}
      </div>
      <div className="flex items-end gap-2 mt-2">
        <div className={`text-[28px] leading-none font-bold tnum ${c}`}>{value}</div>
        {delta !== undefined && <span className="pb-0.5"><Delta value={delta} invert={deltaInvert} suffix={deltaSuffix} /></span>}
      </div>
      {series && series.length > 1 ? <Sparkline data={series} className="mt-2.5" /> : sub && <div className="text-[11px] text-slate-400 mt-1.5">{sub}</div>}
    </div>
  );
}
export const Kpi = Stat;

export function StatRow({ children }: { children: ReactNode }) {
  return <Card className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y lg:divide-y-0 divide-slate-200 overflow-hidden">{children}</Card>;
}

/* ---------------- standalone metric card ---------------- */
export function MetricCard({
  label, value, unit, icon, delta, deltaInvert, deltaSuffix = "", tone, accent, footer, hint,
}: {
  label: string; value: ReactNode; unit?: string; icon?: ReactNode;
  delta?: number | null; deltaInvert?: boolean; deltaSuffix?: string;
  tone?: "good" | "warn" | "bad"; accent?: string; footer?: ReactNode; hint?: string;
}) {
  const c = tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-yellow-600" : tone === "bad" ? "text-red-500" : "text-ink";
  return (
    <Card className="p-4 relative overflow-hidden">
      {accent && <span className="absolute inset-x-0 top-0 h-[2px]" style={{ background: accent }} />}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {icon && <span className="w-6 h-6 rounded grid place-items-center bg-slate-100 text-slate-500">{icon}</span>}
          {label}
        </div>
        {delta !== undefined && <Delta value={delta} invert={deltaInvert} suffix={deltaSuffix} />}
      </div>
      <div className="mt-3 flex items-end gap-1">
        <span className={`text-[30px] leading-none font-bold tnum ${c}`}>{value}</span>
        {unit && <span className="text-sm text-slate-400 pb-1">{unit}</span>}
      </div>
      {footer && <div className="mt-3">{footer}</div>}
      {hint && <div className="text-[11px] text-slate-400 mt-2">{hint}</div>}
    </Card>
  );
}

/* ---------------- StatCard — canonical metric tile ----------------
   Real value only (number in → CountUp animates it). `brief` attaches the "i"
   info button. Use this for every headline metric so numbers and explanations
   stay consistent across the dashboard. */
export function StatCard({
  label, brief, value, decimals = 0, prefix = "", suffix = "", unit, icon,
  delta, deltaInvert, deltaSuffix = "", tone, accent, footer, sub,
}: {
  label: string; brief?: string; value: number; decimals?: number; prefix?: string; suffix?: string;
  unit?: string; icon?: ReactNode; delta?: number | null; deltaInvert?: boolean; deltaSuffix?: string;
  tone?: "good" | "warn" | "bad"; accent?: string; footer?: ReactNode; sub?: string;
}) {
  const c = tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-yellow-600" : tone === "bad" ? "text-red-500" : "text-ink";
  return (
    <div className="ds-card ds-card-hover p-4 relative overflow-hidden">
      {accent && <span className="absolute inset-x-0 top-0 h-[2px]" style={{ background: accent }} />}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 min-w-0">
          {icon && <span className="w-6 h-6 rounded grid place-items-center bg-slate-100 text-slate-500 shrink-0">{icon}</span>}
          <span className="truncate">{label}</span>
          {brief && <InfoDot brief={brief} />}
        </div>
        {delta !== undefined && <Delta value={delta} invert={deltaInvert} suffix={deltaSuffix} />}
      </div>
      <div className="mt-3 flex items-end gap-1">
        <span className={`text-[30px] leading-none font-bold tnum ${c}`}>
          <CountUp value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
        </span>
        {unit && <span className="text-sm text-slate-400 pb-1">{unit}</span>}
      </div>
      {footer && <div className="mt-3">{footer}</div>}
      {sub && <div className="text-[11px] text-slate-400 mt-2">{sub}</div>}
    </div>
  );
}

/* thin bar — value vs max — animates fill */
export function MeterBar({ pct, color = "var(--brand)", track = "#E6E6E6", animate = true }: { pct: number; color?: string; track?: string; animate?: boolean }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: track }}>
      <div className={`h-full rounded-full ${animate ? "meter-fill" : ""}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

/* 100% stacked bar */
export function StackBar({ segments, height = 10 }: { segments: { label: string; value: number; color: string }[]; height?: number }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <div className="flex w-full rounded-full overflow-hidden meter-fill" style={{ height, background: "#E6E6E6" }}>
      {segments.filter((s) => s.value > 0).map((s) => (
        <div key={s.label} style={{ width: `${(100 * s.value) / total}%`, background: s.color }} title={`${s.label}: ${s.value}`} />
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; value?: ReactNode }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((e) => (
        <span key={e.label} className="flex items-center gap-1.5 text-[12px] text-slate-500">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: e.color }} />
          {e.label}{e.value != null && <span className="tnum text-slate-700 font-semibold ml-0.5">{e.value}</span>}
        </span>
      ))}
    </div>
  );
}

/* labelled progress row — animated fill */
export function ProgressRow({
  label, value, max = 100, suffix = "", color = "var(--brand)", labelWidth = "w-28",
}: { label: ReactNode; value: number; max?: number; suffix?: string; color?: string; labelWidth?: string }) {
  const pct = max ? (100 * value) / max : 0;
  return (
    <div className="flex items-center gap-3">
      <span className={`${labelWidth} shrink-0 text-[12px] text-slate-500 truncate`}>{label}</span>
      <div className="flex-1"><MeterBar pct={pct} color={color} /></div>
      <span className="w-12 text-right text-[12px] tnum text-slate-700 font-semibold">{value.toFixed(value < 10 ? 1 : 0)}{suffix}</span>
    </div>
  );
}

/* ---------------- ranked bar (share of voice / leaderboard) ---------------- */
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
// Shared row renderer so the static RankBar and the clickable BrandRankBar look identical.
export function rankRow(it: { name: string; value: number; isBrand?: boolean; meta?: string }, i: number, max: number, unit: string) {
  return (
    <div className={`flex items-center gap-3 rounded-lg px-2 py-1.5 transition press w-full ${it.isBrand ? "bg-brand-light border border-brand/20" : "hover:bg-slate-100"}`}>
      <span className="w-4 text-[11px] tnum text-slate-400 text-right">{i + 1}</span>
      <span className="w-7 h-7 rounded grid place-items-center text-[10px] font-semibold shrink-0"
        style={it.isBrand ? { background: "var(--brand)", color: "#fff" } : { background: "#E6E6E6", color: "#5C5C5C" }}>{initials(it.name)}</span>
      <div className="w-36 shrink-0 truncate text-left">
        <div className={`text-[13px] truncate ${it.isBrand ? "text-ink font-semibold" : "text-slate-700"}`}>{it.name}</div>
        {it.meta && <div className="text-[10px] text-slate-400 truncate">{it.meta}</div>}
      </div>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#E6E6E6" }}>
        <div className="h-2 rounded-full meter-fill" style={{ width: `${(100 * it.value) / max}%`, background: it.isBrand ? "var(--brand)" : "#D6D6D6" }} />
      </div>
      <span className={`w-14 text-right text-[13px] tnum ${it.isBrand ? "text-brand font-semibold" : "text-slate-700"}`}>{it.value.toFixed(1)}{unit}</span>
    </div>
  );
}
export function RankBar({ items, unit = "%" }: { items: { name: string; value: number; isBrand?: boolean; meta?: string }[]; unit?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-1">
      {items.map((it, i) => <div key={it.name}>{rankRow(it, i, max, unit)}</div>)}
      {items.length === 0 && <p className="text-[13px] text-slate-400 py-2">Nothing in view.</p>}
    </div>
  );
}

/* ---------------- badges / tags ---------------- */
// RISA status tag pattern: light-bg + saturated-text, 4px radius, 12px semibold
const BADGE: Record<string, string> = {
  brand:      "bg-[#EBF2FF] text-[#0056D6]",
  neutral:    "bg-slate-100 text-slate-500",
  success:    "bg-emerald-50 text-emerald-700",
  warn:       "bg-yellow-50 text-yellow-700",
  danger:     "bg-red-50 text-red-700",
  competitor: "bg-red-50 text-red-600",
};
export function Badge({ children, variant = "neutral", className = "" }: { children: ReactNode; variant?: keyof typeof BADGE; className?: string }) {
  return <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${BADGE[variant]} ${className}`}>{children}</span>;
}

const SENT_VARIANT: Record<string, keyof typeof BADGE> = { positive: "brand", neutral: "warn", negative: "danger", absent: "neutral" };
export function SentPill({ label }: { label: string }) {
  return <Badge variant={SENT_VARIANT[label] || "neutral"}>{label || "—"}</Badge>;
}

// owned = green (ours), earned = blue (authority), competitor = red (rival), social = gray (neutral)
const CLASS_BG: Record<string, string> = { owned: "#D1FAE5", earned: "#DBEAFE", competitor: "#FEE2E2", social: "#EEEEEE" };
const CLASS_FG: Record<string, string> = { owned: "#065F46", earned: "#1E40AF", competitor: "#B91C1C", social: "#5C5C5C" };
export function ClassTag({ k }: { k: string }) {
  return <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: CLASS_BG[k] || "#F5F5F5", color: CLASS_FG[k] || "#5C5C5C" }}>{k}</span>;
}

/* numeric score chip */
export function ScorePill({ value, suffix = "", thresholds = [40, 70] }: { value: number; suffix?: string; thresholds?: [number, number] }) {
  const [lo, hi] = thresholds;
  const cls = value >= hi ? "bg-emerald-50 text-emerald-700" : value >= lo ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-600";
  return <span className={`tnum text-[11px] font-semibold px-2 py-0.5 rounded ${cls}`}>{value}{suffix}</span>;
}

/* grade letter chip */
export function GradeChip({ grade }: { grade: string }) {
  // status scale only: green (good) → amber (ok) → red (poor). No orange/blue.
  const map: Record<string, string> = {
    A: "bg-emerald-100 text-emerald-700", B: "bg-green-100 text-green-700",
    C: "bg-yellow-100 text-yellow-700",     D: "bg-red-50 text-red-600",
    F: "bg-red-100 text-red-700",
  };
  return <span className={`inline-grid place-items-center w-7 h-7 rounded text-sm font-bold ${map[grade] || "bg-slate-100 text-slate-600"}`}>{grade}</span>;
}

/* severity dot for issues / alerts */
export function SevDot({ severity }: { severity: string }) {
  const c = severity === "error" ? "#ef4444" : severity === "warning" ? "#CA8A04" : "#8A8A8A";
  return <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: c }} />;
}

/* key/value pair — settings, detail panels */
export function KeyRow({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-200 last:border-0">
      <span className="text-[12px] text-slate-500">{k}</span>
      <span className="text-[13px] text-slate-700 font-semibold text-right truncate">{v}</span>
    </div>
  );
}

/* ---------------- empty states ---------------- */
export function EmptyState({ icon, title, hint, command }: { icon?: ReactNode; title: string; hint: string; command?: string }) {
  return (
    <Card className="py-14 px-6 text-center">
      <div className="w-11 h-11 rounded-lg bg-slate-100 text-slate-400 grid place-items-center mx-auto mb-3">{icon || <Hammer className="w-5 h-5" />}</div>
      <div className="text-[15px] font-bold text-ink">{title}</div>
      <p className="text-[13px] text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">{hint}</p>
      {command && <code className="inline-block mt-3 text-[12px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded font-mono">{command}</code>}
    </Card>
  );
}
export function Placeholder({ title, note, ship }: { title: string; note: string; ship?: string }) {
  return <EmptyState title={title} hint={note} command={ship} />;
}
export function NoData() {
  return <div className="p-10"><EmptyState icon={<Database className="w-5 h-5" />} title="No pipeline data yet" hint="Run the pipeline locally, then commit the snapshot and redeploy." command="npm run pipeline full" /></div>;
}

export { Link };
