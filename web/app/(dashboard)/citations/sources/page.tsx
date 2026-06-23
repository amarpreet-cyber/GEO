import { Quote, Globe, Layers, Hash } from "lucide-react";
import { getCitations, hasData } from "@/lib/data";
import { Card, Title, Section, PageHeader, NoData, ClassTag, StackBar, Legend, MeterBar } from "@/components/ui";
import { DrillStat } from "@/components/DrillStat";
import CitationsTable, { type CitationVM } from "@/components/CitationsTable";
import ExportButton from "@/components/ExportButton";
import { BRIEFS } from "@/lib/metricBriefs";
import type { DrillRow } from "@/lib/drill";

const CLASS_COLOR: Record<string, string> = { owned: "#10b981", earned: "#3b82f6", competitor: "#ef4444", social: "#5C5C5C" };
const ORDER = ["owned", "earned", "competitor", "social"];

export default function Sources() {
  if (!hasData()) return <NoData />;
  const raw = getCitations();
  const rows: CitationVM[] = raw.map((r) => ({ domain: r.domain, klass: r.class, citations: Number(r.citations) }));

  const classTotals: Record<string, number> = {};
  let total = 0;
  for (const r of rows) { classTotals[r.klass] = (classTotals[r.klass] || 0) + r.citations; total += r.citations; }
  const safeTotal = total || 1;
  const mix = ORDER.filter((k) => classTotals[k]).map((name) => ({ label: name, value: classTotals[name], color: CLASS_COLOR[name] }));
  const avgPerDomain = (total / (rows.length || 1));
  const I = "w-3.5 h-3.5";

  // level-3 rows — every domain sorted by citations descending, as external links
  const domainRows: DrillRow[] = rows
    .slice()
    .sort((a, b) => b.citations - a.citations)
    .slice(0, 50)
    .map((r) => ({
      label: r.domain,
      value: r.citations,
      tag: r.klass,
      tagColor: CLASS_COLOR[r.klass] || "#8A8A8A",
      href: `https://${r.domain}`,
      external: true,
    }));

  const classMixDonut = {
    kind: "donut" as const,
    unit: "citations",
    data: mix.map((m) => ({ name: m.label, value: m.value, color: m.color })),
  };

  return (
    <>
      <PageHeader
        title="Citation Sources"
        subtitle="Every domain the answer engine cited across all prompts, classified by type."
        right={<ExportButton rows={raw} filename="risa-geo-citations.csv" />}
      />

      <div className="space-y-6">

        {/* KPI tiles */}
        <div>
          <Section label="Source summary" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger mt-2">
            <DrillStat
              label="Total citations"
              brief="Total citation references across all tracked AI answers."
              icon={<Quote className={I} />}
              value={total}
              sub="total references"
              detail={{
                blurb: "Every citation reference recorded across all tracked AI answers.",
                chart: classMixDonut,
                rowsTitle: "All cited domains",
                rows: domainRows,
              }}
            />
            <DrillStat
              label="Domains"
              brief={BRIEFS.domains}
              icon={<Globe className={I} />}
              value={rows.length}
              accent="#3b82f6"
              sub="distinct sources cited"
              detail={{
                blurb: BRIEFS.domains,
                chart: classMixDonut,
                rowsTitle: "All cited domains",
                rows: domainRows,
              }}
            />
            <DrillStat
              label="Classes"
              brief="Number of distinct citation classes present (owned, earned, competitor, social)."
              icon={<Layers className={I} />}
              value={mix.length}
              accent="#5C5C5C"
              sub="owned / earned / competitor / social"
              detail={{
                blurb: "Citation classes present in the answer set: owned, earned, competitor, social.",
                chart: classMixDonut,
                rowsTitle: "All cited domains",
                rows: domainRows,
              }}
            />
            <DrillStat
              label="Avg per domain"
              brief="Average number of citation references per distinct domain."
              icon={<Hash className={I} />}
              value={avgPerDomain}
              decimals={1}
              accent="#0056D6"
              sub="citations per source"
              detail={{
                blurb: "Average citation count per distinct domain across the answer set.",
                chart: classMixDonut,
                rowsTitle: "All cited domains",
                rows: domainRows,
              }}
            />
          </div>
        </div>

        {/* Source mix */}
        <div>
          <Section label="Source mix" />
          <Card className="p-5 mt-2">
            <Title brief="Share of total citations by class. Owned and earned build authority; competitor and social are leakage signals.">
              Citation distribution by class
            </Title>
            <StackBar segments={mix} height={14} />
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {mix.map((m) => (
                <div key={m.label} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <ClassTag k={m.label} />
                    <span className="tnum text-sm font-semibold text-slate-700">{m.value}</span>
                  </div>
                  <MeterBar pct={(100 * m.value) / safeTotal} color={m.color} />
                  <span className="text-[11px] text-slate-400">{((100 * m.value) / safeTotal).toFixed(1)}% of total</span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3">
              <Legend items={mix.map((m) => ({ label: m.label, color: m.color, value: m.value }))} />
            </div>
          </Card>
        </div>

        {/* All domains table */}
        <div>
          <Section label="All cited domains" />
          <Card className="p-5 mt-2">
            <Title
              brief="Sort by any column. Owned and earned build RISA's authority; competitor and social show where rivals win."
              right={<span className="inline-flex items-center gap-2 text-[11px] text-slate-400"><ClassTag k="owned" /> is best</span>}
            >
              Domain registry
            </Title>
            <CitationsTable rows={rows} />
          </Card>
        </div>

      </div>
    </>
  );
}
