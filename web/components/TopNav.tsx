"use client";
// RISA top navigation. Primary row = the user journey (See → Diagnose → Fix), 6 stops.
// Secondary utilities (Site Audit, Reports, Settings) sit as icons on the right so the
// main row stays calm. 46px, white, sliding blue underline on the active stage.
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Eye, List, Quote, ShieldCheck, Zap,
  ScanSearch, FileBarChart, Settings, type LucideIcon,
} from "lucide-react";
import { Tooltip } from "@/components/Tooltip";

type Tab = { href: string; label: string; icon: LucideIcon; match: string[] };

// Primary journey: See where you stand → diagnose (visibility / prompts / citations) → fix (readiness) → act.
const PRIMARY: Tab[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard, match: ["/"] },
  { href: "/visibility", label: "Visibility", icon: Eye, match: ["/visibility"] },
  { href: "/prompts", label: "Prompts", icon: List, match: ["/prompts"] },
  { href: "/citations", label: "Citations", icon: Quote, match: ["/citations"] },
  { href: "/readiness", label: "Readiness", icon: ShieldCheck, match: ["/readiness"] },
  { href: "/actions", label: "Act", icon: Zap, match: ["/actions", "/activate"] },
];
const UTILITY: Tab[] = [
  { href: "/site-audit", label: "Site Audit", icon: ScanSearch, match: ["/site-audit"] },
  { href: "/reports", label: "Reports", icon: FileBarChart, match: ["/reports"] },
  { href: "/settings", label: "Settings", icon: Settings, match: ["/settings"] },
];

export default function TopNav({ brand }: { brand: string; engines?: string[] }) {
  const path = usePathname();
  const sp = useSearchParams();
  const qs = sp.toString();
  const href = (h: string) => (qs ? `${h}?${qs}` : h);
  const active = (t: Tab) =>
    t.href === "/" ? path === "/" : t.match.some((m) => path === m || path.startsWith(m + "/"));

  return (
    <header className="h-[46px] shrink-0 bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
      <div className="flex h-full items-stretch px-4">
        {/* brand */}
        <Link href={href("/")} className="flex items-center gap-2 pr-5">
          <span className="flex h-7 items-center rounded-md px-2" style={{ background: "#1F1F1F" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/risa-logo-white.png" alt="RISA" className="h-3.5 w-auto" />
          </span>
          <span className="hidden sm:block text-[12px] font-semibold text-slate-500 tracking-tight">GEO</span>
        </Link>

        {/* primary journey tabs */}
        <nav className="flex items-stretch gap-0.5">
          {PRIMARY.map((t) => {
            const Icon = t.icon;
            const on = active(t);
            return (
              <Link key={t.href} href={href(t.href)}
                className={`relative flex items-center gap-1.5 px-3 text-[13px] font-semibold whitespace-nowrap transition-colors ${on ? "text-brand" : "text-slate-500 hover:text-ink"}`}>
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{t.label}</span>
                {on && <motion.span layoutId="topnav-underline" className="absolute inset-x-0 bottom-0 h-0.5 bg-brand" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
              </Link>
            );
          })}
        </nav>

        {/* right: utility icons + avatar */}
        <div className="ml-auto flex items-center gap-1 pl-4">
          {UTILITY.map((t) => {
            const Icon = t.icon;
            const on = active(t);
            return (
              <Tooltip key={t.href} label={t.label}>
                <Link href={href(t.href)}
                  className={`grid place-items-center w-8 h-8 rounded-lg transition-colors ${on ? "bg-brand-light text-brand" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"}`}>
                  <Icon className="h-[18px] w-[18px]" />
                </Link>
              </Tooltip>
            );
          })}
          <span className="ml-1.5 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white shrink-0" style={{ background: "#1F1F1F" }} title={brand}>AP</span>
        </div>
      </div>
    </header>
  );
}
