"use client";
// In-page section navigation. Driven by the current path — renders the sub-tabs
// for whichever top-level section you're in, preserving the active querystring
// (so GlobalControls filters survive tab switches). Sections without sub-tabs
// (Overview, Site Audit) render nothing.
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Tab = { href: string; label: string };
type Section = { base: string; label: string; tabs: Tab[] };

// Order matters: longest base prefix wins, so list deeper bases is unnecessary —
// we resolve by "best (longest) matching base" below.
export const SECTIONS: Section[] = [
  {
    base: "/visibility", label: "Answer-Engine Visibility",
    tabs: [
      { href: "/visibility", label: "Overview" },
      { href: "/visibility/share-of-voice", label: "Share of Voice" },
      { href: "/visibility/sentiment", label: "Sentiment" },
      { href: "/visibility/engines", label: "Engines" },
    ],
  },
  {
    base: "/prompts", label: "Prompts",
    tabs: [
      { href: "/prompts", label: "Library" },
      { href: "/prompts/segments", label: "Segments" },
      { href: "/prompts/performance", label: "Performance" },
      { href: "/prompts/gaps", label: "Opportunities" },
      { href: "/prompts/intent", label: "By Intent" },
    ],
  },
  {
    base: "/citations", label: "Citation & Authority",
    tabs: [
      { href: "/citations", label: "Overview" },
      { href: "/citations/sources", label: "Sources" },
      { href: "/citations/gaps", label: "Gaps" },
      { href: "/citations/authority", label: "Brand Authority" },
    ],
  },
  {
    base: "/readiness", label: "AI Crawler Readiness",
    tabs: [
      { href: "/readiness", label: "Overview" },
      { href: "/readiness/crawlers", label: "Crawlers" },
      { href: "/readiness/schema", label: "Schema" },
      { href: "/readiness/llms-txt", label: "llms.txt" },
      { href: "/readiness/citability", label: "Citability" },
      { href: "/readiness/eeat", label: "E-E-A-T" },
      { href: "/readiness/issues", label: "Issues" },
    ],
  },
  {
    base: "/actions", label: "Activate & Act",
    tabs: [
      { href: "/actions", label: "Action Board" },
      { href: "/activate", label: "Activate" },
    ],
  },
  {
    base: "/activate", label: "Activate & Act",
    tabs: [
      { href: "/actions", label: "Action Board" },
      { href: "/activate", label: "Activate" },
    ],
  },
  {
    base: "/reports", label: "Reports",
    tabs: [
      { href: "/reports", label: "Reports" },
      { href: "/reports/alerts", label: "Alerts" },
    ],
  },
  {
    base: "/settings", label: "Settings",
    tabs: [
      { href: "/settings", label: "Project" },
      { href: "/settings/runs", label: "Runs" },
    ],
  },
];

function resolveSection(pathname: string): Section | null {
  let best: Section | null = null;
  for (const s of SECTIONS) {
    if (pathname === s.base || pathname.startsWith(s.base + "/")) {
      if (!best || s.base.length > best.base.length) best = s;
    }
  }
  return best;
}

export default function SectionTabs() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const qs = sp.toString();
  const section = resolveSection(pathname);
  if (!section) return null;

  const withQs = (h: string) => (qs ? `${h}?${qs}` : h);
  const isActive = (href: string) =>
    href === section.base ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="bg-white shrink-0" style={{ borderBottom: "1px solid #E6E6E6" }}>
      <div className="mx-auto max-w-[1400px] px-6 flex items-center gap-1 overflow-x-auto scroll -mb-px">
        {section.tabs.map((t) => {
          const on = isActive(t.href);
          return (
            <Link key={t.href} href={withQs(t.href)}
              className="relative whitespace-nowrap px-3 py-2.5 text-[13px] font-semibold transition-colors"
              style={{ color: on ? "#0056D6" : "#5C5C5C" }}>
              {t.label}
              <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full transition-opacity"
                style={{ background: "#0056D6", opacity: on ? 1 : 0 }} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
