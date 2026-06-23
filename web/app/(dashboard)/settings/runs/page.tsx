import Link from "next/link";
import { History, ArrowLeft, Clock, Cpu, BookOpen, Eye, AtSign, PieChart, Trophy } from "lucide-react";
import { getHistory, getRunId, getScore, hasData } from "@/lib/data";
import {
  Section, Card, Title, PageHeader, NoData, Badge, KeyRow, GradeChip,
} from "@/components/ui";
import RunTriggers from "@/components/RunTriggers";
import { DrillStat } from "@/components/DrillStat";
import { BRIEFS } from "@/lib/metricBriefs";
import type { DrillDetail } from "@/lib/drill";

export default function Runs() {
  if (!hasData()) return <NoData />;
  const history = getHistory();
  const runId = getRunId();
  const score = getScore();
  const last = runId !== "none" ? new Date(runId) : null;
  const prev = history.length > 1 ? history[history.length - 2] : null;
  const cur = history.length > 0 ? history[history.length - 1] : null;

  const d = (k: string) =>
    prev && cur
      ? Number((cur as Record<string, unknown>)[k]) - Number((prev as Record<string, unknown>)[k])
      : null;

  const I = "w-3.5 h-3.5";

  // ── DrillStat details for each delta tile ───────────────────────────────────

  // visibility: trend bar + run history rows
  const visBar = history.map((h) => ({
    name: new Date(h.ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: +Number(h.visibility_score).toFixed(1),
  }));
  const visRows = [...history].reverse().slice(0, 40).map((h) => ({
    label: new Date(h.ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    sub: (h.engines || []).join(", ") || undefined,
    value: `${Number(h.visibility_score).toFixed(1)}/100`,
  }));
  const visibilityDetail: DrillDetail = {
    blurb: BRIEFS.visibility,
    chart: visBar.length > 1 ? { kind: "bar", data: visBar } : undefined,
    rowsTitle: "Run history",
    rows: visRows,
    href: "/visibility",
    hrefLabel: "Open Visibility",
  };

  // mention rate: trend bar
  const mentionBar = history.map((h) => ({
    name: new Date(h.ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: +Number(h.mention_rate).toFixed(1),
  }));
  const mentionRows = [...history].reverse().slice(0, 40).map((h) => ({
    label: new Date(h.ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    sub: (h.engines || []).join(", ") || undefined,
    value: `${Number(h.mention_rate).toFixed(1)}%`,
  }));
  const mentionDetail: DrillDetail = {
    blurb: BRIEFS.mention_rate,
    chart: mentionBar.length > 1 ? { kind: "bar", data: mentionBar } : undefined,
    rowsTitle: "Run history",
    rows: mentionRows,
    href: "/visibility",
    hrefLabel: "Open Visibility",
  };

  // share of voice: trend bar
  const sovBar = history.map((h) => ({
    name: new Date(h.ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: +Number(h.brand_share_of_voice).toFixed(1),
  }));
  const sovRows = [...history].reverse().slice(0, 40).map((h) => ({
    label: new Date(h.ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    sub: (h.engines || []).join(", ") || undefined,
    value: `${Number(h.brand_share_of_voice).toFixed(1)}%`,
  }));
  const sovDetail: DrillDetail = {
    blurb: BRIEFS.sov,
    chart: sovBar.length > 1 ? { kind: "bar", unit: "%", data: sovBar } : undefined,
    rowsTitle: "Run history",
    rows: sovRows,
    href: "/visibility/share-of-voice",
    hrefLabel: "Open Share of Voice",
  };

  // GEO score: trend bar
  const geoBar = history
    .filter((h) => h.geo_score != null)
    .map((h) => ({
      name: new Date(h.ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: +Number(h.geo_score).toFixed(1),
    }));
  const geoRows = [...history].reverse().slice(0, 40).map((h) => ({
    label: new Date(h.ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    sub: (h.engines || []).join(", ") || undefined,
    value: h.geo_score != null ? `${Number(h.geo_score).toFixed(1)}/100` : "—",
  }));
  const geoDetail: DrillDetail = {
    blurb: BRIEFS.geo_score,
    chart: geoBar.length > 1 ? { kind: "bar", data: geoBar } : undefined,
    rowsTitle: "Run history",
    rows: geoRows,
    href: "/",
    hrefLabel: "Open Overview",
  };

  return (
    <>
      <PageHeader
        title="Runs"
        subtitle="Trigger any pipeline stage and watch it run. Output regenerates and the dashboard reads it live."
        right={
          <div className="flex items-center gap-2">
            {last && (
              <Badge variant="brand">
                last run {last.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </Badge>
            )}
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg transition press"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Settings
            </Link>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Trigger stages */}
        <div>
          <Section label="Run a stage" />
          <Card className="p-5 mt-2">
            <Title brief="Each stage spawns python run.py as a child process, streams its log, and writes one output contract. Heavy stages are single-writer guarded.">
              Pipeline stages
            </Title>
            <RunTriggers />
          </Card>
        </div>

        {/* Composite scorecard */}
        {score && (
          <div>
            <Section label="Latest scorecard" />
            <div className="grid grid-cols-12 gap-5 mt-2">
              <Card className="col-span-12 lg:col-span-4 p-5">
                <Title brief={BRIEFS.geo_score}>Composite GEO score</Title>
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-[44px] font-bold tnum text-ink leading-none">
                    {score.geo_score.toFixed(1)}
                  </div>
                  <GradeChip grade={score.grade} />
                </div>
                <div className="space-y-1.5">
                  {Object.entries(score.subscores).map(([k, v]) => (
                    <KeyRow
                      key={k}
                      k={<span className="capitalize">{k}</span>}
                      v={`${v.toFixed(1)}/100`}
                    />
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                  Computed {new Date(score.generated_at).toLocaleString()}
                </div>
              </Card>

              <Card className="col-span-12 lg:col-span-8 p-5">
                <Title brief="Component-level breakdown of the composite GEO score.">
                  Component breakdown
                </Title>
                <div className="divide-y divide-slate-100">
                  {(score.components || []).map((c) => (
                    <div
                      key={c.key}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[12px] text-slate-700 truncate">{c.label}</span>
                        {!c.measured && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            est
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full meter-fill"
                            style={{
                              width: `${Math.min(100, c.value)}%`,
                              background: c.value >= 60 ? "#22c55e" : c.value >= 30 ? "#CA8A04" : "#ef4444",
                            }}
                          />
                        </div>
                        <span className="text-[13px] tnum font-semibold text-ink w-10 text-right">
                          {c.value.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* vs-previous deltas with DrillStat + run history */}
        {prev && cur && (
          <div>
            <Section label="vs previous run" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger mt-2">
              <DrillStat
                label="Visibility"
                brief={BRIEFS.visibility}
                icon={<Eye className={I} />}
                value={Number(cur.visibility_score)}
                decimals={1}
                unit="/100"
                delta={d("visibility_score")}
                detail={visibilityDetail}
              />
              <DrillStat
                label="Mention rate"
                brief={BRIEFS.mention_rate}
                icon={<AtSign className={I} />}
                value={Number(cur.mention_rate)}
                decimals={1}
                suffix="%"
                delta={d("mention_rate")}
                detail={mentionDetail}
              />
              <DrillStat
                label="Share of voice"
                brief={BRIEFS.sov}
                icon={<PieChart className={I} />}
                value={Number(cur.brand_share_of_voice)}
                decimals={1}
                suffix="%"
                delta={d("brand_share_of_voice")}
                detail={sovDetail}
              />
              <DrillStat
                label="GEO score"
                brief={BRIEFS.geo_score}
                icon={<Trophy className={I} />}
                value={cur.geo_score != null ? Number(cur.geo_score) : 0}
                decimals={1}
                unit="/100"
                delta={d("geo_score")}
                detail={geoDetail}
              />
            </div>
          </div>
        )}

        {/* Run history table */}
        <div>
          <Section
            label="Run history"
            right={
              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                <History className="w-3.5 h-3.5" />
                {history.length} run{history.length !== 1 ? "s" : ""}
              </span>
            }
          />
          <Card className="mt-2 overflow-hidden">
            <div className="overflow-auto scroll">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-200">
                  <tr>
                    {[
                      { label: "When", icon: Clock },
                      { label: "Engines", icon: Cpu },
                      { label: "Prompts", icon: BookOpen },
                      { label: "Visibility", icon: Eye },
                      { label: "Mention", icon: AtSign },
                      { label: "SoV", icon: PieChart },
                      { label: "GEO", icon: Trophy },
                    ].map(({ label, icon: Icon }) => (
                      <th
                        key={label}
                        className="text-left py-2.5 px-3 font-semibold"
                      >
                        <span className="inline-flex items-center gap-1">
                          <Icon className="w-3 h-3" />
                          {label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((h, i) => {
                    const isCur = i === 0;
                    return (
                      <tr
                        key={i}
                        className={`border-b border-slate-100 last:border-0 transition ${isCur ? "bg-brand-light/30" : "hover:bg-slate-50/60"}`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            {isCur && (
                              <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                            )}
                            <span className="text-slate-700">
                              {new Date(h.ts).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {(h.engines || []).join(", ")}
                        </td>
                        <td className="py-2.5 px-3 tnum text-slate-600">{h.prompts_count}</td>
                        <td className="py-2.5 px-3 tnum text-slate-700 font-medium">
                          {Number(h.visibility_score).toFixed(1)}
                        </td>
                        <td className="py-2.5 px-3 tnum text-slate-600">
                          {Number(h.mention_rate).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 tnum text-slate-600">
                          {Number(h.brand_share_of_voice).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 tnum">
                          {h.geo_score != null ? (
                            <span className="font-semibold text-ink">
                              {Number(h.geo_score).toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {history.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-sm text-slate-400">No runs yet. Trigger a stage above.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
