import Link from "next/link";
import { Swords, FileText, Quote, Zap, ArrowRight, TrendingDown } from "lucide-react";
import { loadFiltered } from "@/lib/page";
import { getCitations, getCitability, hasData } from "@/lib/data";
import { jbool, jparse } from "@/lib/derive";
import {
  Section, PageHeader, NoData, Badge, EmptyState,
} from "@/components/ui";
import ActivateQueue, { type Insight } from "@/components/ActivateQueue";
import { DrillStat } from "@/components/DrillStat";
import type { DrillDetail, DrillRow } from "@/lib/drill";
import type { SP } from "@/lib/filters";

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return "i" + (h >>> 0).toString(36);
}

const KIND_META = {
  competitor_win: {
    icon: Swords,
    color: "#ef4444",
    bg: "#fff1f2",
    label: "Competitor win",
    brief: "A rival wins a comparison prompt where RISA is absent. Route a persona-matched sequence through RizzA.",
    route: "rizza" as const,
  },
  citation_gap: {
    icon: Quote,
    color: "#3b82f6",
    bg: "#eff6ff",
    label: "Citation gap",
    brief: "A competitor-owned domain earns citations that RISA does not. Queue a PR or placement task in HubSpot.",
    route: "hubspot" as const,
  },
  content_gap: {
    icon: FileText,
    color: "#CA8A04",
    bg: "#fffbeb",
    label: "Content gap",
    brief: "An owned page scores too low to earn AI citations. Rewrite it answer-first with hard stats.",
    route: "hubspot" as const,
  },
};

