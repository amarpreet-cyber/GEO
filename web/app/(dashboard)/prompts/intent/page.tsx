import Link from "next/link";
import { Compass, Swords, BadgeCheck, ArrowRight } from "lucide-react";
import { loadFiltered } from "@/lib/page";
import { hasData } from "@/lib/data";
import { jbool, jparse, groupVisibility } from "@/lib/derive";
import { Card, Title, Section, PageHeader, NoData, Badge, MeterBar } from "@/components/ui";
import { DrillStat } from "@/components/DrillStat";
import { PromptTrigger } from "@/components/PromptDrawerProvider";
import { VBar } from "@/components/charts";
import type { DrillRow } from "@/lib/drill";
import type { SP } from "@/lib/filters";

const INTENT_META: Record<string, {
  icon: typeof Compass; label: string; blurb: string; accent: string;
}> = {
  discovery: {
    icon: Compass,
    label: "Discovery",
    blurb: "Top of funnel. Buyers asking how to solve a problem before they know vendors. The biggest, hardest prize.",
    accent: "#0056D6",
  },
  comparison: {
    icon: Swords,
    label: "Comparison",
    blurb: "Head-to-head. Buyers comparing named vendors. Absence here means a competitor wins the shortlist.",
    accent: "#CA8A04",
  },
  brand: {
    icon: BadgeCheck,
    label: "Brand",
    blurb: "Bottom of funnel. Buyers asking about RISA by name. You should own these outright.",
    accent: "#22c55e",
  },
};

const INTENT_ORDER = ["discovery", "comparison", "brand"];

export default function ByIntent({ searchParams }: { searchParams: SP }) {
  if (!hasData()) return <NoData />;
  const { filtered, all, summary, brand } = loadFiltered(searchParams);
  const idxOf = new Map(all.map((r, i) => [r.prompt, i]));
  const byIntent = summary?.by_intent || {};

  // comparison battleground: head-to-head prompts where RISA is absent
  const battleground = filtered
    .filter((r) => r.intent === "comparison" && !jbool(r.brand_mentioned))
    .map((r) => ({ ...r, comps: jparse(r.competitors_present) }))
    .sort((a, b) => b.comps.length - a.comps.length);

  // VBar data for all intents (from live filtered data)
  const intentVis = groupVisibility(filtered, "intent");

  // promptRow helper
  const promptHref = (p: string) => (idxOf.has(p) ? `/prompts/${idxOf.get(p)}` : undefined);
  const promptRow = (r: typeof filtered[number]): DrillRow => ({
    label: r.prompt,
    sub: `${(r.persona || "").toUpperCase()}${r.intent ? " · " + r.intent : ""}`,
    href: promptHref(r.prompt),
    value: jbool(r.brand_mentioned) ? "mentioned" : "absent",
  });

  return (
    <>
      <PageHeader
        title="Visibility by Intent"
        subtitle="Discovery and comparison are where buying decisions are seeded. Brand queries are where they close."
        right={
          <div className="flex items-center gap-2">
            {INTENT_ORDER.map((k) => {
              const v = byIntent[k];
              if (!v) return null;
              return (
                <Badge key={k} variant="neutral">
                  {k}: {v.prompts}
                </Badge>
              );
            })}
          </div>
        }
      />

      <div className="space-y-6">
        {/* Intent tiles */}
        <div>
          <Section label="Intent breakdown" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger mt-2">
            {INTENT_ORDER.map((k) => {
              const v = byIntent[k];
              const m = INTENT_META[k];
              if (!v || !m) return null;

              const tone = v.visibility_score >= 50 ? "good" as const : v.visibility_score >= 15 ? "warn" as const : "bad" as const;
              const mentionedCount = Math.round((v.mention_rate / 100) * v.prompts);
              const missingCount = v.prompts - mentionedCount;

              // per-intent rows from live filtered data
              const intentRows = filtered
                .filter((r) => r.intent === k)
                .slice(0, 40)
                .map(promptRow);

              const dMentioned = { name: "Mentioned", value: mentionedCount, color: "#22c55e" };
              const dMissing = { name: "Missing", value: missingCount, color: "#ef4444" };

              return (
                <DrillStat
                  key={k}
                  label={m.label}
                  brief={m.blurb}
                  value={v.visibility_score}
                  decimals={0}
                  unit="/100"
                  accent={m.accent}
                  tone={tone}
                  sub={`${v.prompts} prompts · ${v.mention_rate.toFixed(0)}% mention rate`}
                  footer={<MeterBar pct={v.visibility_score} color={m.accent} />}
                  detail={{
                    blurb: m.blurb,
                    chart: { kind: "donut", data: [dMentioned, dMissing] },
                    rowsTitle: `${m.label} prompts (${intentRows.length})`,
                    rows: intentRows,
                    href: "/prompts/intent",
                    hrefLabel: "Open Intent view",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Intent visibility chart (live data) */}
        {intentVis.length > 0 && (
          <div>
            <Section label="Visibility by intent" />
            <Card className="p-5 mt-2">
              <Title brief="Rank-weighted visibility score per intent type, computed from the current filtered set.">
                Intent visibility (current view)
              </Title>
              <VBar data={intentVis} height={200} />
            </Card>
          </div>
        )}

        {/* Comparison battleground */}
        <div>
          <Section
            label="Comparison battleground"
            right={
              <Link
                href="/prompts/gaps"
                className="text-[11px] text-brand hover:underline inline-flex items-center gap-1"
              >
                all opportunities <ArrowRight className="w-3 h-3" />
              </Link>
            }
          />
          <Card className="p-5 mt-2">
            <Title
              brief="Comparison prompts where at least one competitor is named and RISA is absent. The shortlist you are losing."
              right={
                battleground.length > 0
                  ? <Badge variant="danger">{battleground.length} lost</Badge>
                  : <Badge variant="success">none lost</Badge>
              }
            >
              <span className="flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-yellow-600" />
                Head-to-head where {brand} is absent
              </span>
            </Title>

            <div className="space-y-2">
              {battleground.map((r) => (
                <PromptTrigger
                  key={r.prompt}
                  id={idxOf.get(r.prompt) ?? 0}
                  className="w-full text-left flex items-start gap-3 border border-slate-200 rounded-lg p-3 hover:border-brand/40 hover:bg-brand-light/40 transition press ds-card-hover"
                >
                  <Swords className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink font-medium leading-snug">{r.prompt}</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <Badge>{r.persona?.toUpperCase()}</Badge>
                      {r.comps.length > 0 && (
                        <>
                          <span className="text-[11px] text-slate-400">winning:</span>
                          {r.comps.slice(0, 5).map((c) => <Badge key={c} variant="competitor">{c}</Badge>)}
                        </>
                      )}
                      {r.comps.length === 0 && (
                        <span className="text-[11px] text-slate-400">no named vendor</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-1" />
                </PromptTrigger>
              ))}

              {battleground.length === 0 && (
                <div className="py-8 text-center">
                  <div className="text-sm text-slate-500">
                    No unmentioned comparison prompts in view. That is a good place to be.
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
