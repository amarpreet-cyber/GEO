import Link from "next/link";
import { Quote, ShieldCheck, Globe, Swords, ArrowRight } from "lucide-react";
import { getCitations, hasData } from "@/lib/data";
import { Card, Title, Section, PageHeader, NoData, StackBar, Legend, ProgressRow, MeterBar, Badge } from "@/components/ui";
import { Donut } from "@/components/charts";
import { DrillStat } from "@/components/DrillStat";
import CitationsTable, { type CitationVM } from "@/components/CitationsTable";
import { BRIEFS } from "@/lib/metricBriefs";
import type { DrillRow } from "@/lib/drill";

const CLASS_COLOR: Record<string, string> = { owned: "#10b981", earned: "#3b82f6", competitor: "#ef4444", social: "#5C5C5C" };
const ORDER = ["owned", "earned", "competitor", "social"];

export default function Citations() {
  if (!hasData()) return <NoData />;
  const rows: CitationVM[] = getCitations().map((r) => ({ domain: r.domain, klass: r.class, citations: Number(r.citations) }));

  const classTotals: Record<string, number> = {};
  let total = 0;
  for (const r of rows) { classTotals[r.klass] = (classTotals[r.klass] || 0) + r.citations; total += r.citations; }
  const safeTotal = total || 1;

  const mix = ORDER.filter((k) => classTotals[k]).map((name) => ({ name, value: classTotals[name], color: CLASS_COLOR[name] }));
  const mixSegs = mix.map((m) => ({ label: m.name, value: m.value, color: m.color }));
  const ownedEarned = ((classTotals.owned || 0) + (classTotals.earned || 0)) / safeTotal * 100;

  const topOwnedEarned = rows.filter((r) => r.klass === "owned" || r.klass === "earned").sort((a, b) => b.citations - a.citations).slice(0, 8);
  const topCompetitor = rows.filter((r) => r.klass === "competitor").sort((a, b) => b.citations - a.citations).slice(0, 8);
  const maxOE = Math.max(...topOwnedEarned.map((r) => r.citations), 1);
  const maxC = Math.max(...topCompetitor.map((r) => r.citations), 1);
  const I = "w-3.5 h-3.5";

  // level-3 rows per class — every domain as an external link
  const domainRow = (r: CitationVM): DrillRow => ({
    label: r.domain,
    value: r.citations,
    tag: r.klass,
    tagColor: CLASS_COLOR[r.klass] || "#8A8A8A",
    href: `https://${r.domain}`,
    external: true,
  });

  const allRows = rows.slice(0, 50).map(domainRow);
  const ownedRows = rows.filter((r) => r.klass === "owned").slice(0, 50).map(domainRow);
  const earnedRows = rows.filter((r) => r.klass === "earned").slice(0, 50).map(domainRow);
  const competitorRows = rows.filter((r) => r.klass === "competitor").slice(0, 50).map(domainRow);

  const classMixChart = { kind: "donut" as const, unit: "citations", data: mix };

  return (
    <>
      <PageHeader
        title="Citation & Authority"
        subtitle="What answer engines cite when they answer prompts about RISA"
        right={
          <div className="flex items-center gap-2">
            <Badge variant="neutral">{rows.length} domains</Badge>
            <Badge variant={ownedEarned >= 70 ? "success" : "warn"}>{ownedEarned.toFixed(0)}% credible</Badge>
          </div>
        }
      />

      <div className="space-y-6">

        {/* KPI tiles */}
        <div>
          <Section label="Citation footprint" />
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 stagger mt-2">
            <DrillStat
              label="Total citations"
              brief="Total citation references across all tracked AI answers."
              icon={<Quote className={I} />}
              value={total}
              accent="#0056D6"
              sub={`across ${rows.length} domains`}
              detail={{
                blurb: "All domains cited by the AI across every tracked prompt, by citation count.",
                chart: classMixChart,
                rowsTitle: "All cited domains",
                rows: allRows,
                href: "/citations/sources",
                hrefLabel: "Open full source list",
              }}
            />
            <DrillStat
              label="Cited authority"
              brief={BRIEFS.authority_pct}
              icon={<ShieldCheck className={I} />}
              value={ownedEarned}
              decimals={1}
              suffix="%"
              tone={ownedEarned >= 70 ? "good" : "warn"}
              accent="#10b981"
              footer={<MeterBar pct={ownedEarned} color={ownedEarned >= 70 ? "#10b981" : "#CA8A04"} />}
              detail={{
                blurb: BRIEFS.authority_pct,
                chart: classMixChart,
                rowsTitle: "Owned + earned domains",
                rows: [...ownedRows, ...earnedRows].slice(0, 50),
                href: "/citations/authority",
                hrefLabel: "Open Brand Authority",
              }}
            />
            <DrillStat
              label="Owned"
              brief={BRIEFS.owned}
              icon={<Globe className={I} />}
              value={classTotals.owned || 0}
              accent="#10b981"
              sub="risalabs.ai citations"
              detail={{
                blurb: BRIEFS.owned,
                chart: { kind: "donut", unit: "citations", data: mix },
                rowsTitle: "Owned domains",
                rows: ownedRows,
                href: "/citations/sources",
                hrefLabel: "Open Citation Sources",
              }}
            />
            <DrillStat
              label="Earned"
              brief={BRIEFS.earned}
              icon={<Globe className={I} />}
              value={classTotals.earned || 0}
              accent="#3b82f6"
              sub="third-party press and research"
              detail={{
                blurb: BRIEFS.earned,
                chart: { kind: "donut", unit: "citations", data: mix },
                rowsTitle: "Earned domains",
                rows: earnedRows,
                href: "/citations/authority",
                hrefLabel: "Open Brand Authority",
              }}
            />
            <DrillStat
              label="Competitor"
              brief={BRIEFS.competitor_cites}
              icon={<Swords className={I} />}
              value={classTotals.competitor || 0}
              accent="#ef4444"
              tone="bad"
              sub="rival-owned domains cited"
              detail={{
                blurb: BRIEFS.competitor_cites,
                chart: { kind: "donut", unit: "citations", data: mix },
                rowsTitle: "Competitor domains",
                rows: competitorRows,
                href: "/citations/gaps",
                hrefLabel: "Open Citation Gaps",
              }}
            />
          </div>
        </div>

        {/* Citation mix + top domains table */}
        <div>
          <Section label="Citation mix" />
          <div className="grid grid-cols-12 gap-5 mt-2">
            <Card className="col-span-12 lg:col-span-4 p-5 flex flex-col">
              <Title brief="Breakdown of citation volume by source class." right={<Badge variant="neutral">by count</Badge>}>
                Source breakdown
              </Title>
              <Donut data={mix} height={200} total={total} totalLabel="citations" />
              <div className="mt-4">
                <StackBar segments={mixSegs} height={10} />
              </div>
              <div className="mt-4 space-y-2">
                {mix.map((m) => (
                  <ProgressRow
                    key={m.name}
                    label={<span className="capitalize">{m.name}</span>}
                    value={(100 * m.value) / safeTotal}
                    suffix="%"
                    color={m.color}
                    labelWidth="w-20"
                  />
                ))}
              </div>
            </Card>

            <Card className="col-span-12 lg:col-span-8 p-5">
              <Title
                brief="Every domain the engine cited across all prompts, classified and sortable."
                right={
                  <Link href="/citations/sources" className="text-xs text-brand hover:underline inline-flex items-center gap-1">
                    full breakdown <ArrowRight className="w-3 h-3" />
                  </Link>
                }
              >
                All cited domains
              </Title>
              <CitationsTable rows={rows} />
            </Card>
          </div>
        </div>

        {/* Authority sources + competitor citations */}
        <div>
          <Section label="Authority vs rival exposure" />
          <div className="grid grid-cols-12 gap-5 mt-2">
            <Card className="col-span-12 lg:col-span-6 p-5">
              <Title
                brief="Owned and earned domains building RISA's citation authority in AI answers."
                right={
                  <Link href="/citations/authority" className="text-xs text-brand hover:underline inline-flex items-center gap-1">
                    brand authority <ArrowRight className="w-3 h-3" />
                  </Link>
                }
              >
                Your authority sources
              </Title>
              <div className="space-y-2.5">
                {topOwnedEarned.map((r) => (
                  <div key={r.domain} className="flex items-center gap-3 rounded-lg px-1 py-1 ds-card-hover">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: CLASS_COLOR[r.klass] }} />
                    <span className="w-44 shrink-0 truncate text-sm text-slate-700">{r.domain}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full meter-fill" style={{ width: `${(100 * r.citations) / maxOE}%`, background: CLASS_COLOR[r.klass] }} />
                    </div>
                    <span className="w-8 text-right tnum text-xs text-slate-600">{r.citations}</span>
                  </div>
                ))}
                {topOwnedEarned.length === 0 && <p className="text-sm text-slate-400">No owned or earned citations yet.</p>}
              </div>
              <div className="mt-4">
                <Legend items={[{ label: "owned", color: CLASS_COLOR.owned }, { label: "earned", color: CLASS_COLOR.earned }]} />
              </div>
            </Card>

            <Card className="col-span-12 lg:col-span-6 p-5">
              <Title
                brief="Rival-owned domains the engine cites instead of RISA."
                right={
                  <Link href="/citations/gaps" className="text-xs text-brand hover:underline inline-flex items-center gap-1">
                    gaps <ArrowRight className="w-3 h-3" />
                  </Link>
                }
              >
                Where competitors get cited
              </Title>
              <div className="space-y-2.5">
                {topCompetitor.map((r) => (
                  <div key={r.domain} className="flex items-center gap-3 rounded-lg px-1 py-1 ds-card-hover">
                    <span className="w-2 h-2 rounded-sm shrink-0 bg-competitor" />
                    <span className="w-44 shrink-0 truncate text-sm text-slate-700">{r.domain}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full meter-fill bg-competitor" style={{ width: `${(100 * r.citations) / maxC}%` }} />
                    </div>
                    <span className="w-8 text-right tnum text-xs text-slate-600">{r.citations}</span>
                  </div>
                ))}
                {topCompetitor.length === 0 && <p className="text-sm text-slate-400">No competitor-owned domains cited.</p>}
              </div>
            </Card>
          </div>
        </div>

      </div>
    </>
  );
}
