import Link from "next/link";
import { GitCompareArrows, Swords, Building2, Target, Zap } from "lucide-react";
import { getCitations, hasData } from "@/lib/data";
import { citationGaps } from "@/lib/derive";
import { Card, Title, Section, PageHeader, NoData, Badge } from "@/components/ui";
import { DrillStat } from "@/components/DrillStat";
import ExportButton from "@/components/ExportButton";
import type { DrillRow } from "@/lib/drill";

const CLASS_COLOR: Record<string, string> = { owned: "#10b981", earned: "#3b82f6", competitor: "#ef4444", social: "#5C5C5C" };

type GapRow = { domain: string; kind: string; citations: number };

export default function CitationGaps() {
  if (!hasData()) return <NoData />;
  const cites = getCitations().map((r) => ({ domain: r.domain, class: r.class, citations: Number(r.citations) }));
  const gaps: GapRow[] = citationGaps(cites);
  const earned = gaps.filter((g) => g.kind === "earned-authority");
  const competitor = gaps.filter((g) => g.kind === "competitor-owned");
  const owned = cites.filter((c) => c.class === "owned").length;
  const maxE = Math.max(...earned.map((g) => g.citations), 1);
  const maxC = Math.max(...competitor.map((g) => g.citations), 1);
  const I = "w-3.5 h-3.5";

  // level-3 rows: earned-authority gaps as external links (blue)
  const earnedGapRows: DrillRow[] = earned.slice(0, 50).map((g) => ({
    label: g.domain,
    value: g.citations,
    tag: "earned-authority",
    tagColor: CLASS_COLOR.earned,
    href: `https://${g.domain}`,
    external: true,
  }));

  // level-3 rows: competitor-owned gaps as external links (red)
  const competitorGapRows: DrillRow[] = competitor.slice(0, 50).map((g) => ({
    label: g.domain,
    value: g.citations,
    tag: "competitor-owned",
    tagColor: CLASS_COLOR.competitor,
    href: `https://${g.domain}`,
    external: true,
  }));

  // combined all gaps rows
  const allGapRows: DrillRow[] = gaps.slice(0, 50).map((g) => ({
    label: g.domain,
    value: g.citations,
    tag: g.kind === "competitor-owned" ? "competitor" : "earned",
    tagColor: g.kind === "competitor-owned" ? CLASS_COLOR.competitor : CLASS_COLOR.earned,
    href: `https://${g.domain}`,
    external: true,
  }));

  // owned citation rows
  const ownedCiteRows: DrillRow[] = cites
    .filter((c) => c.class === "owned")
    .sort((a, b) => b.citations - a.citations)
    .slice(0, 50)
    .map((c) => ({
      label: c.domain,
      value: c.citations,
      tag: "owned",
      tagColor: CLASS_COLOR.owned,
      href: `https://${c.domain}`,
      external: true,
    }));

  return (
    <>
      <PageHeader
        title="Citation Gaps and Placement Targets"
        subtitle="Domains the engine already trusts where RISA is not yet the source. Earn a slot on these, deny rivals theirs."
        right={<ExportButton rows={gaps} filename="risa-geo-citation-gaps.csv" />}
      />

      <div className="space-y-6">

        {/* KPI tiles */}
        <div>
          <Section label="Gap summary" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger mt-2">
            <DrillStat
              label="Earned authorities"
              brief="Third-party sites already cited by AI that RISA could earn a mention on."
              icon={<Building2 className={I} />}
              value={earned.length}
              accent="#3b82f6"
              sub="sites to get cited on"
              detail={{
                blurb: "Earned-authority domains the engine cites. A guest post, study, or press mention here earns RISA the same trust signal.",
                chart: {
                  kind: "bar",
                  unit: "citations",
                  data: earned.slice(0, 12).map((g) => ({ name: g.domain, value: g.citations, color: CLASS_COLOR.earned })),
                },
                rowsTitle: "Earned-authority placement targets",
                rows: earnedGapRows,
              }}
            />
            <DrillStat
              label="Rival-owned cited"
              brief="Competitor-controlled domains the engine cites in place of RISA."
              icon={<Swords className={I} />}
              value={competitor.length}
              accent="#ef4444"
              tone="bad"
              sub="competitor domains winning"
              detail={{
                blurb: "Competitor-owned domains the engine currently cites instead of RISA. Matching their content authority is the displacement path.",
                chart: {
                  kind: "bar",
                  unit: "citations",
                  data: competitor.slice(0, 12).map((g) => ({ name: g.domain, value: g.citations, color: CLASS_COLOR.competitor })),
                },
                rowsTitle: "Competitor domains to displace",
                rows: competitorGapRows,
              }}
            />
            <DrillStat
              label="Owned domains cited"
              brief="RISA-controlled domains already cited by the engine."
              icon={<GitCompareArrows className={I} />}
              value={owned}
              accent="#10b981"
              sub="risalabs.ai references"
              detail={{
                blurb: "RISA-controlled domains the engine already cites. These are your strongest citation authority signals.",
                chart: {
                  kind: "bar",
                  unit: "citations",
                  data: ownedCiteRows.slice(0, 12).map((r) => ({ name: r.label, value: Number(r.value) || 0, color: CLASS_COLOR.owned })),
                },
                rowsTitle: "Owned citation domains",
                rows: ownedCiteRows,
              }}
            />
            <DrillStat
              label="Total targets"
              brief="Combined placement and displacement targets in this worklist."
              icon={<Target className={I} />}
              value={gaps.length}
              accent="#0056D6"
              sub="the full PR and placement list"
              detail={{
                blurb: "All citation gaps: earned-authority placement targets plus competitor-owned displacement targets.",
                chart: {
                  kind: "donut",
                  unit: "domains",
                  data: [
                    { name: "earned-authority", value: earned.length, color: CLASS_COLOR.earned },
                    { name: "competitor-owned", value: competitor.length, color: CLASS_COLOR.competitor },
                  ],
                },
                rowsTitle: "All gap domains",
                rows: allGapRows,
              }}
            />
          </div>
        </div>

        {/* Gap lists */}
        <div>
          <Section label="Where to act" />
          <div className="grid grid-cols-12 gap-5 mt-2 stagger">
            <Card className="col-span-12 lg:col-span-7 p-5">
              <Title brief="High-authority third-party domains the engine already cites. A guest post, study, or press mention here earns RISA the same trust signal.">
                Placement targets
              </Title>
              <p className="text-[12px] text-slate-400 -mt-2 mb-4">Earned-authority sites the engine trusts. Get cited here to inherit that trust.</p>
              <div className="space-y-1.5">
                {earned.slice(0, 14).map((g, i) => (
                  <div key={g.domain} className="flex items-center gap-3 press rounded-lg px-2 py-1.5 ds-card-hover">
                    <span className="w-4 text-[11px] tnum text-slate-400 text-right shrink-0">{i + 1}</span>
                    <span className="w-2 h-2 rounded-sm shrink-0 bg-[#3b82f6]" />
                    <span className="w-44 shrink-0 truncate text-sm text-slate-700">{g.domain}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full meter-fill" style={{ width: `${(100 * g.citations) / maxE}%`, background: "#3b82f6" }} />
                    </div>
                    <span className="w-12 text-right tnum text-xs text-slate-600">{g.citations} cites</span>
                  </div>
                ))}
                {earned.length === 0 && <p className="text-sm text-slate-400">No earned authorities cited yet.</p>}
              </div>
            </Card>

            <Card className="col-span-12 lg:col-span-5 p-5 flex flex-col">
              <Title brief="Competitor-owned domains the engine cites instead of RISA. Displacing these requires matching content authority.">
                Where rivals win citations
              </Title>
              <p className="text-[12px] text-slate-400 -mt-2 mb-4">Competitor domains currently taking share. Build equivalent content to challenge.</p>
              <div className="space-y-1.5">
                {competitor.slice(0, 12).map((g) => (
                  <div key={g.domain} className="flex items-center gap-3 press rounded-lg px-2 py-1.5 ds-card-hover">
                    <span className="w-2 h-2 rounded-sm shrink-0 bg-competitor" />
                    <span className="w-40 shrink-0 truncate text-sm text-slate-700">{g.domain}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full meter-fill bg-competitor" style={{ width: `${(100 * g.citations) / maxC}%` }} />
                    </div>
                    <span className="w-12 text-right tnum text-xs text-slate-600">{g.citations} cites</span>
                  </div>
                ))}
                {competitor.length === 0 && <p className="text-sm text-slate-400">No competitor-owned domains cited.</p>}
              </div>

              <div className="mt-auto pt-5 border-t border-slate-100">
                <Link
                  href="/activate"
                  className="press ring-brand flex items-center justify-center gap-2 text-sm font-medium text-white bg-brand hover:bg-brand-dark rounded-lg py-2.5 transition"
                >
                  <Zap className="w-4 h-4" /> Turn gaps into a placement push
                </Link>
                <p className="text-[11px] text-slate-400 mt-2 text-center">
                  Queues a content and PR task in Activate <Badge variant="neutral">stubbed</Badge>
                </p>
              </div>
            </Card>
          </div>
        </div>

      </div>
    </>
  );
}
