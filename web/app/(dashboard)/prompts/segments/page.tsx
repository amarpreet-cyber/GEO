import { MessageSquare, GitCompareArrows, Search, Layers } from "lucide-react";
import { loadFiltered } from "@/lib/page";
import { hasData } from "@/lib/data";
import { promptType, groupStats, jbool, num, type PromptType } from "@/lib/derive";
import { Card, Title, Section, PageHeader, NoData, Badge, MeterBar, ProgressRow } from "@/components/ui";
import { DrillStat } from "@/components/DrillStat";
import type { DrillRow } from "@/lib/drill";
import type { SP } from "@/lib/filters";

const I = "w-3.5 h-3.5";
const visColor = (v: number) => (v >= 40 ? "#22c55e" : v >= 15 ? "#CA8A04" : "#ef4444");
const visTone = (v: number) => (v >= 40 ? "good" : v >= 15 ? "warn" : "bad") as "good" | "warn" | "bad";

const TYPES: { key: PromptType; label: string; icon: React.ReactNode; brief: string; color: string }[] = [
  { key: "brand", label: "Brand / RISA", icon: <MessageSquare className={I} />, color: "#0056D6",
    brief: "Prompts that directly involve RISA: brand-intent questions or queries that name RISA." },
  { key: "comparison", label: "Comparison", icon: <GitCompareArrows className={I} />, color: "#1F1F1F",
    brief: "Head-to-head and best-tool questions where RISA competes against named vendors." },
  { key: "keyword", label: "Keyword / discovery", icon: <Search className={I} />, color: "#5C5C5C",
    brief: "Broad discovery and problem-level queries, the keyword demand RISA can capture." },
];

export default function PromptSegments({ searchParams }: { searchParams: SP }) {
  if (!hasData()) return <NoData />;
  const { filtered, all, brand } = loadFiltered(searchParams);
  const idxOf = new Map(all.map((r, i) => [r.prompt, i]));
  const promptRow = (r: typeof filtered[number]): DrillRow => ({
    label: r.prompt,
    sub: `${(r.persona || "").toUpperCase()}${r.intent ? " · " + r.intent : ""}`,
    href: idxOf.has(r.prompt) ? `/prompts/${idxOf.get(r.prompt)}` : undefined,
    value: jbool(r.brand_mentioned) ? (num(r.brand_position) > 0 ? `#${num(r.brand_position)}` : "mentioned") : "absent",
  });

  // ── by type (mutually exclusive) ──
  const byType: Record<PromptType, typeof filtered> = { brand: [], comparison: [], keyword: [] };
  filtered.forEach((r) => byType[promptType(r)].push(r));
  const typeBar = TYPES.map((t) => ({ name: t.label, value: groupStats(byType[t.key]).visibility }));

  // ── by sector (topic) ──
  const bySector: Record<string, typeof filtered> = {};
  filtered.forEach((r) => { const t = (r.topic || "").trim() || "General oncology RCM"; (bySector[t] ||= []).push(r); });
  const sectors = Object.entries(bySector)
    .map(([name, rows]) => ({ name, rows, ...groupStats(rows) }))
    .sort((a, b) => b.count - a.count || b.visibility - a.visibility);
  const sectorBar = sectors.map((s) => ({ name: s.name, value: s.visibility }));

  return (
    <>
      <PageHeader
        title="Prompt Segments"
        subtitle={`How ${brand} shows up across the kinds of questions oncology buyers ask`}
        right={<Badge variant="brand">{filtered.length} prompts in view</Badge>}
      />

      <div className="space-y-6">
        {/* ── By prompt type ── */}
        <div>
          <Section label="By prompt type — click a segment to see its prompts" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger mt-2">
            {TYPES.map((t) => {
              const rows = byType[t.key];
              const st = groupStats(rows);
              return (
                <DrillStat key={t.key} label={t.label} brief={t.brief} icon={t.icon} value={st.visibility} decimals={1} unit="/100"
                  accent={t.color} tone={visTone(st.visibility)}
                  footer={<MeterBar pct={st.visibility} color={t.color} />}
                  sub={`${st.mention.toFixed(0)}% mention rate · ${st.count} prompt${st.count === 1 ? "" : "s"}`}
                  detail={{
                    blurb: t.brief,
                    chart: { kind: "bar", unit: "", data: typeBar },
                    rowsTitle: `${t.label} prompts`,
                    rows: rows.map(promptRow),
                    href: t.key === "brand" ? "/prompts/intent" : t.key === "comparison" ? "/prompts/gaps" : "/prompts",
                    hrefLabel: "Open in library",
                  }} />
              );
            })}
          </div>
        </div>

        {/* ── By sector ── */}
        <div>
          <Section label="By sector / topic" right={<span className="text-[11px] text-slate-400">{sectors.length} sectors</span>} />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger mt-2">
            {sectors.map((s) => (
              <DrillStat key={s.name} label={s.name} value={s.visibility} decimals={1} unit="/100"
                brief={`Rank-weighted visibility across the ${s.count} prompt${s.count === 1 ? "" : "s"} in the "${s.name}" sector.`}
                tone={visTone(s.visibility)} footer={<MeterBar pct={s.visibility} color={visColor(s.visibility)} />}
                sub={`${s.mention.toFixed(0)}% mention · ${s.count} prompt${s.count === 1 ? "" : "s"}`}
                detail={{
                  blurb: `Prompts in the "${s.name}" sector and how RISA shows up in each answer.`,
                  chart: { kind: "bar", unit: "", data: sectorBar.slice(0, 12) },
                  rowsTitle: `${s.name} prompts`,
                  rows: s.rows.map(promptRow),
                  href: "/prompts/gaps", hrefLabel: "See opportunities",
                }} />
            ))}
          </div>
        </div>

        {/* ── Sector leaderboard (quick scan) ── */}
        <div>
          <Section label="Sector visibility leaderboard" />
          <Card className="p-5 mt-2">
            <Title brief="Every sector ranked by RISA visibility. The weakest sectors are the biggest content opportunities.">
              <span className="flex items-center gap-2"><Layers className="w-4 h-4 text-slate-400" />Visibility by sector</span>
            </Title>
            <div className="space-y-2.5">
              {sectors.map((s) => (
                <ProgressRow key={s.name} label={s.name} value={s.visibility} suffix="" color={visColor(s.visibility)} labelWidth="w-56" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
