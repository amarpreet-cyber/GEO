import { loadFiltered } from "@/lib/page";
import { hasData, getCompetitorProfiles } from "@/lib/data";
import { jbool, jparse } from "@/lib/derive";
import {
  Card, Title, Section, PageHeader, NoData, Badge, MeterBar,
} from "@/components/ui";
import { HBar } from "@/components/charts";
import type { CompetitorProfile } from "@/lib/types";
import type { SP } from "@/lib/filters";

function CompLogo({ profile, size = 36 }: { profile?: CompetitorProfile; size?: number }) {
  if (!profile?.logo_url) {
    return (
      <div className="rounded-xl bg-slate-100 grid place-items-center text-slate-400 text-[11px] font-bold shrink-0"
        style={{ width: size, height: size }}>
        {(profile?.name || "?").slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 flex items-center justify-center"
      style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={profile.logo_url}
        alt={profile.name}
        className="w-full h-full object-contain p-1"
      />
    </div>
  );
}

function GeoSignalBadge({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${on ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-500"}`}>
      {label}
    </span>
  );
}

export default function Competitors({ searchParams }: { searchParams: SP }) {
  if (!hasData()) return <NoData />;

  const { filtered, brand, agg } = loadFiltered(searchParams);
  const profiles = getCompetitorProfiles();
  const profileMap = Object.fromEntries(profiles.map((p) => [p.name, p]));

  // Build per-competitor metrics from prompt data
  const compStats: Record<string, {
    name: string; mentions: number; presence_rate: number; sov: number;
    top_prompts: string[];
  }> = {};

  for (const row of filtered) {
    const present = jparse(row.competitors_present) as string[];
    for (const cname of present) {
      if (!compStats[cname]) {
        compStats[cname] = {
          name: cname, mentions: 0, presence_rate: 0,
          sov: (agg.sov.find((s) => s.name === cname)?.share || 0),
          top_prompts: [],
        };
      }
      compStats[cname].mentions++;
      if (compStats[cname].top_prompts.length < 3 && !compStats[cname].top_prompts.includes(row.prompt))
        compStats[cname].top_prompts.push(row.prompt);
    }
  }
  const n = filtered.length || 1;
  for (const c of Object.values(compStats)) {
    c.presence_rate = Math.round((c.mentions / n) * 100);
  }

  const ranked = Object.values(compStats).sort((a, b) => b.sov - a.sov);

  // Gap analysis: prompts where competitors appear but RISA doesn't
  const gapPrompts = filtered
    .filter((r) => !jbool(r.brand_mentioned) && jparse(r.competitors_present).length > 0)
    .map((r) => ({
      prompt: r.prompt,
      competitors: jparse(r.competitors_present) as string[],
      persona: r.persona,
      topic: r.topic,
    }))
    .slice(0, 12);

  const brandSov = +(agg.sov.find((s) => s.isBrand)?.share || 0).toFixed(1);
  const topComp = ranked[0];
  const sovGap = topComp ? +(topComp.sov * 100 - brandSov).toFixed(1) : 0;

  const sovChart = agg.sov.slice(0, 8).map((s) => ({
    name: s.name,
    value: +s.share.toFixed(1),
  }));
  const maxSov = Math.max(...ranked.map((x) => x.sov * 100), 1);

  return (
    <>
      <PageHeader
        title="Competitor Analysis"
        subtitle={`How ${brand} stacks up across ${filtered.length} tracked prompts.`}
        right={<Badge variant="brand">{ranked.length} competitors tracked</Badge>}
      />

      {/* hero stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Brand SoV", value: `${brandSov}%`, sub: "share of voice", tone: brandSov > 10 ? "good" : "warn" },
          { label: "#1 Competitor", value: topComp?.name || "—", sub: `${(topComp?.sov * 100 || 0).toFixed(1)}% SoV`, tone: "bad" as const },
          { label: "SoV Gap", value: sovGap > 0 ? `+${sovGap}%` : `${sovGap}%`, sub: "vs top competitor", tone: sovGap <= 0 ? "good" : "bad" },
          { label: "Blind Spots", value: String(gapPrompts.length), sub: "prompts with 0 RISA", tone: gapPrompts.length > 10 ? "bad" : "warn" },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{s.label}</div>
            <div className={`text-2xl font-bold tracking-tight truncate ${
              s.tone === "good" ? "text-emerald-600" : s.tone === "bad" ? "text-red-500" : "text-yellow-600"
            }`}>{s.value}</div>
            <div className="text-[12px] text-slate-400 mt-0.5">{s.sub}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-5 mb-6">
        {/* Share of Voice chart */}
        <Card className="col-span-2 p-5">
          <Title>Share of Voice</Title>
          <HBar data={sovChart} highlightName={brand} />
        </Card>

        {/* Leaderboard with logos */}
        <Card className="col-span-3 p-5">
          <Title>Leaderboard</Title>
          <div className="space-y-2.5">
            {ranked.slice(0, 8).map((c, i) => {
              const prof = profileMap[c.name];
              const pct = (c.sov * 100) / maxSov * 100;
              return (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="w-5 text-[11px] font-semibold text-slate-300 text-right shrink-0">{i + 1}</span>
                  <CompLogo profile={prof} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[13px] font-semibold text-slate-800 truncate">{c.name}</span>
                      <span className="text-[12px] font-semibold text-slate-600 tnum shrink-0 ml-2">
                        {(c.sov * 100).toFixed(1)}%
                      </span>
                    </div>
                    <MeterBar pct={pct} />
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 w-14 text-right tnum">{c.presence_rate}% seen</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Blind spots */}
      {gapPrompts.length > 0 && (
        <>
          <Section label={`Blind Spots — ${gapPrompts.length} prompts where competitors appear but ${brand} doesn't`} />
          <div className="grid grid-cols-2 gap-3 mb-6">
            {gapPrompts.map((g) => (
              <Card key={g.prompt} className="p-4">
                <p className="text-[13px] text-slate-700 font-medium leading-snug mb-2 line-clamp-2">{g.prompt}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {g.persona && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium uppercase tracking-wide">{g.persona}</span>
                  )}
                  {g.competitors.slice(0, 3).map((comp) => {
                    const p = profileMap[comp];
                    return (
                      <span key={comp} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-white font-medium">
                        {p?.logo_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.logo_url} alt="" className="w-3 h-3 object-contain rounded-sm" />
                        )}
                        {comp.split(" ")[0]}
                      </span>
                    );
                  })}
                  {g.competitors.length > 3 && <span className="text-[10px] text-slate-400">+{g.competitors.length - 3}</span>}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Per-competitor profile cards */}
      <Section label="Competitor profiles" />
      <div className="grid grid-cols-2 gap-4 mb-6">
        {ranked.slice(0, 8).map((c) => {
          const prof = profileMap[c.name];
          return (
            <Card key={c.name} className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <CompLogo profile={prof} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-slate-800">{c.name}</div>
                  {prof?.domain && (
                    <a href={`https://${prof.domain}`} target="_blank" rel="noopener noreferrer"
                      className="text-[12px] text-slate-400 hover:text-blue-500 transition-colors">
                      {prof.domain}
                    </a>
                  )}
                  {prof?.description && (
                    <p className="text-[12px] text-slate-500 mt-1 leading-relaxed line-clamp-2">{prof.description}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[18px] font-bold text-slate-800 tnum">{(c.sov * 100).toFixed(1)}%</div>
                  <div className="text-[11px] text-slate-400">SoV</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="p-2.5 rounded-lg bg-slate-50 text-center">
                  <div className="text-[11px] text-slate-400 mb-0.5">Present</div>
                  <div className="text-[15px] font-bold text-slate-700 tnum">{c.presence_rate}%</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 text-center">
                  <div className="text-[11px] text-slate-400 mb-0.5">Mentions</div>
                  <div className="text-[15px] font-bold text-slate-700 tnum">{c.mentions}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 text-center">
                  <div className="text-[11px] text-slate-400 mb-0.5">Citability</div>
                  <div className={`text-[15px] font-bold tnum ${
                    (prof?.citability || 0) >= 60 ? "text-emerald-600" : (prof?.citability || 0) >= 40 ? "text-yellow-600" : "text-red-500"
                  }`}>{prof?.citability ?? "—"}</div>
                </div>
              </div>

              {prof && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <GeoSignalBadge on={prof.has_llmstxt} label="llms.txt" />
                  <GeoSignalBadge on={prof.has_org_schema} label="Org Schema" />
                  <GeoSignalBadge on={prof.reachable} label="Reachable" />
                </div>
              )}

              {c.top_prompts.length > 0 && (
                <div className="mt-3">
                  <div className="text-[11px] text-slate-400 mb-1 font-medium uppercase tracking-wide">Appears in</div>
                  <ul className="space-y-0.5">
                    {c.top_prompts.map((p) => (
                      <li key={p} className="text-[12px] text-slate-600 line-clamp-1 flex items-start gap-1.5">
                        <span className="text-slate-300 shrink-0 mt-0.5">›</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* GEO readiness comparison */}
      {profiles.length > 0 && (
        <>
          <Section label="GEO Readiness — Competitors vs RISA" />
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-200">
                <tr>
                  {["Competitor", "Domain", "Citability", "llms.txt", "Org Schema", "Reachable"].map((h) => (
                    <th key={h} className="text-left py-2.5 px-4 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.name} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <CompLogo profile={p} size={24} />
                        <span className="text-[13px] font-semibold text-slate-800">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-[12px] text-slate-400">{p.domain}</td>
                    <td className="py-2.5 px-4 tnum">
                      <span className={`font-semibold text-[13px] ${
                        p.citability >= 60 ? "text-emerald-600" : p.citability >= 40 ? "text-yellow-600" : "text-red-500"
                      }`}>{p.citability}</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <GeoSignalBadge on={p.has_llmstxt} label={p.has_llmstxt ? "Yes" : "No"} />
                    </td>
                    <td className="py-2.5 px-4">
                      <GeoSignalBadge on={p.has_org_schema} label={p.has_org_schema ? "Yes" : "No"} />
                    </td>
                    <td className="py-2.5 px-4">
                      <GeoSignalBadge on={p.reachable} label={p.reachable ? "Yes" : "No"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  );
}
