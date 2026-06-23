"use client";
// Layered, clickable Site Audit dashboard.
// Server passes the full SiteAuditReport VM; everything below is progressive disclosure:
//   tabs → overview drill-down (dimension tile → filtered issues) → expandable issue rows.
import { useMemo, useState } from "react";
import {
  AlertTriangle, CheckCircle2, AlertCircle, Info, Zap, Award,
  ShieldCheck, Code2, BarChart3, ExternalLink, Clock, FileSearch,
  ChevronRight, ChevronDown, Wrench, ListChecks, FileText, LayoutGrid, ArrowUpRight,
} from "lucide-react";
import {
  Card, Title, Badge, GradeChip, MeterBar, ScorePill, Section,
} from "@/components/ui";
import { Gauge } from "@/components/charts";
import { Tabs, type TabDef } from "@/components/Tabs";
import { CountUp } from "@/components/CountUp";
import { InfoDot, TooltipProvider } from "@/components/Tooltip";
import { BRIEFS } from "@/lib/metricBriefs";
import type { SiteAuditReport, AuditIssue } from "@/lib/types";

/* ---------------- meta ---------------- */
type DimKey = "citability" | "brand" | "eeat" | "technical" | "schema" | "platform";

const DIM: Record<DimKey, { icon: React.ReactNode; category: string; brief: string }> = {
  citability: { icon: <FileSearch className="w-4 h-4" />, category: "AI Citability",            brief: BRIEFS.citability },
  brand:      { icon: <Award className="w-4 h-4" />,      category: "Brand Authority",          brief: BRIEFS.brand_authority },
  eeat:       { icon: <ShieldCheck className="w-4 h-4" />, category: "Content E-E-A-T",         brief: BRIEFS.eeat },
  technical:  { icon: <Code2 className="w-4 h-4" />,      category: "Technical GEO",            brief: "Technical signals that help AI crawlers access, parse and index the site reliably." },
  schema:     { icon: <Code2 className="w-4 h-4" />,      category: "Schema & Structured Data", brief: BRIEFS.schema },
  platform:   { icon: <BarChart3 className="w-4 h-4" />,  category: "Platform Optimization",    brief: "How well the site is optimized across AI answer platforms and search surfaces." },
};
const DIM_ORDER: DimKey[] = ["citability", "brand", "eeat", "technical", "schema", "platform"];

const SEV: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  critical: { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Critical", color: "#C62828" },
  high:     { icon: <AlertCircle className="w-3.5 h-3.5" />,   label: "High",     color: "#ef4444" },
  medium:   { icon: <Info className="w-3.5 h-3.5" />,          label: "Medium",   color: "#CA8A04" },
  low:      { icon: <CheckCircle2 className="w-3.5 h-3.5" />,  label: "Low",      color: "#8A8A8A" },
};
const SEV_ORDER = ["critical", "high", "medium", "low"] as const;

const scoreColor = (v: number) => (v >= 70 ? "#16a34a" : v >= 45 ? "#CA8A04" : "#ef4444");
const gradeFor = (s: number) => (s >= 90 ? "A" : s >= 75 ? "B" : s >= 60 ? "C" : s >= 40 ? "D" : "F");

type Tab = "overview" | "issues" | "pages" | "actions";

/* ---------------- small pieces ---------------- */
function StatChip({
  label, value, color, active, onClick,
}: { label: string; value: number; color: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`press ds-card-hover flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
        active ? "border-transparent" : "border-slate-200 hover:bg-slate-50"
      }`}
      style={active ? { background: color + "14", borderColor: color + "55" } : undefined}
    >
      <span className="text-[18px] font-bold tnum leading-none" style={{ color }}>
        <CountUp value={value} />
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
    </button>
  );
}