export default function Activate({ searchParams }: { searchParams: SP }) {
  if (!hasData()) return <NoData />;
  const { all } = loadFiltered(searchParams);
  const insights: Insight[] = [];

  // build idxOf so competitor-win rows link to /prompts/{index}
  const idxOf = new Map(all.map((r, i) => [r.prompt, i]));

  // 1) competitor_win
  const compWins = all
    .filter((r) => r.intent === "comparison" && !jbool(r.brand_mentioned))
    .map((r) => ({ r, comps: jparse(r.competitors_present) }))
    .filter((x) => x.comps.length)
    .sort((a, b) => b.comps.length - a.comps.length)
    .slice(0, 6);

  compWins.forEach(({ r, comps }) =>
    insights.push({
      id: hash("cw" + r.prompt),
      kind: "competitor_win",
      title: `${comps[0]} wins "${r.prompt.slice(0, 64)}${r.prompt.length > 64 ? "..." : ""}"`,
      detail: `${r.persona?.toUpperCase()} comparison prompt. ${comps.slice(0, 3).join(", ")} named, RISA absent. Trigger a ${r.persona?.toUpperCase()} sequence countering this.`,
      target: "rizza",
      action: `${r.persona?.toUpperCase()} sequence`,
    })
  );

  // 2) citation_gap
  const citationGaps = getCitations()
    .filter((c) => c.class === "competitor")
    .map((c) => ({ domain: c.domain, n: Number(c.citations) }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 4);

  citationGaps.forEach((c) =>
    insights.push({
      id: hash("cg" + c.domain),
      kind: "citation_gap",
      title: `${c.domain} cited ${c.n}x, RISA absent`,
      detail: `A competitor-owned domain the engine trusts. Queue a placement or counter-content task to earn comparable authority.`,
      target: "hubspot",
      action: "PR / placement task",
    })
  );

  // 3) content_gap
  const contentGaps = (getCitability()?.pages || [])
    .filter((p) => p.score < 70)
    .sort((a, b) => a.score - b.score)
    .slice(0, 4);

  contentGaps.forEach((p) =>
    insights.push({
      id: hash("co" + p.url),
      kind: "content_gap",
      title: `Raise citability: ${p.title}`,
      detail: `Scores ${p.score}/100. Rewrite answer-first, add self-contained passages and hard stats so AI quotes it.`,
      target: "hubspot",
      action: "content task",
    })
  );

  const totalSignals = insights.length;
  const winCount = compWins.length;
  const citeCount = citationGaps.length;
  const contentCount = contentGaps.length;

  // ── signal type chart (counts of each type) ──────────────────────────────────
  const signalTypeChart = [
    { name: "Competitor wins", value: winCount, color: "#ef4444" },
    { name: "Citation gaps", value: citeCount, color: "#3b82f6" },
    { name: "Content gaps", value: contentCount, color: "#CA8A04" },
  ].filter((s) => s.value > 0);

  // ── DrillDetail per tile ──────────────────────────────────────────────────────

  // competitor_win rows: prompts where a competitor wins, link to /prompts/{idx}
  const compWinRows: DrillRow[] = compWins.map(({ r, comps }) => ({
    label: r.prompt,
    sub: `${r.persona?.toUpperCase() || ""} · winning: ${comps.slice(0, 3).join(", ")}`,
    href: idxOf.has(r.prompt) ? `/prompts/${idxOf.get(r.prompt)}` : undefined,
    tag: comps[0] || undefined,
    tagColor: "#ef4444",
  }));
  // supplement with more competitor-win prompts up to 40
  const extraCompWins = all
    .filter((r) => r.intent === "comparison" && !jbool(r.brand_mentioned))
    .filter((r) => !compWins.find((cw) => cw.r.prompt === r.prompt))
    .slice(0, 40 - compWinRows.length);
  extraCompWins.forEach((r) => {
    const comps = jparse(r.competitors_present);
    compWinRows.push({
      label: r.prompt,
      sub: `${r.persona?.toUpperCase() || ""} · ${comps.slice(0, 2).join(", ")}`,
      href: idxOf.has(r.prompt) ? `/prompts/${idxOf.get(r.prompt)}` : undefined,
    });
  });

  const compWinDetail: DrillDetail = {
    blurb: "Comparison prompts where RISA is absent and a competitor is named. Each is a sequence trigger.",
    chart: { kind: "donut", data: signalTypeChart },
    rowsTitle: "Comparison prompts RISA lost",
    rows: compWinRows.slice(0, 40),
    href: "/prompts/gaps",
    hrefLabel: "See all opportunities",
  };

  // citation_gap rows: competitor-owned domains (external links)
  const allCitationGapRows: DrillRow[] = getCitations()
    .filter((c) => c.class === "competitor")
    .sort((a, b) => Number(b.citations) - Number(a.citations))
    .slice(0, 40)
    .map((c) => ({
      label: c.domain,
      sub: `${c.citations} citations · competitor-owned`,
      href: `https://${c.domain}`,
      external: true,
      value: String(c.citations),
      tagColor: "#3b82f6",
    }));

  const citationGapDetail: DrillDetail = {
    blurb: "Competitor-owned domains earning AI citations. Target these for PR placements or counter-content.",
    chart: { kind: "bar", data: allCitationGapRows.slice(0, 10).map((r) => ({ name: r.label, value: Number(r.value || 0) })) },
    rowsTitle: "Competitor-cited domains",
    rows: allCitationGapRows,
    href: "/citations",
    hrefLabel: "Open Citations",
  };

  // content_gap rows: owned pages below 70/100 citability
  const allContentGapRows: DrillRow[] = (getCitability()?.pages || [])
    .filter((p) => p.score < 70)
    .sort((a, b) => a.score - b.score)
    .slice(0, 40)
    .map((p) => ({
      label: p.title || p.url,
      sub: p.url,
      href: `https://${p.url.replace(/^https?:\/\//, "")}`,
      external: true,
      value: `${p.score}/100`,
      tagColor: p.score < 40 ? "#ef4444" : "#CA8A04",
      tag: p.score < 40 ? "low" : "mid",
    }));

  const contentGapDetail: DrillDetail = {
    blurb: "Owned pages with citability below 70/100. Rewrite answer-first with hard stats to earn AI citations.",
    chart: {
      kind: "bar",
      data: allContentGapRows.slice(0, 10).map((r) => ({
        name: (r.label as string).slice(0, 30),
        value: Number(String(r.value || "0").replace("/100", "")),
      })),
    },
    rowsTitle: "Pages below citability threshold",
    rows: allContentGapRows,
    href: "/readiness",
    hrefLabel: "Open Readiness",
  };

  return (
    <>
      <PageHeader
        title="Activate"
        subtitle="Insight to action. Each signal routes to RizzA (sequences) or HubSpot (content/PR tasks)."
        right={
          <Badge variant={totalSignals > 0 ? "danger" : "success"}>
            {totalSignals} signal{totalSignals !== 1 ? "s" : ""} live
          </Badge>
        }
      />

      <div className="space-y-6">
        {/* Signal summary */}
        <div>
          <Section label="Live signals" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger mt-2">
            <DrillStat
              label="Competitor wins"
              brief={KIND_META.competitor_win.brief}
              icon={<Swords className="w-3.5 h-3.5" />}
              value={winCount}
              accent="#ef4444"
              sub="comparison prompts RISA lost"
              tone={winCount > 0 ? "bad" : "good"}
              detail={compWinDetail}
            />
            <DrillStat
              label="Citation gaps"
              brief={KIND_META.citation_gap.brief}
              icon={<Quote className="w-3.5 h-3.5" />}
              value={citeCount}
              accent="#3b82f6"
              sub="competitor domains earning citations"
              tone={citeCount > 0 ? "warn" : "good"}
              detail={citationGapDetail}
            />
            <DrillStat
              label="Content gaps"
              brief={KIND_META.content_gap.brief}
              icon={<FileText className="w-3.5 h-3.5" />}
              value={contentCount}
              accent="#0056D6"
              sub="owned pages below 70/100 citability"
              tone={contentCount > 0 ? "warn" : "good"}
              detail={contentGapDetail}
            />
          </div>
        </div>

        {/* Signal cards + queue */}
        <div>
          <Section
            label="Signals and dispatch queue"
            right={
              <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-brand" /> activate to enqueue, dispatch to route
              </span>
            }
          />
          <div className="mt-2">
            {insights.length === 0 ? (
              <EmptyState
                icon={<TrendingDown className="w-5 h-5" />}
                title="No signals detected"
                hint="Run the pipeline to generate competitor win, citation gap, and content gap signals."
                command="python run.py full"
              />
            ) : (
              <ActivateQueue insights={insights} />
            )}
          </div>
        </div>

        {/* Journey note */}
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          Insight loop: Overview gap found
          <Link href="/prompts/gaps" className="text-brand hover:underline">
            prompt
          </Link>
          {" "} signals here, dispatched to{" "}
          <Link href="/actions" className="text-brand hover:underline">
            Action Board
          </Link>
          {" "} for tracking.
        </div>
      </div>
    </>
  );
}
