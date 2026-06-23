"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, Eye, List, Quote, ShieldCheck, Zap, FileBarChart,
  Settings, ScanSearch, type LucideIcon,
} from "lucide-react";

// Top-level sections only — sub-pages live in the in-page SectionTabs bar.
// This is the "limited buttons on first look" navigation: 9 destinations, not 28.
type Item = { href: string; label: string; hint: string; icon: LucideIcon; match: string[] };

const NAV: Item[] = [
  { href: "/", label: "Overview", hint: "The headline picture", icon: LayoutDashboard, match: ["/"] },
  { href: "/visibility", label: "Visibility", hint: "Answer-engine presence", icon: Eye, match: ["/visibility"] },
  { href: "/prompts", label: "Prompts", hint: "Library, wins & gaps", icon: List, match: ["/prompts"] },
  { href: "/citations", label: "Citations", hint: "What AI cites & authority", icon: Quote, match: ["/citations"] },
  { href: "/readiness", label: "Readiness", hint: "Crawlers, schema, E-E-A-T", icon: ShieldCheck, match: ["/readiness"] },
  { href: "/actions", label: "Activate", hint: "Turn gaps into work", icon: Zap, match: ["/actions", "/activate"] },
  { href: "/reports", label: "Reports", hint: "Exports & alerts", icon: FileBarChart, match: ["/reports"] },
  { href: "/site-audit", label: "Site Audit", hint: "Full risalabs.ai scan", icon: ScanSearch, match: ["/site-audit"] },
  { href: "/settings", label: "Settings", hint: "Project & runs", icon: Settings, match: ["/settings"] },
];

export default function Sidebar({ brand, engines, prompts }: { brand: string; engines: string[]; prompts: number }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const qs = sp.toString();
  const href = (h: string) => (qs ? `${h}?${qs}` : h);
  const active = (it: Item) =>
    it.href === "/" ? pathname === "/" : it.match.some((m) => pathname === m || pathname.startsWith(m + "/"));

  return (
    <aside className="w-60 shrink-0 flex flex-col h-screen sticky top-0 z-40 no-print" style={{ background: "#1F1F1F" }}>
      {/* brand header */}
      <div className="px-4 h-14 flex items-center gap-3" style={{ borderBottom: "1px solid #2E2E2E" }}>
        <div className="w-8 h-8 rounded-lg grid place-items-center text-white font-bold text-sm shrink-0" style={{ background: "#0056D6" }}>R</div>
        <div className="min-w-0">
          <div className="font-semibold text-white text-[13px] leading-tight">RISA GEO</div>
          <div className="text-[10px] truncate" style={{ color: "#8A8A8A" }}>Answer Engine Visibility</div>
        </div>
      </div>

      <nav className="flex-1 overflow-auto px-2.5 py-4 space-y-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#3D3D3D transparent" }}>
        {NAV.map((it) => {
          const Icon = it.icon;
          const on = active(it);
          return (
            <Link key={it.href} href={href(it.href)}
              className="group relative flex items-center gap-3 pl-3 pr-2 py-2.5 rounded-lg transition-colors"
              style={on ? { background: "#404040" } : undefined}
              onMouseEnter={(e) => { if (!on) (e.currentTarget as HTMLElement).style.background = "#2E2E2E"; }}
              onMouseLeave={(e) => { if (!on) (e.currentTarget as HTMLElement).style.background = ""; }}>
              {on && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: "#0056D6" }} />}
              <Icon className="w-[18px] h-[18px] shrink-0" style={{ color: on ? "#FFFFFF" : "#8A8A8A" }} />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold leading-tight" style={{ color: on ? "#FFFFFF" : "#D6D6D6" }}>{it.label}</div>
                <div className="text-[10px] truncate leading-tight mt-0.5" style={{ color: on ? "#A8A8A8" : "#6B6B6B" }}>{it.hint}</div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* run status footer */}
      <div className="p-3" style={{ borderTop: "1px solid #2E2E2E" }}>
        <div className="rounded-lg p-3 space-y-1.5" style={{ background: "#2E2E2E" }}>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-dot shrink-0" />
            <span className="text-[11px] font-semibold" style={{ color: "#D6D6D6" }}>Live data</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span style={{ color: "#8A8A8A" }}>Brand</span>
            <span className="font-semibold truncate ml-2" style={{ color: "#F5F5F5" }}>{brand}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span style={{ color: "#8A8A8A" }}>Engines</span>
            <span className="tnum truncate ml-2" style={{ color: "#D6D6D6" }}>{engines.join(", ") || "—"}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span style={{ color: "#8A8A8A" }}>Prompts</span>
            <span className="tnum" style={{ color: "#D6D6D6" }}>{prompts}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
