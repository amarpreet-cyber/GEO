import Link from "next/link";
import { Eye, AtSign, PieChart, EyeOff, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import LoadMoreBanner from "@/components/LoadMoreBanner";
import { loadFiltered } from "@/lib/page";
import { getHistory, getScore, hasData } from "@/lib/data";
import { opportunities, groupVisibility, gradeFor, jbool, num } from "@/lib/derive";
import { activeCount } from "@/lib/filters";
import {
  Card, Title, Section, Badge, PageHeader, NoData, MeterBar,
  StackBar, Legend, ProgressRow, GradeChip,
} from "@/components/ui";
import { DrillStat } from "@/components/DrillStat";
import { PromptTrigger } from "@/components/PromptDrawerProvider";
import BrandRankBar from "@/components/BrandRankBar";
import { DrillVBar, DrillDonut } from "@/components/SegmentCharts";
import { Gauge, Trend } from "@/components/charts";
import { BRIEFS } from "@/lib/metricBriefs";
import type { DrillRow } from "@/lib/drill";
import type { SP } from "@/lib/filters";

const SENT_COLOR: Record<string, string> = { positive: "#0056D6", neutral: "#CA8A04", negative: "#ef4444", absent: "#D6D6D6" };
const CLASS_COLOR: Record<string, string> = { owned: "#10b981", earned: "#3b82f6", competitor: "#ef4444", social: "#5C5C5C" };

// Dismissible delta banner shown at the top of Overview after each new run.
// "use client" would make the whole page client — instead we write a small
// inline island pattern using a hidden checkbox for dismiss (no JS needed).
function DeltaBanner({ runLabel, scoreDelta, visDelta, runCount }: {
  runLabel: string; scoreDelta: number | null; visDelta: number | null; runCount: number;
}) {
  const up = (v: number | null) => v != null && v > 0;
  const dn = (v: number | null) => v != null && v < 0;
  return (
    <div className="mb-4 rounded-xl border px-4 py-3 flex items-center gap-3 no-print"
      style={{ background: "#EBF2FF", borderColor: "#0056D6" + "33" }}>
      <div className="w-7 h-7 rounded-lg grid place-items-center shrink-0" style={{ background: "#0056D6" }}>
        <TrendingUp className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 text-[13px] text-slate-700">
        <span className="font-semibold text-slate-800">Run #{runCount} complete · {runLabel}</span>
        {scoreDelta != null && (
          <span className={`ml-3 inline-flex items-center gap-0.5 font-semibold ${up(scoreDelta) ? "text-emerald-600" : dn(scoreDelta) ? "text-red-500" : "text-slate-400"}`}>
            {up(scoreDelta) ? <TrendingUp className="w-3.5 h-3.5" /> : dn(scoreDelta) ? <TrendingDown className="w-3.5 h-3.5" /> : null}
            GEO {scoreDelta > 0 ? "+" : ""}{scoreDelta}
          </span>
        )}
        {visDelta != null && (
          <span className={`ml-3 inline-flex items-center gap-0.5 font-semibold ${up(visDelta) ? "text-emerald-600" : dn(visDelta) ? "text-red-500" : "text-slate-400"}`}>
            Visibility {visDelta > 0 ? "+" : ""}{visDelta}
          </span>
        )}
      </div>
      <Link href="/report" className="text-[12px] font-semibold shrink-0" style={{ color: "#0056D6" }}>
        View report →
      </Link>
    </div>
  );
}

export default function Overview({ searchParams }: { searchParams: SP }) {
  if (!hasData()) return <NoData />;
  const { filtered, brand, agg, actionsByPrompt, all, f, summary } = loadFiltered(searchParams);
  const history = getHistory();
  const score = getScore();

  const sov = agg.sov.slice(0, 9).map((s) => ({ name: s.name, value: +s.share.toFixed(1), isBrand: s.isBrand, meta: `${s.count} mentions` }));
  const sentOrder = ["positive", "neutral", "negative", "absent"];
  const sent = sentOrder.filter((k) => agg.sent[k]).map((name) => ({ name, value: agg.sent[name], color: SENT_COLOR[name] }));
  const persona = groupVisibility(filtered, "persona");
  const intent = groupVisibility(filtered, "intent");
  const idxOf = new Map(all.map((r, i) => [r.prompt, i]));
  const opps = opportunities(filtered, actionsByPrompt).slice(0, 6);
  const heroVal = score?.geo_score ?? agg.visibility;
  const heroLabel = score ? "Composite GEO Score" : "Visibility Score";
  const brandRank = agg.sov.findIndex((s) => s.isBrand) + 1;
  const brandSov = agg.sov.find((s) => s.isBrand)?.share || 0;
  const posShare = agg.n ? (100 * (agg.sent.positive || 0)) / agg.n : 0;

  const clsTot = Object.values(agg.cls).reduce((a, b) => a + b, 0) || 1;
  const citeSegs = ["owned", "earned", "competitor", "social"].map((k) => ({ label: k, value: agg.cls[k] || 0, color: CLASS_COLOR[k] }));
  const ownedEarned = (((agg.cls.owned || 0) + (agg.cls.earned || 0)) / clsTot) * 100;

  // ── drill-down breakdowns (level 2 chart + level 3 raw rows), all from real data ──
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
    label: `${i + 1}. ${s.name}`, sub: s.isBrand ? "RISA" : "competitor",
    value: `${s.share.toFixed(1)}% · ${s.count}`, tag: s.isBrand ? "you" : undefined, tagColor: "#0056D6",
    href: s.isBrand ? undefined : "/visibility/share-of-voice",
  }));
  const personaBar = persona.map((p) => ({ name: p.name, value: p.visibility }));

  const dMentioned = { name: "Mentioned", value: agg.mentioned, color: "#0056D6" };
  const dMissing = { name: "Missing", value: agg.n - agg.mentioned, color: "#ef4444" };

  // trends + deltas vs previous run — only meaningful unfiltered (history is unfiltered)
  const live = activeCount(f) === 0 && history.length > 1;
  const ser = (k: string) => history.map((h) => Number((h as Record<string, unknown>)[k])).filter((v) => !isNaN(v));
  const d = (k: string) => { const s = ser(k); return s.length > 1 ? +(s[s.length - 1] - s[s.length - 2]).toFixed(1) : null; };
  const I = "w-3.5 h-3.5";

  // Delta banner — show what changed in the most recent run vs the one before it
  const curr = history.length > 0 ? history[history.length - 1] : null;
  const prev = history.length > 1 ? history[history.length - 2] : null;
  const scoreDelta = curr?.geo_score != null && prev?.geo_score != null ? +(curr.geo_score - prev.geo_score).toFixed(1) : null;
  const visDelta = curr && prev ? +(curr.visibility_score - prev.visibility_score).toFixed(1) : null;
  const runLabel = curr?.ts ? new Date(curr.ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

  return (
    <>
      {/* Delta banner — shown when there are 2+ runs and no filters active */}
      {live && runLabel && (scoreDelta != null || visDelta != null) && (
        <DeltaBanner runLabel={runLabel} scoreDelta={scoreDelta} visDelta={visDelta} runCount={history.length} />
      )}

      {/* Load-more banner — shown on first run if < 50 prompts (quick preview run) */}
      {!live && summary && summary.prompts_count < 50 && summary.prompts_count > 0 && (
        <LoadMoreBanner promptCount={summary.prompts_count} />
      )}

      <PageHeader
        title="Answer-Engine Overview"
        subtitle={`How ${brand} shows up when oncology buyers ask AI engines`}
        right={
          <div className="flex items-center gap-2">
            <Badge variant="neutral">{(summary?.generated_engines || []).join(" · ") || "claude"}</Badge>
            <Badge variant="brand">{agg.n} prompts in view</Badge>
          </div>
        }
      />

      <div className="space-y-6">
        {/* ── Headline metrics ── */}
        <div>
          <Section label="Headline metrics" />
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 stagger mt-2">
            <DrillStat label="Visibility" brief={BRIEFS.visibility} icon={<Eye className={I} />} value={agg.visibility} decimals={1} unit="/100"
              delta={live ? d("visibility_score") : undefined}
              footer={<MeterBar pct={agg.visibility} color="#0056D6" />}
              detail={{ blurb: BRIEFS.visibility, chart: { kind: "bar", data: personaBar }, rowsTitle: "Prompts in view", rows: filtered.slice(0, 40).map(promptRow), href: "/visibility", hrefLabel: "Open Visibility" }} />
            <DrillStat label="Mention rate" brief={BRIEFS.mention_rate} icon={<AtSign className={I} />} value={agg.mention_rate} decimals={1} suffix="%"
              delta={live ? d("mention_rate") : undefined}
              footer={<MeterBar pct={agg.mention_rate} color="#0056D6" />}
              detail={{ blurb: BRIEFS.mention_rate, chart: { kind: "donut", data: [dMentioned, dMissing] }, rowsTitle: "Prompts with no mention", rows: missing.slice(0, 40).map(promptRow), href: "/prompts/gaps", hrefLabel: "See opportunities" }} />
            <DrillStat label="Share of voice" brief={BRIEFS.sov} icon={<PieChart className={I} />} value={brandSov} decimals={1} suffix="%"
              delta={live ? d("brand_share_of_voice") : undefined}
              sub={`#${brandRank > 0 ? brandRank : "—"} of ${agg.sov.length} brands tracked`}
              detail={{ blurb: BRIEFS.sov, chart: { kind: "bar", unit: "%", data: sovBar }, rowsTitle: "Brand mentions ranked", rows: sovRows, href: "/visibility/share-of-voice", hrefLabel: "Open Share of Voice" }} />
            <DrillStat label="Invisible on" brief={BRIEFS.invisible} icon={<EyeOff className={I} />} value={agg.n - agg.mentioned} tone="bad"
              sub={`of ${agg.n} prompts have no RISA mention`}
              detail={{ blurb: BRIEFS.invisible, chart: { kind: "donut", data: [dMissing, dMentioned] }, rowsTitle: "Where RISA is invisible", rows: missing.slice(0, 40).map(promptRow), href: "/prompts/gaps", hrefLabel: "See opportunities" }} />
          </div>
        </div>

        {/* ── Score & competitive standing ── */}
        <div>
          <Section label="Score & competitive standing" />
          <div className="grid grid-cols-12 gap-5 mt-2">
            <Card className="col-span-12 lg:col-span-5 p-5 flex flex-col">
              <Title brief={score ? BRIEFS.geo_score : BRIEFS.visibility}
                right={<GradeChip grade={score?.grade || gradeFor(heroVal)} />}>
                {heroLabel}
              </Title>
              <Gauge value={heroVal} />
              <div className="mt-3 space-y-1.5">
                {score ? (
                  Object.entries(score.subscores).map(([k, v]) => (
                    <ProgressRow key={k} label={<span className="capitalize">{k}</span>} value={v} />
                  ))
                ) : (
                  <>
                    <ProgressRow label="Mention rate" value={agg.mention_rate} suffix="%" />
                    <ProgressRow label="Share of voice" value={brandSov} suffix="%" />
                    <ProgressRow label="Positive share" value={posShare} suffix="%" color="#22c55e" />
                    <ProgressRow label="Cited authority" value={ownedEarned} suffix="%" color="#3b82f6" />
                  </>
                )}
              </div>
              <div className="mt-auto pt-3 border-t border-slate-100">
                <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Trend over runs</div>
                <Trend data={history} />
              </div>
            </Card>

            <Card className="col-span-12 lg:col-span-7 p-5">
              <Title brief={BRIEFS.sov}
                right={brandRank > 0
                  ? <Badge variant="brand">RISA ranks #{brandRank}</Badge>
                  : <Link href="/visibility/share-of-voice" className="text-[12px] text-brand hover:underline inline-flex items-center gap-1">full leaderboard <ArrowRight className="w-3 h-3" /></Link>}>
                Share of Voice
              </Title>
              <BrandRankBar items={sov} />
            </Card>
          </div>
        </div>

        {/* ── How AI answers read ── */}
        <div>
          <Section label="How AI answers read" />
          <div className="grid grid-cols-12 gap-5 mt-2">
            <Card className="col-span-12 lg:col-span-4 p-5">
              <Title brief={BRIEFS.sentiment}>Sentiment</Title>
              <DrillDonut data={sent} field="sentiment" height={200} total={agg.n} totalLabel="answers" />
              <div className="mt-3"><Legend items={sent.map((e) => ({ label: e.name, color: e.color, value: e.value }))} /></div>
            </Card>
            <Card className="col-span-12 lg:col-span-4 p-5"><Title brief="Visibility by buyer persona. Click a bar to see those prompts.">By Persona</Title><DrillVBar data={persona} field="persona" height={210} /></Card>
            <Card className="col-span-12 lg:col-span-4 p-5"><Title brief="Visibility by query intent. Click a bar to see those prompts.">By Intent</Title><DrillVBar data={intent} field="intent" height={210} /></Card>
          </div>
        </div>

        {/* ── Where to act ── */}
        <div>
          <Section label="Where to act" />
          <div className="grid grid-cols-12 gap-5 mt-2">
            <Card className="col-span-12 lg:col-span-7 p-5">
              <Title brief="The highest-value prompts where RISA is absent and competitors win the answer."
                right={<Link href="/prompts/gaps" className="text-xs text-brand hover:underline inline-flex items-center gap-1">all opportunities <ArrowRight className="w-3 h-3" /></Link>}>
                Top Opportunities
              </Title>
              <div className="space-y-2">
                {opps.map((o, i) => (
                  <div key={i} className="flex items-start gap-3 border border-slate-200 rounded-lg p-3 ds-card-hover">
                    <div className="text-lg font-semibold text-brand tnum w-6 text-center shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ink font-medium leading-snug">{o.prompt}</div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <Badge variant="neutral">{o.persona.toUpperCase()}</Badge>
                        <Badge variant="brand">{o.intent}</Badge>
                        <span className="text-[11px] text-slate-400">winning:</span>
                        {o.comps.slice(0, 4).map((c) => <Badge key={c} variant="competitor">{c}</Badge>)}
                        {o.comps.length === 0 && <span className="text-[11px] text-slate-400">no named vendors</span>}
                      </div>
                    </div>
                    {idxOf.has(o.prompt) && <PromptTrigger id={idxOf.get(o.prompt)!} className="text-xs text-slate-600 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg shrink-0 transition">View</PromptTrigger>}
                  </div>
                ))}
                {opps.length === 0 && <p className="text-sm text-slate-400">No unmentioned prompts in the current filter.</p>}
              </div>
            </Card>

            <Card className="col-span-12 lg:col-span-5 p-5 flex flex-col">
              <Title brief={BRIEFS.authority_pct}
                right={<Link href="/citations" className="text-xs text-brand hover:underline">details →</Link>}>
                Citation Authority
              </Title>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-[28px] font-semibold text-ink tnum leading-none">{ownedEarned.toFixed(0)}%</span>
                <span className="text-xs text-slate-400">owned + earned of {clsTot} citations</span>
              </div>
              <StackBar segments={citeSegs} height={14} />
              <div className="mt-3"><Legend items={citeSegs.filter((s) => s.value > 0).map((s) => ({ label: s.label, color: s.color, value: s.value }))} /></div>
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
                {(summary?.citations?.top_domains || []).slice(0, 5).map((dm) => (
                  <div key={dm.domain} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: CLASS_COLOR[dm.class] || "#D6D6D6" }} />
                    <span className="flex-1 truncate text-slate-700">{dm.domain}</span>
                    <span className="tnum text-slate-500 text-xs">{dm.citations}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
