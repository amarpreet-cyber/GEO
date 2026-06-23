import Link from "next/link";
import { Eye, AtSign, ListOrdered, PieChart, Trophy, ArrowRight } from "lucide-react";
import { loadFiltered } from "@/lib/page";
import { getHistory, hasData } from "@/lib/data";
import { groupVisibility, jbool, num } from "@/lib/derive";
import {
  Card, Title, Section, PageHeader, NoData, MeterBar,
  StackBar, Legend, ProgressRow, Badge,
} from "@/components/ui";
import { DrillStat } from "@/components/DrillStat";
import { HBar, GroupBar, Trend } from "@/components/charts";
import { DrillDonut } from "@/components/SegmentCharts";
import { BRIEFS } from "@/lib/metricBriefs";
import type { DrillRow } from "@/lib/drill";
import type { SP } from "@/lib/filters";

const SENT_COLOR: Record<string, string> = { positive: "#0056D6", neutral: "#CA8A04", negative: "#ef4444", absent: "#D6D6D6" };
const VIS = "#0056D6";
const MEN = "#6FA8DC";
const I = "w-3.5 h-3.5";

export default function Visibility({ searchParams }: { searchParams: SP }) {
  if (!hasData()) return <NoData />;
  const { filtered, brand, agg, summary, all } = loadFiltered(searchParams);
  const history = getHistory();

  const sov = agg.sov.slice(0, 10).map((s) => ({
    name: s.name, value: +s.share.toFixed(1),
  }));
  const sentOrder = ["positive", "neutral", "negative", "absent"];
  const sent = sentOrder.filter((k) => agg.sent[k]).map((name) => ({
    name, value: agg.sent[name], color: SENT_COLOR[name],
  }));
  const persona = groupVisibility(filtered, "persona");
  const intent = groupVisibility(filtered, "intent");

  const byEngine = Object.entries(summary?.by_engine || {}).map(([name, v]) => ({
    name, visibility: +v.visibility_score.toFixed(1), mention: +v.mention_rate.toFixed(1),
  }));
  const byTopic = groupVisibility(filtered, "topic")
    .filter((t) => t.name && t.name !== "—")
    .sort((a, b) => b.visibility - a.visibility)
    .slice(0, 8)
    .map((t) => ({ name: t.name.length > 22 ? t.name.slice(0, 21) + "…" : t.name, value: t.visibility }));

  const brandRank = agg.sov.findIndex((s) => s.isBrand) + 1;
  const brandSov = agg.sov.find((s) => s.isBrand)?.share || 0;
  const posShare = agg.n ? (100 * (agg.sent.positive || 0)) / agg.n : 0;

  const segs = Object.entries(summary?.by_persona || {})
    .map(([name, v]) => ({ name: name.toUpperCase(), ...v }))
    .sort((a, b) => b.visibility_score - a.visibility_score);
  const maxVis = Math.max(...segs.map((s) => s.visibility_score), 1);

  // ── drill-down helpers ──
  const idxOf = new Map(all.map((r, i) => [r.prompt, i]));
  const promptHref = (p: string) => (idxOf.has(p) ? `/prompts/${idxOf.get(p)}` : undefined);
  const promptRow = (r: typeof filtered[number]): DrillRow => ({
    label: r.prompt,
    sub: `${(r.persona || "").toUpperCase()}${r.intent ? " · " + r.intent : ""}`,
    href: promptHref(r.prompt),
    value: jbool(r.brand_mentioned) ? (num(r.brand_position) > 0 ? `#${num(r.brand_position)}` : "mentioned") : "absent",
  });

  const missing = filtered.filter((r) => !jbool(r.brand_mentioned));
  const sovBar = agg.sov.slice(0, 8).map((s) => ({ name: s.name, value: +s.share.toFixed(1) }));
  const sovRows: DrillRow[] = agg.sov.map((s, i) => ({
    label: `${i + 1}. ${s.name}`,
    sub: s.isBrand ? brand : "competitor",
    value: `${s.share.toFixed(1)}% · ${s.count}`,
    tag: s.isBrand ? "you" : undefined,
    tagColor: "#0056D6",
    href: s.isBrand ? undefined : "/visibility/share-of-voice",
  }));
  const personaBar = persona.map((p) => ({ name: p.name, value: p.visibility }));
  const dMentioned = { name: "Mentioned", value: agg.mentioned, color: "#0056D6" };
  const dMissing = { name: "Missing", value: agg.n - agg.mentioned, color: "#ef4444" };

  // prompts sorted by avg position (ascending, unmentioned last)
  const byPos: DrillRow[] = [...filtered]
    .sort((a, b) => {
      const pa = num(a.brand_position), pb = num(b.brand_position);
      if (pa > 0 && pb > 0) return pa - pb;
      if (pa > 0) return -1;
      if (pb > 0) return 1;
      return 0;
    })
    .slice(0, 40)
    .map((r) => ({
      label: r.prompt,
      sub: `${(r.persona || "").toUpperCase()}${r.intent ? " · " + r.intent : ""}`,
      href: promptHref(r.prompt),
      value: num(r.brand_position) > 0 ? `#${num(r.brand_position)}` : "absent",
    }));

  return (
    <>
      <PageHeader
        title="Answer-Engine Visibility"
        subtitle={`Where ${brand} appears across AI answers, and who wins when it doesn't`}
        right={<Badge variant="neutral">{agg.n} prompts in view</Badge>}
      />

      <div className="space-y-6">
        {/* ── Headline metrics ── */}
        <div>
          <Section label="Headline metrics" />
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 stagger mt-2">
            <DrillStat
              label="Visibility"
              brief={BRIEFS.visibility}
              icon={<Eye className={I} />}
              value={agg.visibility}
              decimals={1}
              unit="/100"
              tone={agg.visibility >= 40 ? "good" : agg.visibility >= 15 ? "warn" : "bad"}
              footer={<MeterBar pct={agg.visibility} color={agg.visibility >= 40 ? "#22c55e" : agg.visibility >= 15 ? "#CA8A04" : "#ef4444"} />}
              detail={{ blurb: BRIEFS.visibility, chart: { kind: "bar", data: personaBar }, rowsTitle: "Prompts in view", rows: filtered.slice(0, 40).map(promptRow), href: "/visibility", hrefLabel: "Open Visibility" }}
            />
            <DrillStat
              label="Mention rate"
              brief={BRIEFS.mention_rate}
              icon={<AtSign className={I} />}
              value={agg.mention_rate}
              decimals={1}
              suffix="%"
              tone={agg.mention_rate >= 25 ? "good" : "warn"}
              footer={<MeterBar pct={agg.mention_rate} color="#CA8A04" />}
              detail={{ blurb: BRIEFS.mention_rate, chart: { kind: "donut", data: [dMentioned, dMissing] }, rowsTitle: "Prompts with no mention", rows: missing.slice(0, 40).map(promptRow), href: "/prompts/gaps", hrefLabel: "See opportunities" }}
            />
            <DrillStat
              label="Avg position"
              brief={BRIEFS.avg_position}
              icon={<ListOrdered className={I} />}
              value={agg.avgPos ?? 0}
              decimals={1}
              accent="#3b82f6"
              sub={agg.avgPos ? "rank when mentioned" : "no mentions yet"}
              detail={{ blurb: BRIEFS.avg_position, chart: { kind: "bar", data: personaBar }, rowsTitle: "Prompts by position (best first)", rows: byPos }}
            />
            <DrillStat
              label="Share of voice"
              brief={BRIEFS.sov}
              icon={<PieChart className={I} />}
              value={brandSov}
              decimals={1}
              suffix="%"
              sub={`of ${agg.sov.length} brands tracked`}
              detail={{ blurb: BRIEFS.sov, chart: { kind: "bar", unit: "%", data: sovBar }, rowsTitle: "Brand leaderboard", rows: sovRows, href: "/visibility/share-of-voice", hrefLabel: "Open Share of Voice" }}
            />
            <DrillStat
              label="Competitive rank"
              brief={BRIEFS.rank}
              icon={<Trophy className={I} />}
              value={brandRank > 0 ? brandRank : 0}
              prefix={brandRank > 0 ? "#" : ""}
              accent="#0056D6"
              sub={`of ${agg.sov.length} brands in the set`}
              detail={{ blurb: BRIEFS.rank, chart: { kind: "bar", unit: "%", data: sovBar }, rowsTitle: "Leaderboard", rows: sovRows, href: "/visibility/share-of-voice", hrefLabel: "Open Share of Voice" }}
            />
          </div>
        </div>

        {/* ── Competitive standing ── */}
        <div>
          <Section
            label="Competitive standing"
            right={
              <Link href="/visibility/share-of-voice" className="text-xs text-brand hover:underline inline-flex items-center gap-1">
                full leaderboard <ArrowRight className="w-3 h-3" />
              </Link>
            }
          />
          <div className="grid grid-cols-12 gap-5 mt-2">
            <Card className="col-span-12 lg:col-span-7 p-5">
              <Title
                brief={BRIEFS.sov}
                right={brandRank > 0 ? <Badge variant="brand">RISA ranks #{brandRank}</Badge> : undefined}
              >
                Share of Voice
              </Title>
              <HBar data={sov} highlightName={brand} height={Math.max(200, sov.length * 36)} />
            </Card>
            <Card className="col-span-12 lg:col-span-5 p-5 flex flex-col">
              <Title
                brief={BRIEFS.sentiment}
                right={
                  <Link href="/visibility/sentiment" className="text-xs text-brand hover:underline inline-flex items-center gap-1">
                    details <ArrowRight className="w-3 h-3" />
                  </Link>
                }
              >
                Sentiment mix
              </Title>
              <DrillDonut data={sent} field="sentiment" height={200} total={agg.n} totalLabel="answers" />
              <div className="mt-3">
                <StackBar segments={sent.map((s) => ({ label: s.name, value: s.value, color: s.color }))} height={10} />
              </div>
              <div className="mt-3">
                <Legend items={sent.map((e) => ({ label: e.name, color: e.color, value: e.value }))} />
              </div>
              <div className="mt-auto pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[11px] text-slate-400 uppercase tracking-wide">Positive share</div>
                  <div className="text-[22px] font-bold tnum text-emerald-600 leading-none mt-0.5">{posShare.toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 uppercase tracking-wide">Invisible on</div>
                  <div className="text-[22px] font-bold tnum text-red-500 leading-none mt-0.5">{agg.n - agg.mentioned}</div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* ── By segment ── */}
        <div>
          <Section label="By segment" />
          <div className="grid grid-cols-12 gap-5 mt-2">
            <Card className="col-span-12 lg:col-span-6 p-5">
              <Title brief="Visibility score broken down by buyer persona. Where RISA wins or is absent.">
                By Persona
              </Title>
              <GroupBar
                data={persona}
                keys={[
                  { key: "visibility", color: VIS, label: "Visibility" },
                  { key: "mention", color: MEN, label: "Mention %" },
                ]}
              />
              <div className="mt-2">
                <Legend items={[{ label: "Visibility", color: VIS }, { label: "Mention rate %", color: MEN }]} />
              </div>
            </Card>
            <Card className="col-span-12 lg:col-span-6 p-5">
              <Title brief="Visibility by query intent. Discovery and comparison are the buying funnel.">
                By Intent
              </Title>
              <GroupBar
                data={intent}
                keys={[
                  { key: "visibility", color: VIS, label: "Visibility" },
                  { key: "mention", color: MEN, label: "Mention %" },
                ]}
              />
              <div className="mt-2">
                <Legend items={[{ label: "Visibility", color: VIS }, { label: "Mention rate %", color: MEN }]} />
              </div>
            </Card>
          </div>
          <div className="grid grid-cols-12 gap-5 mt-4">
            <Card className="col-span-12 lg:col-span-7 p-5">
              <Title brief="Topics ranked by RISA visibility score, highest first.">Visibility by Topic</Title>
              {byTopic.length ? (
                <HBar data={byTopic} unit="" height={Math.max(200, byTopic.length * 36)} highlightName="" />
              ) : (
                <p className="text-sm text-slate-400">No topic data in view.</p>
              )}
            </Card>
            <Card className="col-span-12 lg:col-span-5 p-5">
              <Title brief="Persona segments ranked by visibility score from the latest pipeline run.">
                Segment Leaderboard
              </Title>
              <div className="space-y-3">
                {segs.map((s) => (
                  <div key={s.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700">{s.name}</span>
                      <span className="text-slate-400 tnum">
                        {s.prompts} prompts · {s.mention_rate.toFixed(0)}% mention
                      </span>
                    </div>
                    <ProgressRow label="" value={s.visibility_score} max={maxVis} labelWidth="w-0" />
                  </div>
                ))}
                {segs.length === 0 && <p className="text-sm text-slate-400">No persona rollups yet.</p>}
              </div>
            </Card>
          </div>
        </div>

        {/* ── By engine and trend ── */}
        <div>
          <Section
            label="By engine"
            right={
              <Link href="/visibility/engines" className="text-xs text-brand hover:underline inline-flex items-center gap-1">
                engine details <ArrowRight className="w-3 h-3" />
              </Link>
            }
          />
          <div className="grid grid-cols-12 gap-5 mt-2">
            <Card className="col-span-12 lg:col-span-5 p-5">
              <Title
                brief={BRIEFS.engines_live}
                right={<Badge variant="neutral">{byEngine.length} live</Badge>}
              >
                Engine comparison
              </Title>
              {byEngine.length ? (
                <>
                  <GroupBar
                    data={byEngine}
                    keys={[
                      { key: "visibility", color: VIS, label: "Visibility" },
                      { key: "mention", color: MEN, label: "Mention %" },
                    ]}
                    height={200}
                  />
                  <div className="mt-2">
                    <Legend items={[{ label: "Visibility", color: VIS }, { label: "Mention rate %", color: MEN }]} />
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400">Single engine. Add more via ENGINES in .env.</p>
              )}
            </Card>
            <Card className="col-span-12 lg:col-span-7 p-5">
              <Title brief="Visibility score plotted across pipeline runs. Each point is one full run of the tracked prompt set.">
                Trend over runs
              </Title>
              <Trend data={history} height={200} />
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