function DimensionTile({
  k, score, issues, onClick,
}: { k: DimKey; score: { score: number; weight: number; label: string }; issues: number; onClick: () => void; }) {
  const color = scoreColor(score.score);
  return (
    <button
      onClick={onClick}
      className="press ds-card ds-card-hover group text-left p-4 transition-all w-full"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg grid place-items-center bg-slate-100 text-slate-500">{DIM[k].icon}</span>
          <InfoDot brief={DIM[k].brief} />
        </div>
        <span className="text-[24px] font-bold tnum leading-none" style={{ color }}>
          <CountUp value={score.score} />
        </span>
      </div>
      <div className="mt-3 text-[13px] font-semibold text-slate-800 truncate">{score.label}</div>
      <div className="mt-2"><MeterBar pct={score.score} color={color} /></div>
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
        <span>weight x{(score.weight * 100).toFixed(0)}%</span>
        <span className="inline-flex items-center gap-0.5 text-slate-500 group-hover:text-[#0056D6] transition-colors">
          {issues} {issues === 1 ? "issue" : "issues"} <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </button>
  );
}

function IssueRow({ issue, open, onToggle }: { issue: AuditIssue; open: boolean; onToggle: () => void }) {
  const s = SEV[issue.severity] || SEV.low;
  return (
    <div className="border-b border-slate-200 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 py-3 px-4 hover:bg-slate-50 transition-colors text-left"
      >
        <span className="shrink-0" style={{ color: s.color }}>{s.icon}</span>
        <span className="flex-1 min-w-0 text-[13px] font-semibold text-slate-800 truncate">{issue.title}</span>
        <span className="hidden sm:inline text-[11px] font-semibold px-1.5 py-0.5 rounded shrink-0"
          style={{ background: s.color + "18", color: s.color }}>{issue.category}</span>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pl-11 animate-fade">
          <p className="text-[12px] text-slate-600 leading-relaxed">{issue.detail}</p>
          {issue.fix && (
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-[#EBF2FF] px-3 py-2">
              <Wrench className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#0056D6" }} />
              <p className="text-[12px] leading-relaxed" style={{ color: "#0056D6" }}>{issue.fix}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- main ---------------- */
export default function SiteAuditView({ audit }: { audit: SiteAuditReport }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [sevFilter, setSevFilter] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [openIssue, setOpenIssue] = useState<number | null>(null);

  const sevCount = useMemo(
    () => Object.fromEntries(SEV_ORDER.map((s) => [s, audit.issues.filter((i) => i.severity === s).length])),
    [audit.issues],
  );
  const issuesByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    for (const i of audit.issues) m[i.category] = (m[i.category] || 0) + 1;
    return m;
  }, [audit.issues]);

  const filteredIssues = useMemo(() => {
    const rank = (i: AuditIssue) => SEV_ORDER.indexOf(i.severity as typeof SEV_ORDER[number]);
    return audit.issues
      .map((issue, idx) => ({ issue, idx }))
      .filter(({ issue }) => (!sevFilter || issue.severity === sevFilter) && (!catFilter || issue.category === catFilter))
      .sort((a, b) => rank(a.issue) - rank(b.issue));
  }, [audit.issues, sevFilter, catFilter]);

  function drillToIssues(category: string) {
    setCatFilter(category);
    setSevFilter(null);
    setOpenIssue(null);
    setTab("issues");
  }
  function drillToSeverity(sev: string) {
    setSevFilter(sevFilter === sev ? null : sev);
    setCatFilter(null);
    setOpenIssue(null);
    setTab("issues");
  }

  const grade = audit.grade || gradeFor(audit.geo_score);
  const date = new Date(audit.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const TABS: TabDef[] = [
    { value: "overview", label: "Overview",    icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { value: "issues",   label: "Issues",      icon: <ListChecks className="w-3.5 h-3.5" />, count: audit.issues.length },
    { value: "pages",    label: "Pages",       icon: <FileText className="w-3.5 h-3.5" />,   count: audit.pages.length },
    { value: "actions",  label: "Action Plan", icon: <Zap className="w-3.5 h-3.5" />,        count: audit.quick_wins.length },
  ];

  return (
    <TooltipProvider>
      {/* header */}
      <div className="mb-5 flex items-start justify-between gap-4 animate-fade">
        <div>
          <h1 className="text-base font-bold text-ink tracking-tight">Site Audit — risalabs.ai</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Full GEO audit across AI citability, brand authority, E-E-A-T, technical, schema, and platform coverage.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <GradeChip grade={grade} />
          <a href={audit.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-slate-50"
            style={{ color: "#0056D6", borderColor: "#D6D6D6" }}>
            risalabs.ai <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* animated pill tab bar */}
      <Tabs
        tabs={TABS}
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        idPrefix="site-audit"
        className="mb-5"
      />

      {/* ---------------- OVERVIEW ---------------- */}
      {tab === "overview" && (
        <div className="space-y-5 animate-fade">
          <div className="grid grid-cols-12 gap-4">
            {/* composite score */}
            <Card className="col-span-12 md:col-span-4 p-5 flex flex-col items-center justify-center text-center">
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Composite GEO Score
                <InfoDot brief={BRIEFS.geo_score} />
              </div>
              <Gauge value={audit.geo_score} height={160} />
              <div className="mt-1 text-[32px] font-bold tnum text-ink leading-none">
                <CountUp value={audit.geo_score} decimals={1} />
              </div>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 flex-wrap justify-center">
                <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{date}</span>
                <span>{audit.pages_analyzed} pages</span>
                <span className="capitalize">{audit.business_type}</span>
              </div>
            </Card>

            {/* summary + severity */}
            <Card className="col-span-12 md:col-span-8 p-5 flex flex-col">
              <Title hint="Where risalabs.ai stands and how the work is distributed.">Summary</Title>
              <p className="text-[13px] text-slate-600 leading-relaxed">{audit.summary}</p>
              <div className="mt-auto pt-4">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                  Issues by severity
                  <InfoDot brief={BRIEFS.issues} side="right" />
                  <span className="text-slate-300 font-normal normal-case tracking-normal">click to inspect</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SEV_ORDER.map((s) => (
                    <StatChip key={s} label={SEV[s].label} value={sevCount[s] as number} color={SEV[s].color} onClick={() => drillToSeverity(s)} />
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* dimension tiles — drill-down */}
          <div>
            <Section label="Score breakdown" right={
              <span className="text-[11px] text-slate-400">click a dimension to see its issues</span>
            } />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 stagger mt-2">
              {DIM_ORDER.map((k) => (
                <DimensionTile key={k} k={k} score={audit.scores[k]} issues={issuesByCategory[DIM[k].category] || 0} onClick={() => drillToIssues(DIM[k].category)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- ISSUES ---------------- */}
      {tab === "issues" && (
        <div className="grid grid-cols-12 gap-4 animate-fade">
          {/* filters + mix */}
          <Card className="col-span-12 lg:col-span-4 p-5 h-fit">
            <Title hint="Filter the list. Click again to clear.">Filters</Title>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Severity</div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {SEV_ORDER.map((s) => (
                <StatChip key={s} label={SEV[s].label} value={sevCount[s] as number} color={SEV[s].color}
                  active={sevFilter === s} onClick={() => { setSevFilter(sevFilter === s ? null : s); setOpenIssue(null); }} />
              ))}
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Category</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(issuesByCategory).map(([cat, n]) => (
                <button key={cat} onClick={() => { setCatFilter(catFilter === cat ? null : cat); setOpenIssue(null); }}
                  className={`press text-[11px] font-semibold px-2 py-1 rounded transition-colors ${
                    catFilter === cat ? "bg-[#1F1F1F] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}>
                  {cat} <span className="tnum opacity-70">{n}</span>
                </button>
              ))}
            </div>
            {(sevFilter || catFilter) && (
              <button onClick={() => { setSevFilter(null); setCatFilter(null); }}
                className="press mt-4 text-[12px] font-semibold text-slate-500 hover:text-slate-700">Clear all filters</button>
            )}
          </Card>

          {/* list */}
          <Card className="col-span-12 lg:col-span-8 overflow-hidden h-fit">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <Title>
                {filteredIssues.length} {filteredIssues.length === 1 ? "issue" : "issues"}
                {(sevFilter || catFilter) && <span className="text-slate-400 font-normal"> (filtered)</span>}
              </Title>
              <button onClick={() => setOpenIssue(openIssue === -1 ? null : -1)}
                className="press text-[11px] font-semibold text-slate-500 hover:text-slate-700 -mt-4">
                {openIssue === -1 ? "Collapse all" : "Expand all"}
              </button>
            </div>
            <div>
              {filteredIssues.length === 0 ? (
                <p className="px-5 py-8 text-center text-[13px] text-slate-400">No issues match this filter.</p>
              ) : (
                filteredIssues.map(({ issue, idx }) => (
                  <IssueRow key={idx} issue={issue} open={openIssue === -1 || openIssue === idx}
                    onToggle={() => setOpenIssue(openIssue === idx ? null : idx)} />
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ---------------- PAGES ---------------- */}
      {tab === "pages" && (
        <Card className="overflow-hidden animate-fade">
          <div className="px-5 pt-5 pb-3">
            <Title hint={`${audit.pages_analyzed} pages crawled and analyzed, ranked by citability.`}>Pages analyzed</Title>
          </div>
          <div className="overflow-auto scroll">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-200" style={{ background: "#F5F5F5" }}>
                  <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-slate-500">Page</th>
                  <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-slate-500">Title</th>
                  <th className="text-right py-2.5 px-4 text-[11px] font-semibold text-slate-500">Citability</th>
                  <th className="text-right py-2.5 px-4 text-[11px] font-semibold text-slate-500">Issues</th>
                </tr>
              </thead>
              <tbody>
                {[...audit.pages].sort((a, b) => (b.citability_score ?? 0) - (a.citability_score ?? 0)).map((p, i) => (
                  <tr key={i} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 text-[12px] max-w-xs truncate" style={{ color: "#0056D6" }}>
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:underline inline-flex items-center gap-1 truncate max-w-[220px]">
                        {p.url.replace("https://risalabs.ai", "") || "/"}<ArrowUpRight className="w-3 h-3 shrink-0 opacity-60" />
                      </a>
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 truncate max-w-[220px]">{p.title || "—"}</td>
                    <td className="py-2.5 px-4 text-right"><ScorePill value={p.citability_score ?? 0} /></td>
                    <td className="py-2.5 px-4 text-right tnum">
                      {p.issues > 0 ? <Badge variant="danger">{p.issues}</Badge> : <Badge variant="success">0</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ---------------- ACTION PLAN ---------------- */}
      {tab === "actions" && (
        <div className="grid grid-cols-12 gap-4 animate-fade">
          <Card className="col-span-12 md:col-span-6 p-5">
            <Title brief="High-impact, low-effort changes that lift the GEO score fastest.">
              <span className="flex items-center gap-2"><Zap className="w-4 h-4" style={{ color: "#CA8A04" }} />Quick wins</span>
            </Title>
            <ol className="space-y-2.5">
              {audit.quick_wins.map((w, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded shrink-0 grid place-items-center text-[10px] font-bold mt-0.5 bg-brand-light text-brand">{i + 1}</span>
                  <span className="text-[13px] text-slate-700 leading-relaxed">{w}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="col-span-12 md:col-span-6 p-5">
            <Title brief="What risalabs.ai already does well for AI engine visibility.">
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" />Strengths</span>
            </Title>
            <ul className="space-y-2.5">
              {audit.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-[13px] text-slate-700 leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </TooltipProvider>
  );
}
