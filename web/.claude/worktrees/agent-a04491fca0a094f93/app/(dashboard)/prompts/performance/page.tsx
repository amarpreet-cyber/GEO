import { Target, Trophy, TrendingDown, Percent } from "lucide-react";
import { loadFiltered } from "@/lib/page";
import { hasData } from "@/lib/data";
import { groupVisibility, jbool, num, jparse } from "@/lib/derive";
import { Card, Title, Section, PageHeader, NoData, MeterBar, Badge } from "@/components/ui";
import { DrillStat } from "@/components/DrillStat";
import { HBar, GroupBar } from "@/components/charts";
import PromptsTable, { type PromptRowVM } from "@/components/PromptsTable";
import { BRIEFS } from "@/lib/metricBriefs";
import type { DrillRow } from "@/lib/drill";
import type { SP } from "@/lib/filters";

const VIS = "#7c3aed";
const MEN = "#a78bfa";
const I = "w-3.5 h-3.5";

export default function Performance({ searchParams }: { searchParams: SP }) {
  if (!hasData()) return <NoData />;
  const { filtered, all, agg, brand, summary } = loadFiltered(searchParams);
  const idxOf = new Map(all.map((r, i) => [r.prompt, i]));

  const rows: PromptRowVM[] = filtered.map((r) => ({
    id: idxOf.get(r.prompt) ?? 0,
    prompt: r.prompt,
    persona: r.persona,
    intent: r.intent,
    mentioned: jbool(r.brand_mentioned),
    position: num(r.brand_position),
    sentiment: r.brand_sentiment_label,
    cites: jparse(r.cited_domains).length,
  }));

  const byTopicRaw = groupVisibility(filtered, "topic")
    .filter((t) => t.name && t.name !== "—" && t.name !== "(unspecified)")
    .sort((a, b) => b.visibility - a.visibility);

  const byTopic = byTopicRaw.map((t) => ({
    name: t.name.length > 26 ? t.name.slice(0, 25) + "…" : t.name,
    value: t.visibility,
  }));

  const byPersona = groupVisibility(filtered, "persona");
  const bestTopic = byTopicRaw[0];
  const worstPersona = [...byPersona].sort((a, b) => a.visibility - b.visibility)[0];

  // promptRow helper
  const promptHref = (p: string) => (idxOf.has(p) ? `/prompts/${idxOf.get(p)}` : undefined);
  const promptRow = (r: typeof filtered[number]): DrillRow => ({
    label: r.prompt,
    sub: `${(r.persona || "").toUpperCase()}${r.intent ? " · " + r.intent : ""}`,
    href: promptHref(r.prompt),
    value: jbool(r.brand_mentioned)
      ? (num(r.brand_position) > 0 ? `#${num(r.brand_position)}` : "mentioned")
      : "absent",
  });

  const wonRows = filtered.filter((r) => jbool(r.brand_mentioned));
  const dMentioned = { name: "Mentioned", value: agg.mentioned, color: "#22c55e" };
  const dMissing = { name: "Missing", value: agg.n - agg.mentioned, color: "#ef4444" };

  // rows for best topic drill-down
  const bestTopicRows = bestTopic
    ? filtered
        .filter((r) => (r.topic || "") === bestTopic.name)
        .slice(0, 40)
        .map(promptRow)
    : [];

  // rows for weakest persona drill-down
  const worstPersonaRows = worstPersona
    ? filtered
        .filter((r) => (r.persona || "").toUpperCase() === worstPersona.name)
        .slice(0, 40)
        .map(promptRow)
    : [];

  // HBar data for persona visibility
  const personaBar = byPersona.map((p) => ({ name: p.name, value: p.visibility }));

  return (
    <>
      <PageHeader
        title="Prompt Performance"
        subtitle={`Where ${brand} earns answer-engine real estate and where it leaks.`}
        right={
          <div className="flex items-center gap-2">
            <Badge variant="neutral">{(summary?.generated_engines || []).join(" · ") || "claude"}</Badge>
            <Badge variant="brand">{agg.n} prompts</Badge>
          </div>
        }
      />

      <div className="space-y-6">
        {/* KPI tiles */}
        <div>
          <Section label="Key metrics" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger mt-2">
            <DrillStat
              label="Win rate"
              brief={BRIEFS.win_rate}
              icon={<Percent className={I} />}
              value={agg.mention_rate}
              decimals={1}
              suffix="%"
              tone={agg.mention_rate >= 25 ? "good" : "warn"}
              footer={<MeterBar pct={agg.mention_rate} color="#f59e0b" />}
              detail={{
                blurb: BRIEFS.win_rate,
                chart: { kind: "donut", data: [dMentioned, dMissing] },
                rowsTitle: "Prompts where RISA is mentioned",
                rows: wonRows.slice(0, 40).map(promptRow),
                href: "/prompts/performance",
                hrefLabel: "Open Performance",
              }}
            />
            <DrillStat
              label="Prompts won"
              brief={BRIEFS.prompts_won}
              icon={<Trophy className={I} />}
              value={agg.mentioned}
              accent="#22c55e"
              sub={`of ${agg.n} in view`}
              detail={{
                blurb: BRIEFS.prompts_won,
                chart: { kind: "donut", data: [dMentioned, dMissing] },
                rowsTitle: "Won prompts",
                rows: wonRows.slice(0, 40).map(promptRow),
                href: "/prompts/performance",
                hrefLabel: "Open Performance",
              }}
            />
            <DrillStat
              label="Best topic"
              brief={BRIEFS.best_topic}
              icon={<Target className={I} />}
              value={bestTopic ? bestTopic.visibility : 0}
              decimals={1}
              suffix={bestTopic ? "/100" : ""}
              accent="#7c3aed"
              sub={bestTopic?.name || "no topic data"}
              detail={{
                blurb: BRIEFS.best_topic,
                chart: { kind: "bar", unit: "", data: byTopic.slice(0, 12) },
                rowsTitle: `Prompts in "${bestTopic?.name || "best topic"}"`,
                rows: bestTopicRows,
                href: "/prompts/performance",
                hrefLabel: "Open Performance",
              }}
            />
            <DrillStat
              label="Weakest persona"
              brief={BRIEFS.weakest_persona}
              icon={<TrendingDown className={I} />}
              value={worstPersona ? worstPersona.visibility : 0}
              decimals={1}
              suffix={worstPersona ? "/100" : ""}
              accent="#ef4444"
              tone="bad"
              sub={worstPersona ? worstPersona.name : "no persona data"}
              detail={{
                blurb: BRIEFS.weakest_persona,
                chart: { kind: "bar", unit: "", data: personaBar },
                rowsTitle: `Prompts for ${worstPersona?.name || "weakest persona"}`,
                rows: worstPersonaRows,
                href: "/prompts/performance",
                hrefLabel: "Open Performance",
              }}
            />
          </div>
        </div>

        {/* Breakdown charts */}
        <div>
          <Section label="Visibility breakdown" />
          <div className="grid grid-cols-12 gap-5 mt-2">
            <Card className="col-span-12 lg:col-span-7 p-5">
              <Title
                brief="Rank-weighted visibility score per tracked topic, sorted highest to lowest."
                right={
                  bestTopic
                    ? <span className="text-[11px] text-emerald-600 font-semibold">Best: {bestTopic.name}</span>
                    : undefined
                }
              >
                Performance by topic
              </Title>
              {byTopic.length > 0
                ? <HBar data={byTopic} unit="" height={Math.max(220, byTopic.length * 30)} highlightName={bestTopic?.name} />
                : <p className="text-sm text-slate-400 py-6 text-center">No topic data in the current filter.</p>
              }
            </Card>

            <Card className="col-span-12 lg:col-span-5 p-5">
              <Title
                brief="Visibility score vs mention rate per buyer persona — two separate signals of coverage quality."
                right={
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: VIS }} />Visibility</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: MEN }} />Mention %</span>
                  </div>
                }
              >
                By persona
              </Title>
              {byPersona.length > 0
                ? <GroupBar
                    data={byPersona}
                    keys={[
                      { key: "visibility", color: VIS, label: "Visibility" },
                      { key: "mention", color: MEN, label: "Mention %" },
                    ]}
                    height={240}
                  />
                : <p className="text-sm text-slate-400 py-6 text-center">No persona data in the current filter.</p>
              }
            </Card>
          </div>
        </div>

        {/* Prompt-level table */}
        <div>
          <Section label="Prompt-level detail" />
          <Card className="p-5 mt-2">
            <Title
              hint={`${rows.length} prompts — click a row for the full answer`}
              right={<span className="text-[11px] text-slate-400">{agg.mentioned} mentioned · {agg.n - agg.mentioned} missing</span>}
            >
              All prompts in view
            </Title>
            <PromptsTable rows={rows} />
          </Card>
        </div>
      </div>
    </>
  );
}
