import { Bot, ShieldCheck, ShieldAlert, FileCode } from "lucide-react";
import { getSiteAudit, hasData } from "@/lib/data";
import { Card, Title, Section, PageHeader, NoData, MeterBar } from "@/components/ui";
import { DrillStat } from "@/components/DrillStat";
import { BRIEFS } from "@/lib/metricBriefs";
import type { DrillRow } from "@/lib/drill";

function BotChip({ name, allowed }: { name: string; allowed: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium transition press ${
        allowed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${allowed ? "bg-emerald-500" : "bg-red-500"}`} />
      {name}
    </span>
  );
}

export default function Crawlers() {
  const site = getSiteAudit();
  if (!hasData() || !site) return <NoData />;

  const c = site.crawler;
  const t1 = c.bots.filter((b) => b.tier === 1);
  const t2 = c.bots.filter((b) => b.tier === 2);
  const blocked = c.bots.filter((b) => !b.allowed);

  const crawlerColor = c.score >= 90 ? "#22c55e" : c.score >= 50 ? "#CA8A04" : "#ef4444";
  const crawlerTone = c.score >= 90 ? "good" : c.score >= 50 ? "warn" : "bad";
  const robotsBg = c.score >= 90 ? "#dcfce7" : "#fef3c7";
  const robotsColor = c.score >= 90 ? "#16a34a" : "#CA8A04";

  const I = "w-3.5 h-3.5";

  // Donut: allowed vs blocked
  const donutData = [
    { name: "Allowed", value: c.bots.filter((b) => b.allowed).length, color: "#22c55e" },
    { name: "Blocked", value: blocked.length, color: "#ef4444" },
  ];

  // Rows: each bot with allow/block tag
  const allBotRows: DrillRow[] = c.bots.map((b) => ({
    label: b.name,
    sub: `Tier ${b.tier}`,
    tag: b.allowed ? "allow" : "block",
    tagColor: b.allowed ? "#22c55e" : "#ef4444",
    value: b.tier === 1 ? "primary" : "secondary",
  }));

  const t1AllowedCount = Number(c.tier1_allowed);
  const t2AllowedCount = Number(c.tier2_allowed);

  // Rows for tier-1 tile: only tier-1 bots
  const tier1Rows: DrillRow[] = t1.map((b) => ({
    label: b.name,
    sub: "Tier 1 answer engine",
    tag: b.allowed ? "allow" : "block",
    tagColor: b.allowed ? "#22c55e" : "#ef4444",
    value: b.allowed ? "allowed" : "blocked",
  }));

  // Rows for tier-2 tile: only tier-2 bots
  const tier2Rows: DrillRow[] = t2.map((b) => ({
    label: b.name,
    sub: "Tier 2 secondary crawler",
    tag: b.allowed ? "allow" : "block",
    tagColor: b.allowed ? "#22c55e" : "#ef4444",
    value: b.allowed ? "allowed" : "blocked",
  }));

  // Rows for blocked tile: only blocked bots
  const blockedRows: DrillRow[] = blocked.map((b) => ({
    label: b.name,
    sub: `Tier ${b.tier}`,
    tag: "block",
    tagColor: "#ef4444",
    value: b.tier === 1 ? "primary" : "secondary",
  }));

  return (
    <>
      <PageHeader
        title="AI Crawler Access"
        subtitle={`Crawler permissions for ${site.domain}, parsed live from robots.txt`}
      />

      <div className="space-y-6">
        {/* KPI tiles */}
        <div>
          <Section label="Crawler access summary" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger mt-2">
            <DrillStat
              label="Crawler score"
              brief={BRIEFS.crawler_access}
              icon={<Bot className={I} />}
              value={c.score}
              unit="/100"
              tone={crawlerTone}
              footer={<MeterBar pct={c.score} color={crawlerColor} />}
              detail={{
                blurb: BRIEFS.crawler_access,
                chart: { kind: "donut", data: donutData },
                rowsTitle: "All bots",
                rows: allBotRows,
                href: "/readiness/crawlers",
                hrefLabel: "Open Crawlers",
              }}
            />
            <DrillStat
              label="Tier-1 allowed"
              brief="GPTBot, ClaudeBot, PerplexityBot and Google-Extended feed the four primary answer engines. All must be permitted."
              icon={<ShieldCheck className={I} />}
              value={t1AllowedCount}
              accent="#22c55e"
              sub="primary answer engines"
              detail={{
                blurb: "GPTBot, ClaudeBot, PerplexityBot and Google-Extended are the four tier-1 answer engine crawlers.",
                chart: {
                  kind: "donut",
                  data: [
                    { name: "Allowed", value: t1AllowedCount, color: "#22c55e" },
                    { name: "Blocked", value: t1.length - t1AllowedCount, color: "#ef4444" },
                  ],
                },
                rowsTitle: "Tier-1 bots",
                rows: tier1Rows,
                href: "/readiness/crawlers",
                hrefLabel: "Open Crawlers",
              }}
            />
            <DrillStat
              label="Tier-2 allowed"
              brief="Secondary AI crawlers including Apple, Amazon, Meta, ByteDance, Common Crawl, Bing and Cohere."
              icon={<ShieldCheck className={I} />}
              value={t2AllowedCount}
              accent="#3b82f6"
              sub="secondary crawlers"
              detail={{
                blurb: "Secondary AI crawlers including Apple, Amazon, Meta, ByteDance, Common Crawl, Bing and Cohere.",
                chart: {
                  kind: "donut",
                  data: [
                    { name: "Allowed", value: t2AllowedCount, color: "#3b82f6" },
                    { name: "Blocked", value: t2.length - t2AllowedCount, color: "#ef4444" },
                  ],
                },
                rowsTitle: "Tier-2 bots",
                rows: tier2Rows,
                href: "/readiness/crawlers",
                hrefLabel: "Open Crawlers",
              }}
            />
            <DrillStat
              label="Blocked bots"
              brief="Count of AI crawlers explicitly disallowed in robots.txt. Any blocked tier-1 bot directly reduces answer-engine visibility."
              icon={<ShieldAlert className={I} />}
              value={blocked.length}
              accent={blocked.length > 0 ? "#ef4444" : "#22c55e"}
              tone={blocked.length > 0 ? "bad" : "good"}
              sub={blocked.length > 0 ? "bots cannot index the site" : "no bots blocked"}
              detail={{
                blurb: "Crawlers blocked in robots.txt cannot index the site, so schema and content optimizations have no effect on them.",
                chart: { kind: "donut", data: donutData },
                rowsTitle: "Blocked bots",
                rows: blockedRows.length > 0 ? blockedRows : allBotRows,
                href: "/readiness/crawlers",
                hrefLabel: "Open Crawlers",
              }}
            />
          </div>
        </div>

        {/* Tier 1 */}
        <div>
          <Section label="Tier 1 answer engines" />
          <Card className="p-5 mt-2">
            <Title
              brief="GPTBot, ClaudeBot, PerplexityBot, Google-Extended feed ChatGPT, Claude, Perplexity and Google AI Overviews. All must be allowed."
            >
              Primary crawlers
            </Title>
            <div className="flex flex-wrap gap-2">
              {t1.map((b) => (
                <BotChip key={b.name} name={b.name} allowed={b.allowed} />
              ))}
              {t1.length === 0 && (
                <p className="text-sm text-slate-400">No tier-1 bots found in the audit data.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Tier 2 */}
        <div>
          <Section label="Tier 2 secondary crawlers" />
          <Card className="p-5 mt-2">
            <Title
              brief="Secondary AI crawlers including Apple, Amazon, Meta, ByteDance, Common Crawl, Bing and Cohere."
            >
              Secondary crawlers
            </Title>
            <div className="flex flex-wrap gap-2">
              {t2.map((b) => (
                <BotChip key={b.name} name={b.name} allowed={b.allowed} />
              ))}
              {t2.length === 0 && (
                <p className="text-sm text-slate-400">No tier-2 bots found in the audit data.</p>
              )}
            </div>
          </Card>
        </div>

        {/* robots.txt status */}
        <div>
          <Section label="robots.txt status" />
          <Card className="p-5 mt-2">
            <div className="flex items-start gap-3">
              <span
                className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
                style={{ background: robotsBg, color: robotsColor }}
              >
                <FileCode className="w-4 h-4" />
              </span>
              <div>
                <div className="text-sm font-semibold text-ink">
                  {c.robots_exists
                    ? "robots.txt present"
                    : "No robots.txt found (all crawlers allowed by default)"}
                </div>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  {c.score >= 90
                    ? "Every major AI crawler can reach the site. Any remaining invisibility is a content and entity-signal problem, not a crawl block. Focus next on citability, schema markup, and llms.txt."
                    : c.robots_exists
                    ? "Some AI crawlers are disallowed in robots.txt. Fix this first: a blocked crawler cannot cite the site regardless of content quality. Remove Disallow rules for the flagged bots above."
                    : "No robots.txt exists, so all crawlers are permitted by default. Adding one gives explicit control over which bots can access which paths, and is recommended as the site scales."}
                </p>
                {c.blanket_block && (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium bg-red-50 text-red-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    Blanket Disallow: / detected. All bots are blocked.
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
