import {
  getSummary, getScore, getHistory, getNormalized,
  getCitations, getLocalAppConfig, hasData,
} from "@/lib/data";
import { NoData } from "@/components/ui";
import PrintButton from "./PrintButton";

const BRAND_BLUE = "#0056D6";

function Pill({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" | "bad" | "neu" }) {
  const bg = tone === "good" ? "#ecfdf5" : tone === "bad" ? "#fef2f2" : tone === "warn" ? "#fffbeb" : "#f8fafc";
  const color = tone === "good" ? "#065f46" : tone === "bad" ? "#991b1b" : tone === "warn" ? "#92400e" : "#334155";
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: bg }}>
      <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>{label}</span>
      <span className="text-2xl font-bold tracking-tight tnum" style={{ color }}>{value}</span>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mt-10 mb-4 print:mt-6">
      <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: BRAND_BLUE }}>{children}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

function RankBar({ pct, color = BRAND_BLUE }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 rounded-full bg-slate-100 w-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  );
}

export default function Report() {
  if (!hasData()) return <NoData />;

  const summary = getSummary();
  const score = getScore();
  const history = getHistory();
  const cfg = getLocalAppConfig();
  const citations = getCitations();

  if (!summary) return <NoData />;

  const brand = summary.brand || "RISA Labs";
  const geoScore = score?.geo_score ?? 0;
  const grade = score?.grade ?? "—";
  const visibility = summary.visibility_score ?? 0;
  const mentionRate = summary.mention_rate ?? 0;
  const brandSov = (summary.brand_share_of_voice ?? 0) * 100;
  const totalPrompts = summary.prompts_count ?? 0;

  // SoV leaderboard
  const sovEntries = Object.entries(summary.share_of_voice || {})
    .sort((a, b) => b[1] - a[1]);
  const brandRank = sovEntries.findIndex(([k]) => k === brand) + 1;
  const topCompetitor = sovEntries.find(([k]) => k !== brand);
  const topCompSov = topCompetitor ? topCompetitor[1] * 100 : 0;

  // Keyword-level data from rollup_topic
  const topicRows = getNormalized("rollup_topic")
    .filter((r) => r.segment && r.segment !== "(unspecified)" && r.segment !== "segment")
    .map((r) => ({
      keyword: r.segment,
      prompts: parseInt(r.prompts) || 0,
      visibility: parseFloat(r.visibility_score) || 0,
      mention_rate: parseFloat(r.mention_rate) || 0,
    }))
    .sort((a, b) => b.visibility - a.visibility)
    .slice(0, 12);

  const maxKwVis = Math.max(...topicRows.map((r) => r.visibility), 0.1);

  // Issues / action items
  const issues = score?.issues || [];
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const allActions = [...errors, ...warnings].slice(0, 6);

  // Citation mix
  const citByClass: Record<string, number> = {};
  let totalCit = 0;
  for (const c of citations) {
    citByClass[c.class] = (citByClass[c.class] || 0) + parseInt(c.citations);
    totalCit += parseInt(c.citations);
  }

  // Trend
  const prev = history.length >= 2 ? history[history.length - 2] : null;
  const curr = history.length >= 1 ? history[history.length - 1] : null;
  const scoreDelta = curr?.geo_score && prev?.geo_score ? curr.geo_score - prev.geo_score : null;

  // Configured keywords
  const trackedKws = cfg?.keywords?.map((k) => k.label) || [];

  // Generated date
  const runDate = curr?.ts ? new Date(curr.ts).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Latest run";

  return (
    <div className="max-w-[860px] mx-auto px-0 py-8 print:py-0 print:max-w-none">

      {/* Print-only top bar */}
      <div className="hidden print:flex items-center justify-between mb-8 pb-4 border-b-2" style={{ borderColor: BRAND_BLUE }}>
        <div className="flex items-center gap-3">
          <div className="h-8 flex items-center rounded px-2" style={{ background: "#1F1F1F" }}>
            <span className="text-white text-sm font-bold tracking-tight">RISA GEO</span>
          </div>
          <span className="text-slate-400 text-sm">Answer Engine Visibility Report</span>
        </div>
        <span className="text-slate-400 text-sm">{runDate}</span>
      </div>

      {/* Screen-only header */}
      <div className="no-print flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">GEO Visibility Report</h1>
          <p className="text-[14px] text-slate-400 mt-0.5">{brand} · {runDate}</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" className="text-[13px] text-slate-400 hover:text-slate-600 transition-colors">← Dashboard</a>
          <PrintButton />
        </div>
      </div>

      {/* ── EXECUTIVE SUMMARY ── */}
      <SectionHeader>Executive Summary</SectionHeader>
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* GEO Score big block */}
        <div className="rounded-2xl p-6 flex flex-col gap-4 col-span-1" style={{ background: "#0056D6" }}>
          <span className="text-[11px] font-bold uppercase tracking-widest text-blue-200">Composite GEO Score</span>
          <div className="flex items-end gap-3">
            <span className="text-6xl font-bold text-white tnum leading-none">{geoScore.toFixed(0)}</span>
            <span className="text-2xl font-bold text-blue-200 mb-1">/100</span>
            <span className="text-3xl font-bold text-blue-100 mb-0.5 ml-2">Grade {grade}</span>
          </div>
          <p className="text-[13px] text-blue-200 leading-relaxed">
            {geoScore >= 60 ? "Strong AI visibility. Continue building citable content."
              : geoScore >= 40 ? "Moderate visibility. Key technical gaps are pulling the score down."
              : "Early stage. Significant opportunity to improve AI discoverability."}
          </p>
          {scoreDelta != null && (
            <span className={`text-[12px] font-semibold self-start px-2 py-1 rounded ${scoreDelta >= 0 ? "bg-emerald-500/20 text-emerald-200" : "bg-red-400/20 text-red-200"}`}>
              {scoreDelta >= 0 ? "+" : ""}{scoreDelta.toFixed(1)} from last run
            </span>
          )}
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3 col-span-1">
          <Pill label="Visibility Score" value={visibility.toFixed(1)} tone={visibility >= 20 ? "good" : visibility >= 10 ? "warn" : "bad"} />
          <Pill label="Mention Rate" value={`${mentionRate.toFixed(1)}%`} tone={mentionRate >= 20 ? "good" : mentionRate >= 10 ? "warn" : "bad"} />
          <Pill label="Brand SoV Rank" value={`#${brandRank} of ${sovEntries.length}`} tone={brandRank <= 3 ? "good" : brandRank <= 6 ? "warn" : "bad"} />
          <Pill label="Brand SoV" value={`${brandSov.toFixed(1)}%`} tone={brandSov >= 15 ? "good" : brandSov >= 8 ? "warn" : "bad"} />
        </div>
      </div>

      {/* Context */}
      <div className="rounded-xl border border-slate-200 p-4 text-[13px] text-slate-500 leading-relaxed mb-2">
        Analysed <strong className="text-slate-700">{totalPrompts} prompts</strong> across <strong className="text-slate-700">{summary.generated_engines?.join(", ") || "Claude"}</strong> with web search enabled.
        {trackedKws.length > 0 && <> Tracking <strong className="text-slate-700">{trackedKws.length} keywords</strong>: {trackedKws.slice(0, 5).join(", ")}{trackedKws.length > 5 ? ` and ${trackedKws.length - 5} more.` : "."}</>}
      </div>

      {/* ── KEYWORD PERFORMANCE ── */}
      {topicRows.length > 0 && (
        <>
          <SectionHeader>Keyword Performance</SectionHeader>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead style={{ background: "#f8fafc" }}>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold">Keyword</th>
                  <th className="text-left py-3 px-4 font-semibold">Prompts</th>
                  <th className="text-left py-3 px-4 font-semibold w-40">Visibility</th>
                  <th className="text-left py-3 px-4 font-semibold">Mention Rate</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {topicRows.map((kw) => {
                  const isTracked = trackedKws.some((t) => t.toLowerCase() === kw.keyword.toLowerCase());
                  const tone = kw.visibility >= 30 ? "good" : kw.visibility >= 10 ? "warn" : "bad";
                  return (
                    <tr key={kw.keyword} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{kw.keyword}</span>
                          {isTracked && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-semibold no-print">tracked</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 tnum text-slate-500">{kw.prompts}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`tnum font-semibold text-[13px] w-10 ${tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-yellow-600" : "text-red-500"}`}>
                            {kw.visibility.toFixed(1)}
                          </span>
                          <RankBar pct={(kw.visibility / maxKwVis) * 100} color={tone === "good" ? "#10b981" : tone === "warn" ? "#d97706" : "#ef4444"} />
                        </div>
                      </td>
                      <td className="py-3 px-4 tnum text-slate-600">{kw.mention_rate.toFixed(1)}%</td>
                      <td className="py-3 px-4">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                          kw.visibility >= 30 ? "bg-emerald-50 text-emerald-700" : kw.visibility >= 10 ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-600"
                        }`}>
                          {kw.visibility >= 30 ? "Visible" : kw.visibility >= 10 ? "Partial" : "Not found"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── COMPETITIVE LANDSCAPE ── */}
      <SectionHeader>Competitive Landscape</SectionHeader>
      <div className="grid grid-cols-2 gap-5">
        {/* SoV leaderboard */}
        <div className="rounded-xl border border-slate-200 p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Share of Voice</p>
          <div className="space-y-2.5">
            {sovEntries.slice(0, 8).map(([name, share], i) => {
              const isBrand = name === brand;
              const pct = share * 100;
              const maxSov = (sovEntries[0]?.[1] || 0.001) * 100;
              return (
                <div key={name} className="flex items-center gap-2.5">
                  <span className="w-4 text-[11px] text-slate-300 text-right tnum shrink-0">{i + 1}</span>
                  <span className={`text-[13px] flex-1 truncate ${isBrand ? "font-bold text-blue-700" : "text-slate-700"}`}>
                    {name}{isBrand ? " ← RISA" : ""}
                  </span>
                  <span className="tnum text-[12px] font-semibold text-slate-600 w-12 text-right">{pct.toFixed(1)}%</span>
                  <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden shrink-0">
                    <div className="h-full rounded-full" style={{ width: `${(pct / maxSov) * 100}%`, background: isBrand ? BRAND_BLUE : "#D6D6D6" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gap summary */}
        <div className="rounded-xl border border-slate-200 p-5 flex flex-col gap-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">vs Top Competitor</p>
          {topCompetitor && (
            <div>
              <div className="text-xl font-bold text-slate-800 mb-1">{topCompetitor[0]}</div>
              <div className="text-[13px] text-slate-500 mb-3">
                Leads RISA by <strong className="text-red-600">{(topCompSov - brandSov).toFixed(1)}%</strong> SoV
              </div>
              <div className="space-y-1.5 text-[13px] text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: "#ef4444" }} />
                  {topCompetitor[0]}: <strong className="text-slate-700 ml-auto tnum">{topCompSov.toFixed(1)}%</strong>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: BRAND_BLUE }} />
                  {brand}: <strong className="text-blue-700 ml-auto tnum">{brandSov.toFixed(1)}%</strong>
                </div>
              </div>
            </div>
          )}
          <div className="mt-auto pt-3 border-t border-slate-100">
            <p className="text-[11px] text-slate-400">
              <strong className="text-slate-600">{Object.keys(summary.share_of_voice || {}).length}</strong> total entities tracked in AI responses
            </p>
          </div>
        </div>
      </div>

      {/* ── ACTION ITEMS ── */}
      {allActions.length > 0 && (
        <>
          <SectionHeader>Priority Action Items</SectionHeader>
          <div className="space-y-2">
            {allActions.map((issue, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-4 flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full grid place-items-center shrink-0 text-[11px] font-bold text-white mt-0.5`}
                  style={{ background: issue.severity === "error" ? "#ef4444" : issue.severity === "warning" ? "#d97706" : "#64748b" }}>
                  {i + 1}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-800">{issue.title}</p>
                  <p className="text-[12px] text-slate-500 mt-0.5">{issue.fix}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── CITATION MIX ── */}
      {totalCit > 0 && (
        <>
          <SectionHeader>Citation Landscape</SectionHeader>
          <div className="rounded-xl border border-slate-200 p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">
              {totalCit} total citations across {citations.length} domains
            </p>
            <div className="grid grid-cols-4 gap-4">
              {(["owned", "earned", "competitor", "social"] as const).map((cls) => {
                const count = citByClass[cls] || 0;
                const pct = totalCit ? (count / totalCit) * 100 : 0;
                const colors: Record<string, string> = { owned: "#10b981", earned: "#3b82f6", competitor: "#ef4444", social: "#5C5C5C" };
                return (
                  <div key={cls} className="text-center">
                    <div className="text-2xl font-bold tnum mb-1" style={{ color: colors[cls] }}>{count}</div>
                    <div className="text-[11px] text-slate-400 capitalize mb-1">{cls}</div>
                    <div className="text-[11px] font-semibold" style={{ color: colors[cls] }}>{pct.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── HISTORY TREND ── */}
      {history.length >= 2 && (
        <>
          <SectionHeader>Run History</SectionHeader>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead style={{ background: "#f8fafc" }}>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-200">
                  {["Date", "Visibility", "Mention Rate", "Brand SoV", "GEO Score"].map((h) => (
                    <th key={h} className="text-left py-2.5 px-4 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().slice(0, 6).map((h, i) => (
                  <tr key={i} className={`border-b border-slate-100 last:border-0 ${i === 0 ? "bg-blue-50/40" : ""}`}>
                    <td className="py-2.5 px-4 text-[12px] text-slate-500">
                      {new Date(h.ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="py-2.5 px-4 tnum text-slate-700 font-medium">{h.visibility_score?.toFixed(1)}</td>
                    <td className="py-2.5 px-4 tnum text-slate-600">{h.mention_rate?.toFixed(1)}%</td>
                    <td className="py-2.5 px-4 tnum text-slate-600">{((h.brand_share_of_voice || 0) * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-4 tnum font-semibold text-slate-800">{h.geo_score?.toFixed(1) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="mt-10 pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
        <span>Generated by RISA GEO · {runDate}</span>
        <span className="no-print">
          <PrintButton />
        </span>
      </div>
    </div>
  );
}
