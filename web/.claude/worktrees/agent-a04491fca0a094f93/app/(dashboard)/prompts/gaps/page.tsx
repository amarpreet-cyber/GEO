import Link from "next/link";
import { Target, Swords, ArrowRight } from "lucide-react";
import { loadFiltered } from "@/lib/page";
import { hasData } from "@/lib/data";
import { opportunities, groupVisibility, jbool } from "@/lib/derive";
import { Card, Title, Section, PageHeader, NoData, Badge, ScorePill, MeterBar } from "@/components/ui";
import { DrillStat } from "@/components/DrillStat";
import { BRIEFS } from "@/lib/metricBriefs";
import type { DrillRow } from "@/lib/drill";
import type { SP } from "@/lib/filters";

const I = "w-3.5 h-3.5";

export default function Opportunities({ searchParams }: { searchParams: SP }) {
  if (!hasData()) return <NoData />;
  const { filtered, all, actionsByPrompt, brand } = loadFiltered(searchParams);
  const idxOf = new Map(all.map((r, i) => [r.prompt, i]));
  const opps = opportunities(filtered, actionsByPrompt);
  const maxS = opps[0]?.score || 1;

  // headline stats
  const totalOpps = opps.length;
  const highIntent = opps.filter((o) => o.intent === "comparison" || o.intent === "discovery").length;
  const withComps = opps.filter((o) => o.comps.length > 0).length;
  const topIntent = opps[0]?.intent || "";

  // HBar: opportunity count by intent
  const byIntentMap: Record<string, number> = {};
  opps.forEach((o) => { byIntentMap[o.intent] = (byIntentMap[o.intent] || 0) + 1; });
  const intentBar = Object.entries(byIntentMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // rows for each tile
  const promptHref = (p: string) => (idxOf.has(p) ? `/prompts/${idxOf.get(p)}` : undefined);

  const oppRow = (o: typeof opps[number]): DrillRow => ({
    label: o.prompt,
    sub: `${o.persona.toUpperCase()} · ${o.intent}${o.comps.length > 0 ? " · vs " + o.comps.slice(0, 2).join(", ") : ""}`,
    href: promptHref(o.prompt),
    value: o.comps.length > 0 ? `${o.comps.length} competitor${o.comps.length !== 1 ? "s" : ""}` : "no vendor",
  });

  const highIntentRow = (o: typeof opps[number]): DrillRow => ({
    label: o.prompt,
    sub: `${o.persona.toUpperCase()} · ${o.intent}`,
    href: promptHref(o.prompt),
    value: o.intent,
  });

  const competitiveRow = (o: typeof opps[number]): DrillRow => ({
    label: o.prompt,
    sub: `${o.persona.toUpperCase()} · ${o.intent}`,
    href: promptHref(o.prompt),
    value: o.comps.slice(0, 2).join(", ") || "gap",
  });

  const highIntentOpps = opps.filter((o) => o.intent === "comparison" || o.intent === "discovery");
  const competitiveOpps = opps.filter((o) => o.comps.length > 0);

  return (
    <>
      <PageHeader
        title="Opportunities"
        subtitle={`Prompts where ${brand} is absent, ranked by funnel value and competitor density.`}
        right={
          totalOpps > 0
            ? <Badge variant="danger">{totalOpps} open gap{totalOpps !== 1 ? "s" : ""}</Badge>
            : <Badge variant="success">No gaps</Badge>
        }
      />

      <div className="space-y-6">
        {/* Headline snapshot */}
        <div>
          <Section label="Gap overview" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 stagger mt-2">
            <DrillStat
              label="Open opportunities"
              brief="Total prompts where the AI answer does not mention RISA. These are the gaps to close."
              icon={<Target className={I} />}
              value={totalOpps}
              accent="#ef4444"
              tone={totalOpps > 10 ? "bad" : totalOpps > 3 ? "warn" : "good"}
              sub="prompts with no mention"
              detail={{
                blurb: "All prompts where RISA is absent, ranked by funnel weight and competitor density.",
                chart: intentBar.length > 0 ? { kind: "bar", unit: "", data: intentBar } : undefined,
                rowsTitle: "All open gaps",
                rows: opps.slice(0, 40).map(oppRow),
                href: "/prompts/gaps",
                hrefLabel: "Open Opportunities",
              }}
            />
            <DrillStat
              label="High-intent gaps"
              brief="Discovery and comparison prompts where RISA is absent — the highest-value funnel positions."
              icon={<Swords className={I} />}
              value={highIntent}
              accent="#f59e0b"
              tone={highIntent > 5 ? "bad" : "warn"}
              sub="discovery + comparison"
              detail={{
                blurb: "Discovery and comparison prompts are the highest-value funnel positions. These are the gaps that matter most.",
                chart: intentBar.length > 0 ? { kind: "bar", unit: "", data: intentBar } : undefined,
                rowsTitle: "High-intent gaps",
                rows: highIntentOpps.slice(0, 40).map(highIntentRow),
                href: "/prompts/gaps",
                hrefLabel: "Open Opportunities",
              }}
            />
            <DrillStat
              label="Competitive gaps"
              brief="Gaps where at least one named competitor is winning the AI answer — the most urgent prompts."
              icon={<ArrowRight className={I} />}
              value={withComps}
              accent="#ef4444"
              tone="bad"
              sub="gaps a competitor wins"
              detail={{
                blurb: "Prompts where a competitor is named in the AI answer and RISA is absent. The most urgent gaps to close.",
                chart: intentBar.length > 0 ? { kind: "bar", unit: "", data: intentBar } : undefined,
                rowsTitle: "Competitive gaps",
                rows: competitiveOpps.slice(0, 40).map(competitiveRow),
                href: "/prompts/gaps",
                hrefLabel: "Open Opportunities",
              }}
            />
          </div>
        </div>

        {/* Ranked gap list */}
        <div>
          <Section
            label="Ranked gaps"
            right={
              topIntent
                ? <span className="text-[11px] text-slate-400">top intent: <span className="font-semibold text-slate-600">{topIntent}</span></span>
                : undefined
            }
          />
          <Card className="p-5 mt-2">
            <Title
              brief="Unmentioned prompts ranked by intent weight (comparison=3, discovery=3, brand=1) multiplied by competitor density."
              right={<span className="text-[11px] text-slate-400">{opps.length} ranked</span>}
            >
              Worklist
            </Title>
            <div className="space-y-2">
              {opps.map((o, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 border border-slate-200 rounded-lg p-3 ds-card-hover"
                >
                  {/* rank + score bar */}
                  <div className="w-10 shrink-0 text-center">
                    <div className="text-lg font-bold text-brand tnum leading-none">{i + 1}</div>
                    <div className="mt-1.5">
                      <MeterBar pct={(100 * o.score) / maxS} color="var(--brand)" />
                    </div>
                    <ScorePill value={Math.round(o.score)} thresholds={[2, 4]} />
                  </div>

                  {/* content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink font-medium leading-snug">{o.prompt}</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <Badge variant="neutral">{o.persona.toUpperCase()}</Badge>
                      <Badge variant="brand">{o.intent}</Badge>
                      {o.comps.length > 0 && (
                        <>
                          <span className="text-[11px] text-slate-400">winning:</span>
                          {o.comps.slice(0, 4).map((c) => <Badge key={c} variant="competitor">{c}</Badge>)}
                          {o.comps.length > 4 && (
                            <span className="text-[11px] text-slate-400">+{o.comps.length - 4} more</span>
                          )}
                        </>
                      )}
                      {o.comps.length === 0 && (
                        <span className="text-[11px] text-slate-400">no named vendors</span>
                      )}
                    </div>
                    {o.action && (
                      <div className="flex items-start gap-1.5 mt-2 text-xs text-slate-500">
                        <span className="text-amber-500 shrink-0 mt-0.5">&#9654;</span>
                        <span>{o.action}</span>
                      </div>
                    )}
                  </div>

                  {/* view link */}
                  {idxOf.has(o.prompt) && (
                    <Link
                      href={`/prompts/${idxOf.get(o.prompt)}`}
                      className="text-xs text-slate-600 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg shrink-0 h-fit transition"
                    >
                      View
                    </Link>
                  )}
                </div>
              ))}

              {opps.length === 0 && (
                <div className="py-10 text-center">
                  <div className="text-[28px] mb-2">&#127881;</div>
                  <div className="text-sm font-semibold text-ink">No gaps in the current filter</div>
                  <p className="text-[12px] text-slate-400 mt-1">
                    RISA is mentioned in every tracked prompt. Try widening your filter.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
