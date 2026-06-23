import Link from "next/link";
import { ShieldCheck, Bot, Code2, FileText, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { getSiteAudit } from "@/lib/data";
import { BRIEFS } from "@/lib/metricBriefs";
import {
  Card, Title, Section, PageHeader, Placeholder, MeterBar, Badge, ScorePill,
} from "@/components/ui";
import { DrillStat } from "@/components/DrillStat";
import type { DrillRow } from "@/lib/drill";

const I = "w-3.5 h-3.5";

function toneFor(v: number): "good" | "warn" | "bad" {
  return v >= 70 ? "good" : v >= 40 ? "warn" : "bad";
}

function meterColor(v: number): string {
  return v >= 70 ? "#22c55e" : v >= 40 ? "#CA8A04" : "#ef4444";
}

const FIX_ROUTES: Record<string, string> = {
  llmstxt: "/readiness/llms-txt",
  schema: "/readiness/schema",
  crawler: "/readiness/crawlers",
  citability: "/readiness/citability",
  eeat: "/readiness/eeat",
};

export default function Readiness() {
  const site = getSiteAudit();

  if (!site) {
    return (
      <>
        <PageHeader title="AI Readiness" subtitle="Supply-side: can AI find, read, and trust your site" />
        <Placeholder
          title="Site audit not run yet"
          note="Score the site on AI-crawler access, llms.txt, schema, and entity signals."
          ship="Run: python run.py audit"
        />
      </>
    );
  }

  const c = site.crawler;
  const s = site.schema;
  const l = site.llmstxt;

  const tier1 = c.bots.filter((b) => b.tier === 1);
  const tier2 = c.bots.filter((b) => b.tier === 2);

  const sameasLinked = s.sameas_linked || [];
  const sameasMissing = s.sameas_missing || [];

  // Build fix list from data
  type Fix = { key: string; title: string; description: string; href: string };
  const fixes: Fix[] = [];

  if (l.score < 60) {
    fixes.push({
      key: "llmstxt-missing",
      title: "Ship an llms.txt file",
      description: l.present
        ? "Your llms.txt exists but scores below 60. Expand it with structured sections covering products, use cases, and key pages."
        : `No llms.txt found at ${site.domain}/llms.txt. This is a sub-1-hour win that almost no competitors have done.`,
      href: FIX_ROUTES.llmstxt,
    });
  }

  if (s.score < 70) {
    fixes.push({
      key: "schema-org",
      title: "Add Organization JSON-LD with sameAs",
      description: s.has_organization
        ? "Organization schema present but sameAs coverage is weak. Link Wikipedia, LinkedIn, Crunchbase, and Wikidata so AI resolves RISA as one trusted entity."
        : "No Organization schema detected. AI engines cannot reliably resolve your entity without it.",
      href: FIX_ROUTES.schema,
    });
  }

  if (c.score < 80) {
    fixes.push({
      key: "crawler-block",
      title: "Unblock priority AI crawlers in robots.txt",
      description: `Some tier-1 answer-engine crawlers are blocked. Crawler access gates everything else: content and schema signals cannot reach AI models if they cannot crawl the site.`,
      href: FIX_ROUTES.crawler,
    });
  }

  fixes.push({
    key: "citability",
    title: "Raise page citability on high-value pages",
    description: "Answer-first paragraphs, self-contained passages, and hard statistics make pages more quotable inside AI answers. Prioritize prior-auth and oncology workflow pages.",
    href: FIX_ROUTES.citability,
  });

  fixes.push({
    key: "eeat",
    title: "Strengthen E-E-A-T signals",
    description: "Author bylines, publication dates, peer-review citations, and About/Team pages lift trust signals that AI engines use when deciding whether to cite a source.",
    href: FIX_ROUTES.eeat,
  });

  // DrillStat data for the 4 sub-score tiles
  const subScoreBar = [
    { name: "Crawlers", value: c.score },
    { name: "Schema", value: s.score },
    { name: "llms.txt", value: l.score },
  ];

  const fixRows: DrillRow[] = fixes.map((fix) => ({
    label: fix.title,
    sub: fix.description.slice(0, 90) + (fix.description.length > 90 ? "..." : ""),
    href: fix.href,
    value: "Fix",
  }));

  const crawlerRows: DrillRow[] = c.bots.map((b) => ({
    label: b.name,
    sub: `Tier ${b.tier}`,
    tag: b.allowed ? "allow" : "block",
    tagColor: b.allowed ? "#22c55e" : "#ef4444",
    value: b.tier === 1 ? "primary" : "secondary",
    href: "/readiness/crawlers",
  }));

  // Schema rows: sameAs linked (external) + JSON-LD type list
  const schemaRows: DrillRow[] = [
    ...sameasLinked.map((p): DrillRow => ({
      label: p,
      tag: "linked",
      tagColor: "#22c55e",
      value: "sameAs",
      href: p.startsWith("http") ? p : `https://${p}`,
      external: true,
    })),
    ...sameasMissing.map((p): DrillRow => ({
      label: p,
      tag: "missing",
      tagColor: "#8A8A8A",
      value: "sameAs",
    })),
    ...(s.types || []).map((t): DrillRow => ({
      label: t,
      tag: "JSON-LD",
      tagColor: "#3b82f6",
      value: "type",
    })),
  ];

  // llms.txt rows: quality checklist items
  const llmsRows: DrillRow[] = [
    { label: "File published at /llms.txt", tag: l.present ? "pass" : "fail", tagColor: l.present ? "#22c55e" : "#ef4444", value: l.present ? "yes" : "no" },
    { label: "Has a clear H1 title", tag: (l.sections ?? 0) >= 1 ? "pass" : "fail", tagColor: (l.sections ?? 0) >= 1 ? "#22c55e" : "#ef4444", value: (l.sections ?? 0) >= 1 ? "yes" : "no" },
    { label: "3+ structured sections", tag: (l.sections ?? 0) >= 3 ? "pass" : "fail", tagColor: (l.sections ?? 0) >= 3 ? "#22c55e" : "#ef4444", value: String(l.sections ?? 0) },
    { label: "Substantive, link-rich (200+ chars)", tag: (l.chars ?? 0) > 200 ? "pass" : "fail", tagColor: (l.chars ?? 0) > 200 ? "#22c55e" : "#ef4444", value: `${l.chars ?? 0} chars` },
  ];

  return (
    <>
      <PageHeader
        title="AI Readiness"
        subtitle={`Supply-side audit of ${site.domain}`}
        right={
          <Badge variant="neutral">Audited {site.fetched_at}</Badge>
        }
      />

      <div className="space-y-6">

        {/* Score summary */}
        <div>
          <Section label="Score summary" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger mt-2">
            <DrillStat
              label="Site Readiness"
              brief={BRIEFS.site_readiness}
              icon={<ShieldCheck className={I} />}
              value={site.readiness_score}
              unit="/100"
              tone={toneFor(site.readiness_score)}
              footer={<MeterBar pct={site.readiness_score} color={meterColor(site.readiness_score)} />}
              detail={{
                blurb: BRIEFS.site_readiness,
                chart: { kind: "bar", unit: "/100", data: subScoreBar },
                rowsTitle: "Prioritized fixes",
                rows: fixRows,
                href: "/readiness",
                hrefLabel: "Open Readiness",
              }}
            />
            <DrillStat
              label="Crawler Access"
              brief={BRIEFS.crawler_access}
              icon={<Bot className={I} />}
              value={c.score}
              unit="/100"
              tone={toneFor(c.score)}
              footer={<MeterBar pct={c.score} color={meterColor(c.score)} />}
              detail={{
                blurb: BRIEFS.crawler_access,
                chart: {
                  kind: "donut",
                  data: [
                    { name: "Allowed", value: c.bots.filter((b) => b.allowed).length, color: "#22c55e" },
                    { name: "Blocked", value: c.bots.filter((b) => !b.allowed).length, color: "#ef4444" },
                  ],
                },
                rowsTitle: "Bot status",
                rows: crawlerRows,
                href: "/readiness/crawlers",
                hrefLabel: "Open Crawlers",
              }}
            />
            <DrillStat
              label="Schema"
              brief={BRIEFS.schema}
              icon={<Code2 className={I} />}
              value={s.score}
              unit="/100"
              tone={toneFor(s.score)}
              footer={<MeterBar pct={s.score} color={meterColor(s.score)} />}
              detail={{
                blurb: BRIEFS.schema,
                chart: {
                  kind: "donut",
                  data: [
                    { name: "Linked", value: sameasLinked.length, color: "#22c55e" },
                    { name: "Missing", value: sameasMissing.length, color: "#E6E6E6" },
                  ],
                },
                rowsTitle: "sameAs profiles and JSON-LD types",
                rows: schemaRows.slice(0, 40),
                href: "/readiness/schema",
                hrefLabel: "Open Schema",
              }}
            />
            <DrillStat
              label="llms.txt"
              brief={BRIEFS.llms_txt}
              icon={<FileText className={I} />}
              value={l.score}
              unit="/100"
              tone={toneFor(l.score)}
              sub={l.present ? `Present${l.sections != null ? ` · ${l.sections} sections` : ""}` : "Missing"}
              footer={<MeterBar pct={l.score} color={meterColor(l.score)} />}
              detail={{
                blurb: BRIEFS.llms_txt,
                chart: {
                  kind: "donut",
                  data: [
                    { name: "Pass", value: llmsRows.filter((r) => r.tag === "pass").length, color: "#22c55e" },
                    { name: "Fail", value: llmsRows.filter((r) => r.tag === "fail").length, color: "#ef4444" },
                  ],
                },
                rowsTitle: "Quality checklist",
                rows: llmsRows,
                href: "/readiness/llms-txt",
                hrefLabel: "Open llms.txt",
              }}
            />
          </div>
        </div>

        {/* Crawler access */}
        <div>
          <Section label="Crawler access" />
          <Card className="p-5 mt-2">
            <Title
              brief={BRIEFS.crawler_access}
              hint={`robots.txt at ${site.domain}`}
              right={<ScorePill value={c.score} suffix="/100" />}
            >
              AI Crawler Access
            </Title>
            <div className="space-y-4">
              {tier1.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                    Tier 1: Answer engines (GPTBot, ClaudeBot, PerplexityBot, Google-Extended)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tier1.map((b) => (
                      <span
                        key={b.name}
                        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                          b.allowed
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {b.allowed
                          ? <CheckCircle2 className="w-3 h-3 shrink-0" />
                          : <XCircle className="w-3 h-3 shrink-0" />}
                        {b.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {tier2.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                    Tier 2: Secondary crawlers
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tier2.map((b) => (
                      <span
                        key={b.name}
                        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                          b.allowed
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {b.allowed
                          ? <CheckCircle2 className="w-3 h-3 shrink-0" />
                          : <XCircle className="w-3 h-3 shrink-0" />}
                        {b.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[12px] text-slate-500 pt-1 border-t border-slate-100">
                {c.score >= 90
                  ? "All major AI crawlers can reach the site. Invisibility is content and entity signals, not a crawl block."
                  : c.score >= 60
                  ? "Most crawlers are allowed, but some tier-1 engines are still blocked. Fix robots.txt before optimizing content."
                  : "Several priority AI crawlers are blocked in robots.txt. This is the highest-leverage fix: content and schema improvements have no effect if crawlers cannot reach the site."}
              </p>
            </div>
          </Card>
        </div>

        {/* Entity recognition */}
        <div>
          <Section label="Entity recognition" />
          <Card className="p-5 mt-2">
            <Title
              brief={BRIEFS.schema}
              hint="Schema.org JSON-LD and sameAs profiles that AI engines use to resolve the brand as a trusted entity"
              right={<ScorePill value={s.score} suffix="/100" />}
            >
              Entity Recognition
            </Title>
            {s.reachable === false ? (
              <p className="text-sm text-slate-400">{s.note || "Could not reach site to check schema."}</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {s.has_organization ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Organization schema present
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
                      <XCircle className="w-4 h-4 shrink-0" />
                      No Organization schema found
                    </span>
                  )}
                  {s.types && s.types.length > 0 && (
                    <div className="flex flex-wrap gap-1 ml-2">
                      {s.types.map((t) => (
                        <Badge key={t} variant="neutral">{t}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                    sameAs profiles ({sameasLinked.length} linked{sameasMissing.length > 0 ? `, ${sameasMissing.length} missing` : ""})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sameasLinked.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium"
                      >
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        {t}
                      </span>
                    ))}
                    {sameasMissing.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-400 font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-[12px] text-slate-500 pt-1 border-t border-slate-100">
                  {s.score < 40
                    ? "Weak entity signals likely cost unbranded prompt coverage. Add Organization JSON-LD with sameAs links to Wikipedia, LinkedIn, Crunchbase, and Wikidata."
                    : s.score < 70
                    ? "Partial entity coverage. Filling in missing sameAs profiles will lift AI recognition on queries that do not use the exact brand name."
                    : "Solid entity coverage. AI engines can reliably resolve the brand across unbranded and category queries."}
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Fix list */}
        <div>
          <Section label="Fix list" />
          <Card className="p-5 mt-2">
            <Title brief={BRIEFS.issues}>Prioritized fixes</Title>
            <ol className="space-y-3">
              {fixes.map((fix, i) => (
                <li key={fix.key}>
                  <Link
                    href={fix.href}
                    className="flex items-start gap-4 border border-slate-200 rounded-lg p-4 ds-card-hover group"
                  >
                    <div className="text-lg font-bold text-brand tnum w-6 text-center shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink leading-snug">{fix.title}</div>
                      <div className="text-[12px] text-slate-500 mt-1 leading-relaxed">{fix.description}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand transition-colors shrink-0 mt-1" />
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        </div>

      </div>
    </>
  );
}
