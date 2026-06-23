import Link from "next/link";
import { CalendarClock, FileBarChart, ArrowRight, Bell } from "lucide-react";
import { loadFiltered } from "@/lib/page";
import { getScore, getSiteAudit, getCitations, getHistory, hasData } from "@/lib/data";
import { opportunities, gradeFor } from "@/lib/derive";
import {
  Card, Title, Section, PageHeader, NoData, GradeChip, ProgressRow,
  KeyRow, Badge, MeterBar,
} from "@/components/ui";
import PrintButton from "@/components/PrintButton";
import { DrillStat } from "@/components/DrillStat";
import { BRIEFS } from "@/lib/metricBriefs";
import type { DrillDetail, DrillRow } from "@/lib/drill";
import type { SP } from "@/lib/filters";

export default function Reports({ searchParams }: { searchParams: SP }) {
  if (!hasData()) return <NoData />;
  const { all, agg, brand, actionsByPrompt, summary } = loadFiltered(searchParams);
  const score = getScore();
  const site = getSiteAudit();
  const cites = getCitations();
  const history = getHistory();

  const geo = score?.geo_score ?? agg.visibility;
  const grade = score?.grade || gradeFor(geo);
  const opps = opportunities(all, actionsByPrompt).slice(0, 5);
  const brandSov = agg.sov.find((s) => s.isBrand)?.share || 0;
  const brandRank = agg.sov.findIndex((s) => s.isBrand) + 1;
  const issues = score?.issues || [];
  const errors = issues.filter((i) => i.severity === "error").length;
  const ownedEarned = cites
    .filter((c) => c.class === "owned" || c.class === "earned")
    .reduce((a, c) => a + Number(c.citations), 0);
  const totalCites = cites.reduce((a, c) => a + Number(c.citations), 0) || 1;
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const authPct = Math.round((ownedEarned / totalCites) * 100);

  // ── GEO Score detail: subscore bar + link to overview ───────────────────────
  const geoSubBar = score?.components
    ? score.components.map((c) => ({ name: c.label, value: +c.value.toFixed(1) }))
    : [
        { name: "Mention rate", value: +agg.mention_rate.toFixed(1) },
        { name: "Share of voice", value: +brandSov.toFixed(1) },
        { name: "Visibility", value: +agg.visibility.toFixed(1) },
      ];

  const geoDetail: DrillDetail = {
    blurb: BRIEFS.geo_score,
    chart: { kind: "bar", data: geoSubBar },
    rowsTitle: score?.components ? "Component scores" : "Sub-metrics",
    rows: (score?.components || []).map((c) => ({
      label: c.label,
      value: `${c.value.toFixed(1)}/100`,
      sub: c.measured === false ? "estimated" : "measured",
      tagColor: c.value >= 60 ? "#22c55e" : c.value >= 30 ? "#CA8A04" : "#ef4444",
    })),
    href: "/",
    hrefLabel: "Open Overview",
  };

  // ── Visibility detail: persona breakdown + top visible prompts ───────────────
  const idxOf = new Map(all.map((r, i) => [r.prompt, i]));
  const visPersonaBar = Object.entries(summary?.by_persona || {}).map(([k, v]) => ({
    name: k.toUpperCase(),
    value: +v.visibility_score.toFixed(1),
  }));
  const topVisibleRows: DrillRow[] = all
    .filter((r) => {
      const p = Number(r.brand_position);
      return p > 0;
    })
    .sort((a, b) => Number(a.brand_position) - Number(b.brand_position))
    .slice(0, 40)
    .map((r) => ({
      label: r.prompt,
      sub: `${r.persona?.toUpperCase() || ""} · pos #${r.brand_position}`,
      href: idxOf.has(r.prompt) ? `/prompts/${idxOf.get(r.prompt)}` : undefined,
      value: `#${r.brand_position}`,
    }));

  const visibilityDetail: DrillDetail = {
    blurb: BRIEFS.visibility,
    chart: visPersonaBar.length > 0 ? { kind: "bar", data: visPersonaBar } : undefined,
    rowsTitle: "Top visible prompts",
    rows: topVisibleRows,
    href: "/visibility",
    hrefLabel: "Open Visibility",
  };

  // ── Citation authority detail: donut by class + domain rows ─────────────────
  const CLASS_COLOR: Record<string, string> = {
    owned: "#10b981", earned: "#3b82f6", competitor: "#ef4444", social: "#5C5C5C",
  };
  const classCounts: Record<string, number> = {};
  cites.forEach((c) => { classCounts[c.class] = (classCounts[c.class] || 0) + Number(c.citations); });
  const citeDonut = ["owned", "earned", "competitor", "social"]
    .filter((k) => (classCounts[k] || 0) > 0)
    .map((k) => ({ name: k, value: classCounts[k], color: CLASS_COLOR[k] }));
  const citeRows: DrillRow[] = cites
    .sort((a, b) => Number(b.citations) - Number(a.citations))
    .slice(0, 40)
    .map((c) => ({
      label: c.domain,
      sub: c.class,
      value: String(c.citations),
      href: `https://${c.domain}`,
      external: true,
      tagColor: CLASS_COLOR[c.class] || "#8A8A8A",
      tag: c.class,
    }));

  const authDetail: DrillDetail = {
    blurb: BRIEFS.authority_pct,
    chart: { kind: "donut", data: citeDonut },
    rowsTitle: "Citation sources",
    rows: citeRows,
    href: "/citations",
    hrefLabel: "Open Citations",
  };

  // ── Open issues detail: severity donut + rows linking to /readiness/issues ──
  const severityCounts: Record<string, number> = { error: 0, warning: 0, notice: 0 };
  issues.forEach((i) => { severityCounts[i.severity] = (severityCounts[i.severity] || 0) + 1; });
  const severityColors: Record<string, string> = { error: "#ef4444", warning: "#CA8A04", notice: "#3b82f6" };
  const issueDonut = Object.entries(severityCounts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k, value: v, color: severityColors[k] }));
  const issueRows: DrillRow[] = issues.slice(0, 40).map((iss) => ({
    label: iss.title || iss.fix || "Issue",
    sub: iss.module || undefined,
    tag: iss.severity,
    tagColor: severityColors[iss.severity] || "#8A8A8A",
    href: "/readiness/issues",
  }));

  const issuesDetail: DrillDetail = {
    blurb: BRIEFS.issues,
    chart: issueDonut.length > 0 ? { kind: "donut", data: issueDonut } : undefined,
    rowsTitle: "Open issues",
    rows: issueRows,
    href: "/readiness/issues",
    hrefLabel: "Open Issues",
  };

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Client-ready GEO snapshot. Print to PDF or schedule recurring runs."
        right={
          <div className="flex items-center gap-2">
            <Link
              href="/reports/alerts"
              className="no-print inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg transition press"
            >
              <Bell className="w-3.5 h-3.5" /> Alerts
            </Link>
            <PrintButton />
          </div>
        }
      />

      <div className="space-y-6">
        {/* Headline metrics (screen only) — DrillStat replaces StatCard; print renders as static card */}
        <div className="no-print">
          <Section label="Snapshot metrics" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger mt-2">
            <DrillStat
              label="GEO score"
              brief={BRIEFS.geo_score}
              value={geo}
              decimals={1}
              unit="/100"
              tone={geo >= 60 ? "good" : geo >= 35 ? "warn" : "bad"}
              footer={<MeterBar pct={geo} color={geo >= 60 ? "#22c55e" : geo >= 35 ? "#CA8A04" : "#ef4444"} />}
              detail={geoDetail}
            />
            <DrillStat
              label="Visibility"
              brief={BRIEFS.visibility}
              value={agg.visibility}
              decimals={1}
              unit="/100"
              tone={agg.visibility >= 40 ? "good" : agg.visibility >= 15 ? "warn" : "bad"}
              footer={<MeterBar pct={agg.visibility} color="#3b82f6" />}
              detail={visibilityDetail}
            />
            <DrillStat
              label="Citation authority"
              brief={BRIEFS.authority_pct}
              value={authPct}
              suffix="%"
              tone={authPct >= 50 ? "good" : authPct >= 25 ? "warn" : "bad"}
              footer={<MeterBar pct={authPct} color="#10b981" />}
              detail={authDetail}
            />
            <DrillStat
              label="Open issues"
              brief={BRIEFS.issues}
              value={issues.length}
              tone={errors > 0 ? "bad" : issues.length > 0 ? "warn" : "good"}
              sub={errors > 0 ? `${errors} error${errors > 1 ? "s" : ""}` : "no errors"}
              detail={issuesDetail}
            />
          </div>
        </div>

        {/* Main grid: schedule + report card */}
        <div className="grid grid-cols-12 gap-5">
          {/* schedule + contents (screen only) */}
          <div className="col-span-12 lg:col-span-4 space-y-4 no-print">
            <Card className="p-5">
              <Title hint="Nightly or weekly, appended to history for trends.">
                <span className="inline-flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-brand" /> Schedule
                </span>
              </Title>
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0 bg-brand-light text-brand">
                  <CalendarClock className="w-4.5 h-4.5" />
                </span>
                <div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Run the full pipeline on a cron. Each run snapshots to history and powers the trend and compare-to-previous.
                  </p>
                  <code className="inline-block mt-2 text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-1 rounded">
                    0 6 * * 1 python run.py full
                  </code>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <Title hint="Sections included in the printed report.">Contents</Title>
              <div className="space-y-1.5">
                {[
                  "Composite GEO score + grade",
                  "Visibility and share of voice",
                  "Top opportunities",
                  "Citation authority",
                  "Supply-side readiness",
                  "Open issues",
                ].map((x) => (
                  <div key={x} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                    {x}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-1">
                <div className="text-[11px] text-slate-400">
                  {history.length} run{history.length !== 1 ? "s" : ""} in history
                </div>
                <Link
                  href="/settings/runs"
                  className="text-[11px] text-brand hover:underline inline-flex items-center gap-1"
                >
                  View run history <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </Card>
          </div>

          {/* report card */}
          <Card className="col-span-12 lg:col-span-8 p-8 print-block">
            {/* header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-5 mb-5">
              <div>
                <div className="flex items-center gap-2 text-brand font-semibold">
                  <FileBarChart className="w-4 h-4" /> RISA GEO
                </div>
                <h2 className="text-2xl font-bold text-ink tracking-tight mt-2">
                  Answer-Engine Visibility Report
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {brand} · {today} · {summary?.generated_engines?.join(", ") || "claude"}
                </p>
              </div>
              <div className="text-center shrink-0">
                <GradeChip grade={grade} />
                <div className="text-[32px] font-bold tnum text-ink leading-none mt-2">
                  {geo.toFixed(1)}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">GEO score</div>
              </div>
            </div>

            {/* 4-metric grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { k: "Visibility", v: agg.visibility.toFixed(1), u: "/100" },
                { k: "Mention rate", v: agg.mention_rate.toFixed(1), u: "%" },
                { k: "Share of voice", v: brandSov.toFixed(1), u: "%" },
                { k: "Rank", v: brandRank > 0 ? `#${brandRank}` : "—", u: `/${agg.sov.length}` },
              ].map((m) => (
                <div key={m.k} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">{m.k}</div>
                  <div className="text-xl font-semibold tnum text-ink mt-1">
                    {m.v}
                    <span className="text-xs text-slate-300">{m.u}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* composite breakdown */}
            {score?.components && (
              <div className="mb-6">
                <h3 className="text-[13px] font-semibold text-ink mb-2">Composite breakdown</h3>
                <div className="space-y-1.5">
                  {score.components.map((c) => (
                    <ProgressRow
                      key={c.key}
                      label={
                        <span>
                          {c.label}
                          {!c.measured && (
                            <span className="text-slate-300"> ~est</span>
                          )}
                        </span>
                      }
                      value={c.value}
                      labelWidth="w-36"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* opportunities + health */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-[13px] font-semibold text-ink mb-2">Top opportunities</h3>
                <ol className="text-sm text-slate-600 space-y-1.5 list-decimal pl-4">
                  {opps.map((o, i) => (
                    <li key={i} className="leading-snug">
                      {o.prompt}
                      <span className="text-[11px] text-slate-400"> · {o.persona.toUpperCase()}</span>
                    </li>
                  ))}
                  {opps.length === 0 && (
                    <li className="list-none text-slate-400">
                      RISA appears on every tracked prompt.
                    </li>
                  )}
                </ol>
              </div>
              <div>
                <h3 className="text-[13px] font-semibold text-ink mb-2">Health</h3>
                <KeyRow
                  k="Citation authority"
                  v={`${authPct}% owned+earned`}
                />
                <KeyRow
                  k="Site readiness"
                  v={`${site?.readiness_score ?? "—"}/100`}
                />
                <KeyRow
                  k="Crawler access"
                  v={site ? `${site.crawler.tier1_allowed} tier-1` : "—"}
                />
                <KeyRow
                  k="Open issues"
                  v={
                    <span>
                      {issues.length}{" "}
                      {errors > 0 && (
                        <Badge variant="danger">{errors} error{errors > 1 ? "s" : ""}</Badge>
                      )}
                    </span>
                  }
                />
                <KeyRow k="Runs tracked" v={history.length} />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 border-t border-slate-200 pt-4">
              Generated by the RISA GEO pipeline. Methodology: rank-weighted visibility, brand-filtered share of voice, classified citations, and a six-factor composite (citability, authority, E-E-A-T, technical, schema, platform).
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
