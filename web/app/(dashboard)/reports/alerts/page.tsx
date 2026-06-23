import Link from "next/link";
import { ArrowLeft, Bell } from "lucide-react";
import { loadFiltered } from "@/lib/page";
import { getScore, getSiteAudit, hasData } from "@/lib/data";
import {
  Section, Card, Title, PageHeader, NoData, Badge,
} from "@/components/ui";
import AlertRules, { type Metric } from "@/components/AlertRules";
import { DrillStat } from "@/components/DrillStat";
import { BRIEFS } from "@/lib/metricBriefs";
import type { DrillDetail } from "@/lib/drill";
import type { SP } from "@/lib/filters";

// Thresholds used by AlertRules (mirrored here for drill blurbs)
const DEFAULTS: Record<string, number> = {
  geo_score: 50, visibility: 15, sov: 12, readiness: 60, schema: 40, mention: 10,
};

export default function Alerts({ searchParams }: { searchParams: SP }) {
  if (!hasData()) return <NoData />;
  const { agg } = loadFiltered(searchParams);
  const score = getScore();
  const site = getSiteAudit();
  const brandSov = agg.sov.find((s) => s.isBrand)?.share || 0;

  const metrics: Metric[] = [
    {
      key: "geo_score",
      label: "Composite GEO score",
      value: score?.geo_score ?? agg.visibility,
      unit: "/100",
    },
    { key: "visibility", label: "Visibility", value: agg.visibility, unit: "/100" },
    { key: "mention", label: "Mention rate", value: agg.mention_rate, unit: "%" },
    { key: "sov", label: "Share of voice", value: brandSov, unit: "%" },
    { key: "readiness", label: "Site readiness", value: site?.readiness_score ?? 0, unit: "/100" },
    { key: "schema", label: "Schema / entity", value: site?.schema?.score ?? 0, unit: "/100" },
  ];

  // pre-compute fired count for the header badge
  const firedCount = metrics.filter(
    (m) => m.value < (DEFAULTS[m.key] ?? 50)
  ).length;

  // helper: single comparison stat (current vs threshold)
  function thresholdRows(key: string, value: number): DrillDetail["rows"] {
    const threshold = DEFAULTS[key] ?? 50;
    const firing = value < threshold;
    return [
      { label: "Current value", value: value.toFixed(1), tagColor: firing ? "#ef4444" : "#22c55e", tag: firing ? "below" : "above" },
      { label: "Alert threshold", value: threshold.toFixed(0), tagColor: "#8A8A8A", tag: "target" },
      { label: "Gap to threshold", value: (threshold - value).toFixed(1), tagColor: firing ? "#ef4444" : "#22c55e", tag: firing ? "deficit" : "surplus" },
    ];
  }

  // GEO score detail: subscore bar
  const geoVal = score?.geo_score ?? agg.visibility;
  const geoSubBar = score?.components
    ? score.components.map((c) => ({ name: c.label, value: +c.value.toFixed(1) }))
    : [
        { name: "Visibility", value: +agg.visibility.toFixed(1) },
        { name: "Mention rate", value: +agg.mention_rate.toFixed(1) },
        { name: "Share of voice", value: +brandSov.toFixed(1) },
      ];
  const geoDetail: DrillDetail = {
    blurb: BRIEFS.geo_score,
    chart: { kind: "bar", data: geoSubBar },
    rowsTitle: "vs threshold",
    rows: thresholdRows("geo_score", geoVal),
    href: "/",
    hrefLabel: "Open Overview",
  };

  // visibility detail
  const visSovBar = agg.sov.slice(0, 8).map((s) => ({ name: s.name, value: +s.share.toFixed(1) }));
  const visibilityDetail: DrillDetail = {
    blurb: BRIEFS.visibility,
    chart: { kind: "bar", data: visSovBar },
    rowsTitle: "vs threshold",
    rows: thresholdRows("visibility", agg.visibility),
    href: "/visibility",
    hrefLabel: "Open Visibility",
  };

  // mention rate detail
  const mentionDonut = [
    { name: "Mentioned", value: agg.mentioned, color: "#22c55e" },
    { name: "Missing", value: agg.n - agg.mentioned, color: "#ef4444" },
  ].filter((d) => d.value > 0);
  const mentionDetail: DrillDetail = {
    blurb: BRIEFS.mention_rate,
    chart: { kind: "donut", data: mentionDonut },
    rowsTitle: "vs threshold",
    rows: thresholdRows("mention", agg.mention_rate),
    href: "/visibility",
    hrefLabel: "Open Visibility",
  };

  // SOV detail: share bar
  const sovDetail: DrillDetail = {
    blurb: BRIEFS.sov,
    chart: { kind: "bar", unit: "%", data: visSovBar },
    rowsTitle: "Brand leaderboard",
    rows: agg.sov.slice(0, 20).map((s, i) => ({
      label: `${i + 1}. ${s.name}`,
      sub: s.isBrand ? "RISA" : "competitor",
      value: `${s.share.toFixed(1)}%`,
      tag: s.isBrand ? "you" : undefined,
      tagColor: "#0056D6",
    })),
    href: "/visibility/share-of-voice",
    hrefLabel: "Open Share of Voice",
  };

  // site readiness detail
  const readinessVal = site?.readiness_score ?? 0;
  const readinessSubBar = site
    ? [
        { name: "Schema", value: site.schema?.score ?? 0 },
        { name: "Crawler", value: site.crawler?.tier1_allowed ? 80 : 20 },
        { name: "Readiness", value: readinessVal },
      ]
    : [{ name: "Readiness", value: readinessVal }];
  const readinessDetail: DrillDetail = {
    blurb: BRIEFS.site_readiness,
    chart: { kind: "bar", data: readinessSubBar },
    rowsTitle: "vs threshold",
    rows: thresholdRows("readiness", readinessVal),
    href: "/readiness",
    hrefLabel: "Open Readiness",
  };

  // schema detail
  const schemaVal = site?.schema?.score ?? 0;
  const schemaDetail: DrillDetail = {
    blurb: BRIEFS.schema,
    chart: { kind: "bar", data: [{ name: "Schema score", value: schemaVal }, { name: "Target", value: DEFAULTS.schema }] },
    rowsTitle: "vs threshold",
    rows: thresholdRows("schema", schemaVal),
    href: "/readiness",
    hrefLabel: "Open Readiness",
  };

  return (
    <>
      <PageHeader
        title="Alert Rules"
        subtitle="Threshold rules evaluated against the latest run. Enable, disable, or adjust any metric."
        right={
          <div className="flex items-center gap-2">
            {firedCount > 0 && (
              <Badge variant="danger">{firedCount} firing</Badge>
            )}
            <Link
              href="/reports"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg transition press"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Report
            </Link>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Live values */}
        <div>
          <Section label="Live metric values" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 stagger mt-2">
            <DrillStat
              label="GEO score"
              brief={BRIEFS.geo_score}
              value={geoVal}
              decimals={1}
              unit="/100"
              tone={geoVal >= 50 ? "good" : "bad"}
              detail={geoDetail}
            />
            <DrillStat
              label="Visibility"
              brief={BRIEFS.visibility}
              value={agg.visibility}
              decimals={1}
              unit="/100"
              tone={agg.visibility >= 15 ? "good" : "bad"}
              detail={visibilityDetail}
            />
            <DrillStat
              label="Mention rate"
              brief={BRIEFS.mention_rate}
              value={agg.mention_rate}
              decimals={1}
              suffix="%"
              tone={agg.mention_rate >= 10 ? "good" : "bad"}
              detail={mentionDetail}
            />
            <DrillStat
              label="Share of voice"
              brief={BRIEFS.sov}
              value={brandSov}
              decimals={1}
              suffix="%"
              tone={brandSov >= 12 ? "good" : "bad"}
              detail={sovDetail}
            />
            <DrillStat
              label="Site readiness"
              brief={BRIEFS.site_readiness}
              value={readinessVal}
              unit="/100"
              tone={readinessVal >= 60 ? "good" : "bad"}
              detail={readinessDetail}
            />
            <DrillStat
              label="Schema / entity"
              brief={BRIEFS.schema}
              value={schemaVal}
              unit="/100"
              tone={schemaVal >= 40 ? "good" : "bad"}
              detail={schemaDetail}
            />
          </div>
        </div>

        {/* Alert rules */}
        <div>
          <Section
            label="Alert rules"
            right={
              <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                <Bell className="w-3.5 h-3.5" /> toggle or edit thresholds below
              </span>
            }
          />
          <Card className="p-5 mt-2">
            <Title
              brief="Toggle a rule on/off, edit its threshold. Firing rules surface at the top."
            >
              Metric thresholds
            </Title>
            <AlertRules metrics={metrics} />
          </Card>
        </div>
      </div>
    </>
  );
}
