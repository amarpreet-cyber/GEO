"use client";
// In-page pill toggle with a sliding active background (framer shared layoutId).
// Adopted from the RISA Outreach design system. Use for view toggles inside a page
// (e.g. Site Audit's Overview/Issues/Pages). Route-level nav uses SectionTabs instead.
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export type TabDef = { value: string; label: string; icon?: ReactNode; count?: number };

export function Tabs({
  tabs, value, onChange, idPrefix = "tabs", className,
}: { tabs: TabDef[]; value: string; onChange: (v: string) => void; idPrefix?: string; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-lg border border-slate-200 bg-white p-0.5", className)}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button key={t.value} onClick={() => onChange(t.value)}
            className={cn("relative rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors",
              active ? "text-white" : "text-slate-500 hover:text-slate-800")}>
            {active && (
              <motion.span layoutId={`${idPrefix}-active`} className="absolute inset-0 rounded-md bg-[#1F1F1F]"
                transition={{ type: "spring", stiffness: 380, damping: 32 }} />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {t.icon}{t.label}
              {t.count != null && (
                <span className={cn("tnum text-[10px] px-1.5 py-0.5 rounded-full",
                  active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500")}>{t.count}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
