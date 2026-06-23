import Link from "next/link";
import { Smile, Meh, Frown, EyeOff } from "lucide-react";
import { loadFiltered } from "@/lib/page";
import { hasData } from "@/lib/data";
import { groupSentiment, jbool, num } from "@/lib/derive";
import { Card, Title, Section, PageHeader, NoData, StackBar, Legend, MeterBar } from "@/components/ui";
import { DrillStat } from "@/components/DrillStat";
import { PromptTrigger } from "@/components/PromptDrawerProvider";
import { DrillDonut } from "@/components/SegmentCharts";
import { BRIEFS } from "@/lib/metricBriefs";
import type { DrillRow } from "@/lib/drill";
import type { SP } from "@/lib/filters";

const SENT_COLOR: Record<string, string> = { positive: "#0056D6", neutral: "#CA8A04", negative: "#ef4444", absent: "#D6D6D6" };
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

  // ── drill helpers ──
  const sentDonut = sent.map((s) => ({ name: s.name, value: s.value, color: s.color }));
  const promptHref = (p: string) => (idxOf.has(p) ? `/prompts/${idxOf.get(p)}` : undefined);
  const sentPromptRow = (r: typeof filtered[number]): DrillRow => ({
    label: r.prompt,
    sub: `${(r.persona || "").toUpperCase()}${r.intent ? " · " + r.intent : ""}`,
    href: promptHref(r.prompt),
    value: jbool(r.brand_mentioned) ? (num(r.brand_position) > 0 ? `#${num(r.brand_position)}` : "mentioned") : "absent",
  });
  const positiveRows = filtered.filter((r) => r.brand_sentiment_label === "positive").slice(0, 40).map(sentPromptRow);
  const neutralRows = filtered.filter((r) => r.brand_sentiment_label === "neutral").slice(0, 40).map(sentPromptRow);
  const negativeRows = filtered.filter((r) => r.brand_sentiment_label === "negative").slice(0, 40).map(sentPromptRow);
  const absentRows = filtered.filter((r) => !jbool(r.brand_mentioned)).slice(0, 40).map(sentPromptRow);

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
            <DrillStat
              label="Positive"
              brief={BRIEFS.positive_answers}
              icon={<Smile className={I} />}
              value={agg.sent.positive || 0}
              accent="#0056D6"
              tone="good"
              sub={`${posShare.toFixed(0)}% of ${agg.n} prompts`}
              footer={<MeterBar pct={posShare} color="#0056D6" />}
              detail={{ blurb: BRIEFS.positive_answers, chart: { kind: "donut", data: sentDonut }, rowsTitle: "Positively-framed prompts", rows: positiveRows, href: "/prompts/gaps", hrefLabel: "See opportunities" }}
            />
            <DrillStat
              label="Neutral"
              brief="Prompts where the AI mentions the brand without positive or negative framing."
              icon={<Meh className={I} />}
              value={agg.sent.neutral || 0}
              accent="#0056D6"
              sub="mentioned, no stance"
              detail={{ blurb: "Prompts where the AI mentions the brand without positive or negative framing.", chart: { kind: "donut", data: sentDonut }, rowsTitle: "Neutrally-framed prompts", rows: neutralRows }}
            />
            <DrillStat
              label="Negative"
              brief="Prompts where the AI answer frames the brand unfavorably."
              icon={<Frown className={I} />}
              value={agg.sent.negative || 0}
              accent="#ef4444"
              tone={negShare > 10 ? "bad" : undefined}
              sub={`${negShare.toFixed(0)}% of prompts`}
              detail={{ blurb: "Prompts where the AI answer frames the brand unfavorably.", chart: { kind: "donut", data: sentDonut }, rowsTitle: "Negatively-framed prompts", rows: negativeRows }}
            />
            <DrillStat
              label="Absent"
              brief={BRIEFS.invisible}
              icon={<EyeOff className={I} />}
              value={agg.sent.absent || 0}
              accent="#8A8A8A"
              tone="bad"
              sub="no mention at all"
              detail={{ blurb: BRIEFS.invisible, chart: { kind: "donut", data: sentDonut }, rowsTitle: "Prompts with no mention", rows: absentRows, href: "/prompts/gaps", hrefLabel: "See opportunities" }}
            />
          </div>
        </div>

        {/* ── Sentiment mix ── */}
        <div>
          <Section label="Sentiment mix" />
          <div className="grid grid-cols-12 gap-5 stagger mt-2">
            <Card className="col-span-12 lg:col-span-4 p-5 flex flex-col">
              <Title brief={BRIEFS.sentiment}>Overall distribution</Title>
              <DrillDonut data={sent} field="sentiment" height={210} total={agg.n} totalLabel="answers" />
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
                <PromptTrigger
                  key={r.prompt}
                  id={idxOf.get(r.prompt) ?? 0}
                  className="w-full text-left flex items-start gap-3 border border-slate-200 rounded-lg p-3 hover:border-brand/30 hover:bg-brand-light/40 transition press ds-card-hover"
                >
                  <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: "#16a34a" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink font-medium leading-snug">{r.prompt}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {r.persona?.toUpperCase()} · {r.intent} · pos #{r.brand_position}
                    </div>
                  </div>
                </PromptTrigger>
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
