import { Cpu, Plus, Check } from "lucide-react";
import { loadFiltered } from "@/lib/page";
import { hasData } from "@/lib/data";
import { Card, Title, Section, PageHeader, NoData, ProgressRow, Badge, MeterBar } from "@/components/ui";
import { DrillStat } from "@/components/DrillStat";
import { GroupBar } from "@/components/charts";
import { BRIEFS } from "@/lib/metricBriefs";
import type { DrillRow } from "@/lib/drill";
import type { SP } from "@/lib/filters";

const VIS = "#0056D6";
const MEN = "#6FA8DC";
const I = "w-3.5 h-3.5";

// Engines the architecture supports. Live ones come from summary.generated_engines.
// This list is a capability manifest, not a metric — hardcoding is intentional.
const PLUGGABLE = [
  { id: "claude", label: "Claude + web search", note: "answers carry real web citations" },
  { id: "openai", label: "ChatGPT (GPT)", note: "subclass Engine, register, add to ENGINES" },
  { id: "perplexity", label: "Perplexity", note: "citation-native answer engine" },
  { id: "gemini", label: "Gemini / AI Overviews", note: "Google surface" },
];

export default function Engines({ searchParams }: { searchParams: SP }) {
  if (!hasData()) return <NoData />;
  const { summary } = loadFiltered(searchParams);
  const live = new Set(summary?.generated_engines || []);
  const byEngine = Object.entries(summary?.by_engine || {}).map(([name, v]) => ({
    name,
    visibility: +v.visibility_score.toFixed(1),
    mention: +v.mention_rate.toFixed(1),
    prompts: v.prompts,
    avg: v.avg_position,
  }));

  const topEngine = [...byEngine].sort((a, b) => b.visibility - a.visibility)[0];

  // ── drill helpers ──
  const engineBar = byEngine.map((e) => ({ name: e.name, value: e.visibility }));
  const engineRows: DrillRow[] = byEngine.map((e, i) => ({
    label: `${i + 1}. ${e.name}`,
    sub: `${e.prompts} prompts`,
    value: `${e.visibility}/100 · ${e.mention.toFixed(0)}% mention`,
    href: "/visibility/engines",
  }));

  return (
    <>
      <PageHeader
        title="Per-Engine Visibility"
        subtitle="RISA's standing in each answer engine. Adding an engine adds a column here."
      />

      <div className="space-y-6">
        {/* ── Headline metrics ── */}
        <div>
          <Section label="Headline metrics" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger mt-2">
            <DrillStat
              label="Engines live"
              brief={BRIEFS.engines_live}
              icon={<Cpu className={I} />}
              value={live.size}
              sub={`of ${PLUGGABLE.length} supported`}
              accent="var(--brand)"
              detail={{ blurb: BRIEFS.engines_live, chart: { kind: "bar", unit: "/100", data: engineBar }, rowsTitle: "Live engines", rows: engineRows }}
            />
            {byEngine.slice(0, 3).map((e) => {
              const thisEngineRows: DrillRow[] = [{
                label: e.name,
                sub: `${e.prompts} prompts`,
                value: `${e.visibility}/100`,
              }, {
                label: "Mention rate",
                value: `${e.mention.toFixed(0)}%`,
              }, {
                label: "Avg position",
                value: e.avg != null ? `#${e.avg}` : "n/a",
              }];
              return (
                <DrillStat
                  key={e.name}
                  label={e.name}
                  brief={`Visibility score for the ${e.name} engine across ${e.prompts} tracked prompts.`}
                  value={e.visibility}
                  decimals={1}
                  unit="/100"
                  accent="#0056D6"
                  tone={e.visibility >= 40 ? "good" : e.visibility >= 15 ? "warn" : "bad"}
                  sub={`${e.mention.toFixed(0)}% mention · ${e.prompts} prompts`}
                  footer={<MeterBar pct={e.visibility} color="#0056D6" />}
                  detail={{ blurb: `Visibility score for the ${e.name} engine across ${e.prompts} tracked prompts.`, chart: { kind: "bar", unit: "/100", data: engineBar }, rowsTitle: `${e.name} metrics`, rows: thisEngineRows }}
                />
              );
            })}
          </div>
        </div>

        {/* ── Engine comparison ── */}
        <div>
          <Section label="Engine comparison" />
          <div className="grid grid-cols-12 gap-5 stagger mt-2">
            <Card className="col-span-12 lg:col-span-7 p-5">
              <Title
                brief="Visibility vs mention rate per engine. Side-by-side view fills out as you enable more engines."
                right={topEngine ? <Badge variant="brand">Top: {topEngine.name}</Badge> : undefined}
              >
                Visibility vs Mention rate
              </Title>
              {byEngine.length ? (
                <>
                  <GroupBar
                    data={byEngine}
                    keys={[
                      { key: "visibility", color: VIS, label: "Visibility" },
                      { key: "mention", color: MEN, label: "Mention %" },
                    ]}
                    height={byEngine.length > 1 ? 260 : 200}
                  />
                  {byEngine.length === 1 && (
                    <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                      Single engine today (Claude + web search). The chart fills out as you enable more, no schema change needed.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400">No engine rollups yet.</p>
              )}
            </Card>

            <Card className="col-span-12 lg:col-span-5 p-5">
              <Title brief="The multi-engine roadmap, wired to the existing registry. Live engines show data; ready engines need ENGINES env var.">
                Engine coverage
              </Title>
              <div className="space-y-2">
                {PLUGGABLE.map((e) => {
                  const on = live.has(e.id);
                  return (
                    <div
                      key={e.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition ${on ? "border-brand/30 bg-brand-light/50" : "border-slate-200"}`}
                    >
                      <span className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${on ? "bg-brand text-white" : "bg-slate-100 text-slate-400"}`}>
                        {on ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink">{e.label}</div>
                        <div className="text-[11px] text-slate-400 truncate">{e.note}</div>
                      </div>
                      <Badge variant={on ? "brand" : "neutral"}>{on ? "live" : "ready"}</Badge>
                    </div>
                  );
                })}
              </div>
              <code className="block mt-4 text-[11px] font-mono bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-2 rounded-lg">
                ENGINES=claude,openai,perplexity
              </code>
            </Card>
          </div>
        </div>

        {/* ── Engine detail ── */}
        {byEngine.length > 0 && (
          <div>
            <Section label="Engine detail" />
            <Card className="p-5 mt-2">
              <Title brief="Visibility score and average mention position per engine.">
                Per-engine metrics
              </Title>
              <div className="space-y-3">
                {byEngine.map((e) => (
                  <div key={e.name} className="grid grid-cols-12 items-center gap-3">
                    <span className="col-span-3 text-sm font-medium text-slate-700 capitalize">{e.name}</span>
                    <div className="col-span-7">
                      <ProgressRow label="visibility" value={e.visibility} labelWidth="w-20" />
                    </div>
                    <span className="col-span-2 text-right text-xs text-slate-400 tnum">avg pos {e.avg ?? "—"}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
