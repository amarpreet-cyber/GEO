"use client";
// Clickable metric tile = level 1 (macro). Click → Drawer with level 2 (breakdown
// chart) + level 3 (raw underlying rows, the "database" behind the number).
// Visual matches StatCard; when `detail` is present the card becomes explorable.
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, ExternalLink, Maximize2, ChevronRight } from "lucide-react";
import { CountUp } from "@/components/CountUp";
import { InfoDot } from "@/components/Tooltip";
import { Delta } from "@/components/ui";
import { Drawer } from "@/components/Drawer";
import { usePromptDrawer } from "@/components/PromptDrawerProvider";
import { HBar, Donut } from "@/components/charts";
import type { DrillDetail } from "@/lib/drill";

// Rows that point at a single prompt (/prompts/<id>) open the analysis IN-CONTEXT
// (layered drawer) instead of navigating away.
const PROMPT_RE = /^\/prompts\/(\d+)$/;

export function DrillStat({
  label, brief, value, decimals = 0, prefix = "", suffix = "", unit, icon,
  delta, deltaInvert, deltaSuffix = "", tone, accent, footer, sub, detail,
}: {
  label: string; brief?: string; value: number; decimals?: number; prefix?: string; suffix?: string;
  unit?: string; icon?: ReactNode; delta?: number | null; deltaInvert?: boolean; deltaSuffix?: string;
  tone?: "good" | "warn" | "bad"; accent?: string; footer?: ReactNode; sub?: string; detail?: DrillDetail;
}) {
  const [open, setOpen] = useState(false);
  const { open: openPrompt } = usePromptDrawer();
  const c = tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-yellow-600" : tone === "bad" ? "text-red-500" : "text-ink";
  // only explorable when there is real breakdown/rows behind it — never a dead-end drawer
  const clickable = !!detail && !!((detail.chart?.data?.length ?? 0) > 0 || (detail.rows?.length ?? 0) > 0);

  const body = (
    <>
      {accent && <span className="absolute inset-x-0 top-0 h-[2px]" style={{ background: accent }} />}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 min-w-0">
          {icon && <span className="w-6 h-6 rounded grid place-items-center bg-slate-100 text-slate-500 shrink-0">{icon}</span>}
          <span className="truncate">{label}</span>
          {brief && <InfoDot brief={brief} />}
        </div>
        {delta !== undefined ? <Delta value={delta} invert={deltaInvert} suffix={deltaSuffix} />
          : clickable ? <Maximize2 className="drill-cue w-3.5 h-3.5 text-slate-400 shrink-0" /> : null}
      </div>
      <div className="mt-3 flex items-end gap-1">
        <span className={`text-[30px] leading-none font-bold tnum ${c}`}>
          <CountUp value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
        </span>
        {unit && <span className="text-sm text-slate-400 pb-1">{unit}</span>}
      </div>
      {footer && <div className="mt-3">{footer}</div>}
      {sub && <div className="text-[11px] text-slate-400 mt-2">{sub}</div>}
      {clickable && (
        <div className="drill-cue mt-2 inline-flex items-center gap-0.5 text-[11px] font-semibold text-brand">
          explore <ChevronRight className="w-3 h-3" />
        </div>
      )}
    </>
  );

  if (!clickable) {
    return <div className="ds-card ds-card-hover p-4 relative overflow-hidden">{body}</div>;
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="drill press ds-card ds-card-hover p-4 relative overflow-hidden text-left w-full ring-brand">
        {body}
      </button>
      <Drawer open={open} onOpenChange={setOpen}
        title={<span className="inline-flex items-center gap-2">{label}</span>}
        subtitle={detail!.blurb}
        footer={detail!.href && (
          <Link href={detail!.href} onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline">
            {detail!.hrefLabel || "Open full view"} <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        )}>
        {/* headline value echoed in the drawer */}
        <div className="flex items-end gap-2 mb-4">
          <span className={`text-[34px] leading-none font-bold tnum ${c}`}>
            <CountUp value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
          </span>
          {unit && <span className="text-sm text-slate-400 pb-1">{unit}</span>}
        </div>

        {/* level 2 — breakdown chart */}
        {detail!.chart && detail!.chart.data.length > 0 && (
          <div className="mb-5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Breakdown</div>
            {detail!.chart.kind === "donut" ? (
              <Donut height={200}
                data={detail!.chart.data.map((d) => ({ name: d.name, value: d.value, color: d.color || "#0056D6" }))}
                unit={detail!.chart.unit || ""} />
            ) : (
              <HBar height={Math.max(140, detail!.chart.data.length * 34)} unit={detail!.chart.unit || ""}
                data={detail!.chart.data.map((d) => ({ name: d.name, value: d.value }))} />
            )}
          </div>
        )}

        {/* level 3 — the raw underlying rows */}
        {detail!.rows && detail!.rows.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
              {detail!.rowsTitle || "Underlying records"}
              <span className="ml-1.5 text-slate-300">({detail!.rows.length})</span>
            </div>
            <div className="rounded-lg border border-slate-200 divide-y divide-slate-200 overflow-hidden">
              {detail!.rows.map((r, i) => {
                const inner = (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-slate-700 truncate flex items-center gap-1.5">
                        {r.tag && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
                          style={{ background: (r.tagColor || "#8A8A8A") + "1A", color: r.tagColor || "#5C5C5C" }}>{r.tag}</span>}
                        <span className="truncate">{r.label}</span>
                      </div>
                      {r.sub && <div className="text-[11px] text-slate-400 truncate mt-0.5">{r.sub}</div>}
                    </div>
                    {r.value != null && <span className="text-[12px] tnum font-semibold text-slate-600 shrink-0">{r.value}</span>}
                    {r.href && (r.external
                      ? <ExternalLink className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      : <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />)}
                  </div>
                );
                const pm = r.href && !r.external ? r.href.match(PROMPT_RE) : null;
                if (pm) return <button key={i} onClick={() => openPrompt(Number(pm[1]))} className="block w-full text-left">{inner}</button>;
                if (r.href && r.external) return <a key={i} href={r.href} target="_blank" rel="noopener noreferrer" className="block">{inner}</a>;
                if (r.href) return <Link key={i} href={r.href} onClick={() => setOpen(false)} className="block">{inner}</Link>;
                return <div key={i}>{inner}</div>;
              })}
            </div>
          </div>
        )}

        {!detail!.chart && !detail!.rows && (
          <p className="text-[13px] text-slate-400">No further breakdown available for this metric.</p>
        )}
      </Drawer>
    </>
  );
}
