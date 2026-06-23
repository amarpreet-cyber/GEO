import { AtSign, Eye, Hash, EyeOff } from "lucide-react";
import { loadFiltered } from "@/lib/page";
import { hasData } from "@/lib/data";
import { jbool, jparse, num } from "@/lib/derive";
import {
  Card, Title, Section, PageHeader, NoData, MeterBar, Badge,
} from "@/components/ui";
import { DrillStat } from "@/components/DrillStat";
import PromptsTable, { type PromptRowVM } from "@/components/PromptsTable";
import { BRIEFS } from "@/lib/metricBriefs";
import type { DrillRow } from "@/lib/drill";
import type { SP } from "@/lib/filters";

const I = "w-3.5 h-3.5";

export default function Prompts({ searchParams }: { searchParams: SP }) {
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

  const missing = agg.n - agg.mentioned;

  // shared helper — mirrors the exemplar promptRow pattern
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
  const missingRows = filtered.filter((r) => !jbool(r.brand_mentioned));

  const dMentioned = { name: "Mentioned", value: agg.mentioned, color: "#22c55e" };
  const dMissing = { name: "Missing", value: missing, color: "#ef4444" };

  return (
    <>
      <PageHeader
        title="Prompt Library"
        subtitle={`Every tracked prompt and where ${brand} landed. Sort any column; click a row for the full answer.`}
        right={
          <div className="flex items-center gap-2">
            <Badge variant="neutral">{(summary?.generated_engines || []).join(" · ") || "claude"}</Badge>
            <Badge variant="brand">{agg.n} prompts</Badge>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Headline snapshot */}
        <div>
          <Section label="Snapshot" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger mt-2">
            <DrillStat
              label="Total in view"
              brief="Number of tracked prompts currently in view, after any active filters are applied."
              icon={<Hash className={I} />}
              value={agg.n}
              sub="tracked prompts"
              detail={{
                blurb: "All prompts in the current filtered view — mentioned and missing.",
                chart: { kind: "donut", data: [dMentioned, dMissing] },
                rowsTitle: "All prompts",
                rows: filtered.slice(0, 40).map(promptRow),
                href: "/prompts",
                hrefLabel: "Prompt Library",
              }}
            />
            <DrillStat
              label="Win rate"
              brief={BRIEFS.win_rate}
              icon={<AtSign className={I} />}
              value={agg.mention_rate}
              decimals={1}
              suffix="%"
              tone={agg.mention_rate >= 25 ? "good" : agg.mention_rate >= 10 ? "warn" : "bad"}
              footer={<MeterBar pct={agg.mention_rate} color={agg.mention_rate >= 25 ? "#22c55e" : "#f59e0b"} />}
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
              icon={<Eye className={I} />}
              value={agg.mentioned}
              accent="#22c55e"
              sub={`of ${agg.n} prompts in view`}
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
              label="Missing from"
              brief={BRIEFS.invisible}
              icon={<EyeOff className={I} />}
              value={missing}
              accent="#ef4444"
              tone="bad"
              sub="prompts with no mention"
              detail={{
                blurb: BRIEFS.invisible,
                chart: { kind: "donut", data: [dMissing, dMentioned] },
                rowsTitle: "Prompts where RISA is absent",
                rows: missingRows.slice(0, 40).map(promptRow),
                href: "/prompts/gaps",
                hrefLabel: "See opportunities",
              }}
            />
          </div>
        </div>

        {/* Prompt table */}
        <div>
          <Section label="All prompts" />
          <Card className="p-5 mt-2">
            <Title
              hint={`${rows.length} prompts in view — click a row for the full answer breakdown`}
              right={<span className="text-[11px] text-slate-400">{agg.mentioned} mentioned · {missing} missing</span>}
            >
              Prompt-level detail
            </Title>
            <PromptsTable rows={rows} />
          </Card>
        </div>
      </div>
    </>
  );
}
