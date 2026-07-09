"use client";
// Contextual sub-tabs, one level below the primary nav.
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Tab = { href: string; label: string };
type Section = { base: string; tabs: Tab[] };

export const SECTIONS: Section[] = [
  {
    base: "/keywords",
    tabs: [
      { href: "/keywords",            label: "Overview" },
      { href: "/keywords/tracked",    label: "Tracked" },
      { href: "/keywords/discovered", label: "Discovered" },
    ],
  },
  {
    base: "/prompts",
    tabs: [
      { href: "/prompts",             label: "Library" },
      { href: "/prompts/performance", label: "Performance" },
      { href: "/prompts/gaps",        label: "Opportunities" },
      { href: "/prompts/intent",      label: "By Intent" },
      { href: "/prompts/segments",    label: "Segments" },
    ],
  },
  {
    base: "/competitors",
    tabs: [
      { href: "/competitors", label: "Overview" },
    ],
  },
  {
    // Readiness absorbs Citations and Site Audit — same question: "can AI find & trust RISA?"
    base: "/readiness",
    tabs: [
      { href: "/readiness",             label: "Overview" },
      { href: "/readiness/citability",  label: "Citability" },
      { href: "/readiness/crawlers",    label: "Crawlers" },
      { href: "/readiness/schema",      label: "Schema" },
      { href: "/readiness/llms-txt",    label: "llms.txt" },
      { href: "/readiness/eeat",        label: "E-E-A-T" },
      { href: "/readiness/issues",      label: "Issues" },
      { href: "/site-audit",            label: "Technical audit" },
    ],
  },
  {
    base: "/citations",
    tabs: [
      { href: "/citations",           label: "Overview" },
      { href: "/citations/sources",   label: "Sources" },
      { href: "/citations/gaps",      label: "Gaps" },
      { href: "/citations/authority", label: "Authority" },
    ],
  },
  {
    base: "/site-audit",
    tabs: [
      { href: "/readiness",  label: "← Back to Readiness" },
      { href: "/site-audit", label: "Technical audit" },
    ],
  },
  {
    base: "/reports",
    tabs: [
      { href: "/reports",        label: "Reports" },
      { href: "/reports/alerts", label: "Alerts" },
    ],
  },
  {
    base: "/settings",
    tabs: [
      { href: "/settings",       label: "Project" },
      { href: "/settings/runs",  label: "Runs" },
      { href: "/setup",          label: "Re-configure" },
    ],
  },
  {
    // Actions absorbs Activate — pick one name
    base: "/actions",
    tabs: [
      { href: "/actions",   label: "Action Board" },
      { href: "/activate",  label: "Batch operations" },
    ],
  },
  {
    base: "/activate",
    tabs: [
      { href: "/actions",  label: "Action Board" },
      { href: "/activate", label: "Batch operations" },
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
  const withQs = (h: string) => (qs ? `${h}?${qs}` : h);
  const section = resolveSection(pathname);
  if (!section) return null;

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
