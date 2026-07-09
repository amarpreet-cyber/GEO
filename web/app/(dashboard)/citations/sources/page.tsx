import { Quote, Globe, Layers, Hash, ExternalLink } from "lucide-react";
import { getCitations, getCitationUrls, hasData } from "@/lib/data";
import { Card, Title, Section, PageHeader, NoData, ClassTag, StackBar, Legend, MeterBar, Badge } from "@/components/ui";
import { DrillStat } from "@/components/DrillStat";
import CitationsTable, { type CitationVM } from "@/components/CitationsTable";
import ExportButton from "@/components/ExportButton";
import { BRIEFS } from "@/lib/metricBriefs";
import type { DrillRow } from "@/lib/drill";

const CLASS_COLOR: Record<string, string> = { owned: "#10b981", earned: "#3b82f6", competitor: "#ef4444", social: "#5C5C5C" };
const ORDER = ["owned", "earned", "competitor", "social"];

function urlTitle(url: string, title: string): string {
  if (title && title.length > 3 && title !== url) return title;
  try {
    const path = new URL(url).pathname.replace(/\/$/, "");
    const slug = path.split("/").pop() || "";
    return slug.replace(/[-_]/g, " ").replace(/\.\w+$/, "").trim() || url;
  } catch { return url; }
}

export default function Sources() {
  if (!hasData()) return <NoData />;
  const raw = getCitations();
  const urlRows = getCitationUrls();
  const rows: CitationVM[] = raw.map((r) => ({ domain: r.domain, klass: r.class, citations: Number(r.citations) }));

  const classTotals: Record<string, number> = {};
  let total = 0;
  for (const r of rows) { classTotals[r.klass] = (classTotals[r.klass] || 0) + r.citations; total += r.citations; }
  const safeTotal = total || 1;
  const mix = ORDER.filter((k) => classTotals[k]).map((name) => ({ label: name, value: classTotals[name], color: CLASS_COLOR[name] }));
  const avgPerDomain = (total / (rows.length || 1));
  const I = "w-3.5 h-3.5";

  const domainRows: DrillRow[] = rows
    .slice().sort((a, b) => b.citations - a.citations).slice(0, 50)
    .map((r) => ({
      label: r.domain, value: r.citations, tag: r.klass,
      tagColor: CLASS_COLOR[r.klass] || "#8A8A8A",
      href: `https://${r.domain}`, external: true,
    }));

  const classMixDonut = {
    kind: "donut" as const, unit: "citations",
    data: mix.map((m) => ({ name: m.label, value: m.value, color: m.color })),
  };

  // Group URL rows by domain for the URL table
  const byDomain: Record<string, typeof urlRows> = {};
  for (const r of urlRows) {
    if (!byDomain[r.domain]) byDomain[r.domain] = [];
    byDomain[r.domain].push(r);
  }

  // Top URLs — unique, sorted by domain citation count
  const topUrls = urlRows
    .filter((r, i, arr) => arr.findIndex((x) => x.url === r.url) === i) // dedupe
    .slice(0, 60);

  return (
    <>
      <PageHeader
        title="Citation Sources"
        subtitle="Every page the AI cited across all prompts — full URLs, classified by type."
        right={<ExportButton rows={raw} filename="risa-geo-citations.csv" />}
      />

      <div className="space-y-6">
        {/* KPI tiles */}
        <div>
          <Section label="Source summary" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger mt-2">
            <DrillStat label="Total citations" brief="Total citation references across all tracked AI answers."
              icon={<Quote className={I} />} value={total} sub="total references"
              detail={{ blurb: "Every citation reference recorded across all tracked AI answers.", chart: classMixDonut, rowsTitle: "All cited domains", rows: domainRows }} />
            <DrillStat label="Domains" brief={BRIEFS.domains} icon={<Globe className={I} />}
              value={rows.length} accent="#3b82f6" sub="distinct sources cited"
              detail={{ blurb: BRIEFS.domains, chart: classMixDonut, rowsTitle: "All cited domains", rows: domainRows }} />
            <DrillStat label="Unique pages" brief="Unique page URLs cited (not just domains)."
              icon={<Layers className={I} />} value={topUrls.length} accent="#5C5C5C" sub="individual web pages"
              detail={{ blurb: "Distinct page URLs cited by the AI.", chart: classMixDonut, rowsTitle: "All cited domains", rows: domainRows }} />
            <DrillStat label="Avg per domain" brief="Average number of citation references per distinct domain."
              icon={<Hash className={I} />} value={avgPerDomain} decimals={1} accent="#0056D6" sub="citations per source"
              detail={{ blurb: "Average citation count per distinct domain.", chart: classMixDonut, rowsTitle: "All cited domains", rows: domainRows }} />
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

        {/* Full URL table */}
        {topUrls.length > 0 && (
          <div>
            <Section label="Individual pages cited" right={<Badge variant="neutral">{topUrls.length} pages</Badge>} />
            <Card className="overflow-hidden mt-2">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-200">
                  <tr>
                    {["Page", "Domain", "Class", "Prompt context"].map((h) => (
                      <th key={h} className="text-left py-2.5 px-4 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topUrls.map((r, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors group">
                      <td className="py-2.5 px-4 max-w-xs">
                        <a href={r.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-start gap-1.5 text-[13px] text-blue-600 hover:text-blue-700 font-medium leading-snug">
                          <span className="line-clamp-2">{urlTitle(r.url, r.title)}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{r.url}</p>
                      </td>
                      <td className="py-2.5 px-4 text-[12px] text-slate-500 whitespace-nowrap">{r.domain}</td>
                      <td className="py-2.5 px-4">
                        <ClassTag k={r.class} />
                      </td>
                      <td className="py-2.5 px-4 max-w-xs">
                        {r.prompt && (
                          <p className="text-[12px] text-slate-500 line-clamp-1">{r.prompt}</p>
                        )}
                        {r.topic && (
                          <p className="text-[10px] text-slate-300 mt-0.5">{r.topic}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* All domains table */}
        <div>
          <Section label="All cited domains" />
          <Card className="p-5 mt-2">
            <Title
              brief="Sort by any column. Owned and earned build RISA's authority."
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
