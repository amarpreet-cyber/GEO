import Link from "next/link";
import { Smile, Meh, Frown, EyeOff } from "lucide-react";
import { loadFiltered } from "@/lib/page";
import { hasData } from "@/lib/data";
import { groupSentiment } from "@/lib/derive";
import { Card, Title, Section, PageHeader, NoData, StatCard, StackBar, Legend, MeterBar } from "@/components/ui";
import { Donut } from "@/components/charts";
import { BRIEFS } from "@/lib/metricBriefs";
import type { SP } from "@/lib/filters";

const SENT_COLOR: Record<string, string> = { positive: "#22c55e", neutral: "#f59e0b", negative: "#ef4444", absent: "#cbd0e0" };
const ORDER = ["positive", "neutral", "negative", "absent"] as const;
const I = "w-3.5 h-3.5";

function SentBreakdown({ rows }: { rows: ReturnType<typeof groupSentiment> }) {
  const sorted = [...rows].sort((a, b) => b.posShare - a.posShare || b.total - a.total);
  return (
    <div className="space-y-3">
      {sorted.map((r) => (
        <div key={r.name}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-slate-700 truncate">{r.name}</span>
            <span className="text-slate-400 tnum">{r.total} · {r.posShare}% pos</span>
          </div>
          <StackBar height={9} segments={ORDER.map((k) => ({ label: k, value: (r as unknown as Record<string, number>)[k], color: SENT_COLOR[k] }))} />
        </div>
      ))}
      {sorted.length === 0 && <p className="text-sm text-slate-400">Nothing in view.</p>}
    </div>
  );
}

export default function Sentiment({ searchParams }: { searchParams: SP }) {
  if (!hasData()) return <NoData />;
  const { filtered, brand, agg, all } = loadFiltered(searchParams);
  const sent = ORDER.filter((k) => agg.sent[k]).map((name) => ({ name, value: agg.sent[name], color: SENT_COLOR[name] }));
  const posShare = agg.n ? (100 * (agg.sent.positive || 0)) / agg.n : 0;
  const negShare = agg.n ? (100 * (agg.sent.negative || 0)) / agg.n : 0;
  const byPersona = groupSentiment(filtered, "persona");
  const byTopic = groupSentiment(filtered, "topic").filter((t) => t.name && t.name !== "—" && t.name !== "(unspecified)");
  const positives = filtered.filter((r) => r.brand_sentiment_label === "positive");
  const idxOf = new Map(all.map((r, i) => [r.prompt, i]));

  return (
    <>
      <PageHeader
        title="Brand Sentiment"
        subtitle={`How answer engines frame ${brand} when it appears`}
      />

      <div className="space-y-6">
        {/* ── Headline metrics ── */}
        <div>
          <Section label="Headline metrics" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger mt-2">
            <StatCard
              label="Positive"
              brief={BRIEFS.positive_answers}
              icon={<Smile className={I} />}
              value={agg.sent.positive || 0}
              accent="#22c55e"
              tone="good"
              sub={`${posShare.toFixed(0)}% of ${agg.n} prompts`}
              footer={<MeterBar pct={posShare} color="#22c55e" />}
            />
            <StatCard
              label="Neutral"
              brief="Prompts where the AI mentions the brand without positive or negative framing."
              icon={<Meh className={I} />}
              value={agg.sent.neutral || 0}
              accent="#f59e0b"
              sub="mentioned, no stance"
            />
            <StatCard
              label="Negative"
              brief="Prompts where the AI answer frames the brand unfavorably."
              icon={<Frown className={I} />}
              value={agg.sent.negative || 0}
              accent="#ef4444"
              tone={negShare > 10 ? "bad" : undefined}
              sub={`${negShare.toFixed(0)}% of prompts`}
            />
            <StatCard
              label="Absent"
              brief={BRIEFS.invisible}
              icon={<EyeOff className={I} />}
              value={agg.sent.absent || 0}
              accent="#9aa1b9"
              tone="bad"
              sub="no mention at all"
            />
          </div>
        </div>

        {/* ── Sentiment mix ── */}
        <div>
          <Section label="Sentiment mix" />
          <div className="grid grid-cols-12 gap-5 stagger mt-2">
            <Card className="col-span-12 lg:col-span-4 p-5 flex flex-col">
              <Title brief={BRIEFS.sentiment}>Overall distribution</Title>
              <Donut data={sent} height={210} total={agg.n} totalLabel="answers" />
              <div className="mt-4">
                <StackBar height={12} segments={sent.map((s) => ({ label: s.name, value: s.value, color: s.color }))} />
              </div>
              <div className="mt-3">
                <Legend items={sent.map((e) => ({ label: e.name, color: e.color, value: e.value }))} />
              </div>
              <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
                Absent dominates today, so the work is presence first, then framing. Win the gaps in{" "}
                <Link href="/prompts/gaps" className="text-brand hover:underline">Opportunities</Link>.
              </p>
            </Card>
            <Card className="col-span-12 lg:col-span-4 p-5">
              <Title brief="Sentiment stance split per buyer persona. Highest positive-share first.">By persona</Title>
              <SentBreakdown rows={byPersona} />
            </Card>
            <Card className="col-span-12 lg:col-span-4 p-5">
              <Title brief="Sentiment stance split per topic. Highest positive-share first.">By topic</Title>
              <SentBreakdown rows={byTopic} />
            </Card>
          </div>
        </div>

        {/* ── Positive mentions ── */}
        <div>
          <Section label="Positive mentions" />
          <Card className="p-5 mt-2">
            <Title
              brief="Prompts where the engine actively speaks well of the brand. These are your proof points."
              right={<span className="text-xs text-slate-400">{positives.length} positive</span>}
            >
              Prompts with positive framing
            </Title>
            <div className="space-y-2">
              {positives.map((r) => (
                <Link
                  key={r.prompt}
                  href={`/prompts/${idxOf.get(r.prompt) ?? 0}`}
                  className="flex items-start gap-3 border border-slate-200 rounded-lg p-3 hover:border-brand/30 hover:bg-brand-light/40 transition press ds-card-hover"
                >
                  <span className="w-2 h-2 rounded-full bg-pos shrink-0 mt-1.5" style={{ background: "#22c55e" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink font-medium leading-snug">{r.prompt}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {r.persona?.toUpperCase()} · {r.intent} · pos #{r.brand_position}
                    </div>
                  </div>
                </Link>
              ))}
              {positives.length === 0 && (
                <p className="text-sm text-slate-400">No positive-sentiment answers in view yet.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
