import Link from "next/link";
import { Eye, AtSign, ListOrdered, PieChart, Trophy, ArrowRight } from "lucide-react";
import { loadFiltered } from "@/lib/page";
import { getHistory, hasData } from "@/lib/data";
import { groupVisibility } from "@/lib/derive";
import {
  Card, Title, Section, PageHeader, NoData, StatCard, MeterBar,
  StackBar, Legend, ProgressRow, Badge,
} from "@/components/ui";
import { HBar, Donut, GroupBar, Trend } from "@/components/charts";
import { BRIEFS } from "@/lib/metricBriefs";
import type { SP } from "@/lib/filters";

const SENT_COLOR: Record<string, string> = { positive: "#22c55e", neutral: "#f59e0b", negative: "#ef4444", absent: "#cbd0e0" };
const VIS = "#7c3aed";
const MEN = "#a78bfa";
const I = "w-3.5 h-3.5";

export default function Visibility({ searchParams }: { searchParams: SP }) {
  if (!hasData()) return <NoData />;
  const { filtered, brand, agg, summary } = loadFiltered(searchParams);
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
            <StatCard
              label="Visibility"
              brief={BRIEFS.visibility}
              icon={<Eye className={I} />}
              value={agg.visibility}
              decimals={1}
              unit="/100"
              tone={agg.visibility >= 40 ? "good" : agg.visibility >= 15 ? "warn" : "bad"}
              footer={<MeterBar pct={agg.visibility} color={agg.visibility >= 40 ? "#22c55e" : agg.visibility >= 15 ? "#f59e0b" : "#ef4444"} />}
            />
            <StatCard
              label="Mention rate"
              brief={BRIEFS.mention_rate}
              icon={<AtSign className={I} />}
              value={agg.mention_rate}
              decimals={1}
              suffix="%"
              tone={agg.mention_rate >= 25 ? "good" : "warn"}
              footer={<MeterBar pct={agg.mention_rate} color="#f59e0b" />}
            />
            <StatCard
              label="Avg position"
              brief={BRIEFS.avg_position}
              icon={<ListOrdered className={I} />}
              value={agg.avgPos ?? 0}
              decimals={1}
              accent="#3b82f6"
              sub={agg.avgPos ? "rank when mentioned" : "no mentions yet"}
            />
            <StatCard
              label="Share of voice"
              brief={BRIEFS.sov}
              icon={<PieChart className={I} />}
              value={brandSov}
              decimals={1}
              suffix="%"
              sub={`of ${agg.sov.length} brands tracked`}
            />
            <StatCard
              label="Competitive rank"
              brief={BRIEFS.rank}
              icon={<Trophy className={I} />}
              value={brandRank > 0 ? brandRank : 0}
              prefix={brandRank > 0 ? "#" : ""}
              accent="#f59e0b"
              sub={`of ${agg.sov.length} brands in the set`}
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
              <Donut data={sent} height={200} total={agg.n} totalLabel="answers" />
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
