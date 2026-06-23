import { PieChart, Trophy, AtSign } from "lucide-react";
import { loadFiltered } from "@/lib/page";
import { hasData } from "@/lib/data";
import { Card, Title, Section, PageHeader, NoData, MeterBar, Badge } from "@/components/ui";
import BrandRankBar from "@/components/BrandRankBar";
import { DrillStat } from "@/components/DrillStat";
import { BRIEFS } from "@/lib/metricBriefs";
import type { DrillRow } from "@/lib/drill";
import type { SP } from "@/lib/filters";

const I = "w-3.5 h-3.5";

export default function ShareOfVoice({ searchParams }: { searchParams: SP }) {
  if (!hasData()) return <NoData />;
  const { agg } = loadFiltered(searchParams);

  const sov = agg.sov.slice(0, 16).map((s) => ({
    name: s.name, value: +s.share.toFixed(1), isBrand: s.isBrand, meta: `${s.count} mentions`,
  }));
  const board = agg.comp.slice(0, 16).map((c) => ({
    name: c.competitor, value: +c.presence_rate.toFixed(1), meta: c.side || undefined,
  }));

  const brandEntry = agg.sov.find((s) => s.isBrand);
  const brandRank = agg.sov.findIndex((s) => s.isBrand) + 1;
  const brandSov = brandEntry?.share || 0;
  const competitorCount = agg.sov.filter((s) => !s.isBrand).length;

  // ── drill helpers ──
  const sovBar = agg.sov.slice(0, 8).map((s) => ({ name: s.name, value: +s.share.toFixed(1) }));
  const sovRows: DrillRow[] = agg.sov.map((s, i) => ({
    label: `${i + 1}. ${s.name}`,
    sub: s.isBrand ? "your brand" : "competitor",
    value: `${s.share.toFixed(1)}% · ${s.count}`,
    tag: s.isBrand ? "you" : undefined,
    tagColor: "#0056D6",
  }));
  const compRows: DrillRow[] = agg.comp.map((c, i) => ({
    label: `${i + 1}. ${c.competitor}`,
    sub: c.side ? c.side : undefined,
    value: `${c.presence_rate.toFixed(1)}% · ${c.present}`,
  }));

  return (
    <>
      <PageHeader
        title="Share of Voice"
        subtitle="Who the answer engines surface, and how often"
        right={
          brandRank > 0
            ? <Badge variant="brand">RISA ranks #{brandRank} of {agg.sov.length}</Badge>
            : undefined
        }
      />

      <div className="space-y-6">
        {/* ── Headline metrics ── */}
        <div>
          <Section label="Headline metrics" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 stagger mt-2">
            <DrillStat
              label="Brand SOV"
              brief={BRIEFS.sov}
              icon={<PieChart className={I} />}
              value={brandSov}
              decimals={1}
              suffix="%"
              sub={`${brandEntry?.count ?? 0} mentions in the tracked set`}
              footer={<MeterBar pct={brandSov} color="var(--brand)" />}
              detail={{ blurb: BRIEFS.sov, chart: { kind: "bar", unit: "%", data: sovBar }, rowsTitle: "All brands ranked by SOV", rows: sovRows }}
            />
            <DrillStat
              label="Competitive rank"
              brief={BRIEFS.rank}
              icon={<Trophy className={I} />}
              value={brandRank > 0 ? brandRank : 0}
              prefix={brandRank > 0 ? "#" : ""}
              accent="#0056D6"
              sub={`of ${agg.sov.length} brands tracked`}
              detail={{ blurb: BRIEFS.rank, chart: { kind: "bar", unit: "%", data: sovBar }, rowsTitle: "Leaderboard", rows: sovRows }}
            />
            <DrillStat
              label="Competitors tracked"
              brief="Number of distinct competitor brands that appeared across the tracked prompt set."
              icon={<AtSign className={I} />}
              value={competitorCount}
              sub="brands named in AI answers"
              detail={{ blurb: "Competitor brands that appeared at least once across the tracked prompt set, ranked by presence rate.", rowsTitle: "Competitors by presence rate", rows: compRows }}
            />
          </div>
        </div>

        {/* ── Leaderboards ── */}
        <div>
          <Section label="Leaderboards" />
          <div className="grid grid-cols-12 gap-5 mt-2">
            <Card className="col-span-12 lg:col-span-6 p-5">
              <Title
                brief={BRIEFS.sov}
                right={brandRank > 0 ? <Badge variant="brand">RISA #{brandRank}</Badge> : undefined}
              >
                Share of Voice
              </Title>
              <BrandRankBar items={sov} />
            </Card>
            <Card className="col-span-12 lg:col-span-6 p-5">
              <Title brief="Competitors ranked by how often they appear across the tracked prompt set. Presence rate is mentions / total prompts.">
                Competitor Leaderboard
              </Title>
              {board.length ? (
                <BrandRankBar items={board} />
              ) : (
                <p className="text-sm text-slate-400">No competitor data in view. Competitors appear once the pipeline runs with web citations enabled.</p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
