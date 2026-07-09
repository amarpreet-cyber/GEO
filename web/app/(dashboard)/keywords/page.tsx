import Link from "next/link";
import { Hash, TrendingUp, Eye, Target, Search } from "lucide-react";
import { getNormalized, hasData, getLocalAppConfig, getSummary } from "@/lib/data";
import {
  Card, Title, Section, PageHeader, NoData, Badge, MeterBar,
} from "@/components/ui";
import type { SP } from "@/lib/filters";

// ── helpers ──────────────────────────────────────────────────────────────────

function tailLength(kw: string): "short" | "long" {
  return kw.split(/\s+/).length <= 3 ? "short" : "long";
}

function ScorePill({ v }: { v: number }) {
  const tone = v >= 40 ? "emerald" : v >= 15 ? "yellow" : "red";
  const bg = tone === "emerald" ? "bg-emerald-50 text-emerald-700" : tone === "yellow" ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-500";
  return (
    <span className={`text-[11px] font-bold tnum px-1.5 py-0.5 rounded ${bg}`}>{v.toFixed(1)}</span>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function Keywords(_props: { searchParams: SP }) {
  if (!hasData()) return <NoData />;

  const summary = getSummary();
  const cfg = getLocalAppConfig();
  const trackedLabels = new Set((cfg?.keywords || []).map((k) => k.label.toLowerCase()));

  // Per-topic performance from rollup_topic.csv
  const topicRows = getNormalized("rollup_topic")
    .filter((r) => r.segment && r.segment !== "(unspecified)" && r.segment !== "segment");

  // Emerging / discovered topics from emerging_topics.csv
  const emergingRaw = getNormalized("emerging_topics")
    .map((r) => r.topic?.trim())
    .filter((t): t is string => !!t && t !== "topic");

  // Count frequency of discovered topics
  const emergCount: Record<string, number> = {};
  for (const t of emergingRaw) {
    const key = t.toLowerCase();
    emergCount[key] = (emergCount[key] || 0) + 1;
  }
  // Unique discovered topics (not in tracked, by approximate match)
  const discovered = Object.entries(emergCount)
    .filter(([k]) => !trackedLabels.has(k))
    .sort((a, b) => b[1] - a[1])
    .map(([topic, count]) => ({ topic: emergingRaw.find((t) => t.toLowerCase() === topic) || topic, count }))
    .slice(0, 40);

  // Tracked keyword metrics
  const trackedWithMetrics = topicRows.map((r) => ({
    label: r.segment,
    prompts: parseInt(r.prompts) || 0,
    mention_rate: parseFloat(r.mention_rate) || 0,
    visibility: parseFloat(r.visibility_score) || 0,
    avg_position: parseFloat(r.avg_position) || 0,
    isTracked: trackedLabels.has(r.segment.toLowerCase()),
  })).sort((a, b) => b.visibility - a.visibility);

  const maxVis = Math.max(...trackedWithMetrics.map((r) => r.visibility), 0.1);
  const brand = summary?.brand || "RISA Labs";

  // Hero stats
  const totalTracked = (cfg?.keywords || []).length || trackedWithMetrics.filter((r) => r.isTracked).length;
  const avgVis = trackedWithMetrics.length
    ? (trackedWithMetrics.reduce((s, r) => s + r.visibility, 0) / trackedWithMetrics.length).toFixed(1)
    : "0";
  const topKw = trackedWithMetrics[0];
  const discoveredCount = discovered.length;

  const shortTail = discovered.filter((d) => tailLength(d.topic) === "short");
  const longTail = discovered.filter((d) => tailLength(d.topic) === "long");

  return (
    <>
      <PageHeader
        title="Keywords"
        subtitle={`Topics ${brand} is tracked across in AI answer engines, plus what the AI surfaces on its own.`}
        right={
          <div className="flex items-center gap-2">
            <Link href="/setup" className="text-[12px] text-slate-400 hover:text-blue-500 transition-colors flex items-center gap-1">
              <Search className="w-3.5 h-3.5" /> Edit tracked keywords
            </Link>
          </div>
        }
      />

      {/* Hero stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Tracked keywords", value: String(totalTracked), sub: "from your setup config", icon: Hash },
          { label: "Avg visibility", value: `${avgVis}`, sub: "across tracked keywords", icon: Eye },
          { label: "Top keyword", value: topKw?.label || "—", sub: topKw ? `${topKw.visibility.toFixed(1)} visibility` : "", icon: TrendingUp },
          { label: "Discovered", value: String(discoveredCount), sub: "new topics from AI responses", icon: Target },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-start justify-between mb-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{s.label}</div>
              <s.icon className="w-4 h-4 text-slate-300" />
            </div>
            <div className="text-xl font-bold text-slate-800 truncate">{s.value}</div>
            <div className="text-[12px] text-slate-400 mt-0.5">{s.sub}</div>
          </Card>
        ))}
      </div>

      {/* Tracked keywords table */}
      {trackedWithMetrics.length > 0 && (
        <>
          <Section
            label="Tracked keywords — performance"
            right={<Badge variant="neutral">{trackedWithMetrics.length} topics</Badge>}
          />
          <Card className="mb-6 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-200">
                <tr>
                  {["Keyword", "Type", "Prompts", "Visibility", "Mention rate", "Avg position"].map((h) => (
                    <th key={h} className="text-left py-2.5 px-4 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trackedWithMetrics.map((kw) => (
                  <tr key={kw.label} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors group">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-slate-800">{kw.label}</span>
                        {kw.isTracked && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-semibold">tracked</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${tailLength(kw.label) === "short" ? "bg-slate-100 text-slate-500" : "bg-purple-50 text-purple-600"}`}>
                        {tailLength(kw.label) === "short" ? "short-tail" : "long-tail"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 tnum text-slate-600">{kw.prompts}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <ScorePill v={kw.visibility} />
                        <div className="w-20">
                          <MeterBar pct={(kw.visibility / maxVis) * 100} />
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 tnum text-slate-600">{kw.mention_rate.toFixed(1)}%</td>
                    <td className="py-2.5 px-4 tnum text-slate-500">
                      {kw.avg_position > 0 ? `#${kw.avg_position.toFixed(0)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* Discovered keywords */}
      {discovered.length > 0 && (
        <>
          <Section
            label="Discovered from AI responses"
            right={<span className="text-[11px] text-slate-400">Topics the AI surfaced that you haven&apos;t tracked yet</span>}
          />
          <div className="grid grid-cols-2 gap-5 mb-6">
            {/* Short-tail */}
            <Card className="p-5">
              <Title right={<Badge variant="neutral">{shortTail.length}</Badge>}>Short-tail topics</Title>
              <div className="flex flex-wrap gap-2">
                {shortTail.map((d) => (
                  <div key={d.topic} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-default group">
                    <span className="text-[12px] text-slate-700 font-medium">{d.topic}</span>
                    <span className="text-[10px] text-slate-300 tnum group-hover:text-blue-400">{d.count}×</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Long-tail */}
            <Card className="p-5">
              <Title right={<Badge variant="neutral">{longTail.length}</Badge>}>Long-tail topics</Title>
              <div className="space-y-1.5">
                {longTail.slice(0, 18).map((d) => (
                  <div key={d.topic} className="flex items-center justify-between gap-3 py-1 border-b border-slate-50 last:border-0">
                    <span className="text-[12px] text-slate-600 line-clamp-1">{d.topic}</span>
                    <span className="text-[10px] text-slate-300 tnum shrink-0">{d.count}×</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* All discovered as a flat chip cloud */}
          <Card className="p-5 mb-6">
            <Title
              hint="Frequency = how often this topic appeared across all AI responses in the last run."
              right={
                <Link href="/setup" className="text-[12px] text-blue-500 hover:text-blue-600 font-semibold">
                  + Add to tracked
                </Link>
              }
            >
              All discovered topics
            </Title>
            <div className="flex flex-wrap gap-2">
              {discovered.map((d) => (
                <span key={d.topic}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 text-slate-600 text-[12px] font-medium hover:bg-slate-200 transition-colors cursor-default"
                  title={`Found ${d.count}× in AI responses`}>
                  {d.topic}
                  <span className="text-[10px] text-slate-400 tnum bg-white rounded-full px-1.5 py-0.5">{d.count}</span>
                </span>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* No data state */}
      {trackedWithMetrics.length === 0 && discovered.length === 0 && (
        <Card className="p-12 text-center">
          <Hash className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-slate-600 mb-1">No keyword data yet</p>
          <p className="text-[13px] text-slate-400 mb-4">Run the full pipeline to generate topic-level metrics.</p>
          <Link href="/settings/runs" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white" style={{ background: "#0056D6" }}>
            Go to Runs →
          </Link>
        </Card>
      )}
    </>
  );
}
