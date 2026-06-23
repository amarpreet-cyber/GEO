import { Code2, Boxes, Link2, Building2 } from "lucide-react";
import { getSiteAudit, hasData } from "@/lib/data";
import { BRIEFS } from "@/lib/metricBriefs";
import {
  Card, Title, Section, PageHeader, NoData, MeterBar, Badge,
} from "@/components/ui";
import { DrillStat } from "@/components/DrillStat";
import type { DrillRow } from "@/lib/drill";

const SUGGESTED_JSONLD = `{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "RISA Labs",
  "url": "https://risalabs.ai",
  "description": "AI operating system for oncology -- auth-to-cash across medical prior authorization and drug economics.",
  "sameAs": [
    "https://www.linkedin.com/company/risa-labs",
    "https://www.crunchbase.com/organization/risa-labs",
    "https://en.wikipedia.org/wiki/RISA_Labs",
    "https://www.youtube.com/@risalabs"
  ]
}`;

const PROFILE_LABEL: Record<string, string> = {
  "linkedin.com": "LinkedIn", "crunchbase.com": "Crunchbase", "wikipedia.org": "Wikipedia",
  "wikidata.org": "Wikidata", "youtube.com": "YouTube", "github.com": "GitHub",
  "x.com": "X / Twitter", "twitter.com": "Twitter",
};

export default function Schema() {
  const site = getSiteAudit();
  if (!hasData() || !site) return <NoData />;

  const s = site.schema;
  const linked = s.sameas_linked || [];
  const missing = s.sameas_missing || [];
  const I = "w-3.5 h-3.5";

  // sameAs rows: linked = external links, missing = no href
  const sameAsRows: DrillRow[] = [
    ...linked.map((p): DrillRow => ({
      label: PROFILE_LABEL[p] || p,
      sub: p,
      tag: "linked",
      tagColor: "#22c55e",
      value: "present",
      href: p.startsWith("http") ? p : `https://${p}`,
      external: true,
    })),
    ...missing.map((p): DrillRow => ({
      label: PROFILE_LABEL[p] || p,
      sub: p,
      tag: "missing",
      tagColor: "#8A8A8A",
      value: "absent",
    })),
  ];

  // JSON-LD blocks rows: types as labels
  const jsonLdRows: DrillRow[] = (s.types || []).map((t): DrillRow => ({
    label: t,
    sub: "JSON-LD type found on page",
    tag: "JSON-LD",
    tagColor: "#3b82f6",
    value: "detected",
  }));

  // Combined rows for schema score tile
  const schemaDetailRows: DrillRow[] = [...sameAsRows, ...jsonLdRows].slice(0, 40);

  return (
    <>
      <PageHeader
        title="Schema and Entity Signals"
        subtitle={site.domain}
      />

      <div className="space-y-6">
        {/* Schema scores */}
        <div>
          <Section label="Schema scores" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger mt-2">
            <DrillStat
              label="Schema score"
              brief={BRIEFS.schema}
              icon={<Code2 className={I} />}
              value={s.score}
              unit="/100"
              tone={s.score >= 60 ? "good" : s.score >= 30 ? "warn" : "bad"}
              footer={<MeterBar pct={s.score} color={s.score >= 60 ? "#22c55e" : s.score >= 30 ? "#CA8A04" : "#ef4444"} />}
              detail={{
                blurb: BRIEFS.schema,
                chart: {
                  kind: "donut",
                  data: [
                    { name: "Linked", value: linked.length, color: "#22c55e" },
                    { name: "Missing", value: missing.length, color: "#E6E6E6" },
                  ],
                },
                rowsTitle: "sameAs profiles and JSON-LD types",
                rows: schemaDetailRows,
                href: "/readiness/schema",
                hrefLabel: "Open Schema",
              }}
            />
            <DrillStat
              label="JSON-LD blocks"
              icon={<Boxes className={I} />}
              value={s.jsonld_blocks ?? 0}
              accent="#3b82f6"
              sub={(s.types || []).join(", ") || "none"}
              detail={{
                blurb: "Number of JSON-LD script blocks found on the page. Each block corresponds to a Schema.org type.",
                chart: {
                  kind: "donut",
                  data: (s.types || []).length > 0
                    ? (s.types || []).map((t, i) => ({
                        name: t,
                        value: 1,
                        color: ["#3b82f6", "#0056D6", "#10b981", "#CA8A04", "#ef4444"][i % 5],
                      }))
                    : [{ name: "No blocks", value: 1, color: "#E6E6E6" }],
                },
                rowsTitle: "Detected JSON-LD types",
                rows: jsonLdRows.length > 0 ? jsonLdRows : [{ label: "No JSON-LD blocks found", value: "none" }],
                href: "/readiness/schema",
                hrefLabel: "Open Schema",
              }}
            />
            <DrillStat
              label="Organization schema"
              brief="Organization type is the core entity anchor for AI"
              icon={<Building2 className={I} />}
              value={s.has_organization ? 1 : 0}
              accent={s.has_organization ? "#22c55e" : "#ef4444"}
              tone={s.has_organization ? "good" : "bad"}
              sub={s.has_organization ? "present" : "missing"}
              detail={{
                blurb: "The Organization schema type is the entity anchor AI uses to resolve who RISA is. Without it, entity resolution is unreliable.",
                chart: {
                  kind: "donut",
                  data: [
                    { name: s.has_organization ? "Present" : "Missing", value: 1, color: s.has_organization ? "#22c55e" : "#ef4444" },
                  ],
                },
                rowsTitle: "Detected JSON-LD types",
                rows: jsonLdRows.length > 0 ? jsonLdRows : [{ label: "No JSON-LD blocks found", value: "none" }],
                href: "/readiness/schema",
                hrefLabel: "Open Schema",
              }}
            />
            <DrillStat
              label="sameAs links"
              icon={<Link2 className={I} />}
              value={linked.length}
              accent="#5C5C5C"
              sub={`of ${linked.length + missing.length} profiles`}
              detail={{
                blurb: "sameAs links tell AI engines which external profiles represent the same entity, enabling reliable entity resolution.",
                chart: {
                  kind: "donut",
                  data: [
                    { name: "Linked", value: linked.length, color: "#22c55e" },
                    { name: "Missing", value: missing.length, color: "#E6E6E6" },
                  ],
                },
                rowsTitle: "sameAs profiles",
                rows: sameAsRows.slice(0, 40),
                href: "/readiness/schema",
                hrefLabel: "Open Schema",
              }}
            />
          </div>
        </div>

        {/* sameAs coverage */}
        <div>
          <Section label="sameAs coverage" />
          <div className="mt-2">
            <Card className="p-5">
              <Title hint="Profiles AI cross-references to confirm the entity. Green = present, grey = missing.">
                Profile coverage
              </Title>
              <div className="flex flex-wrap gap-2">
                {linked.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {PROFILE_LABEL[p] || p}
                  </span>
                ))}
                {missing.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1.5 text-xs bg-slate-100 text-slate-400 px-2.5 py-1 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    {PROFILE_LABEL[p] || p}
                  </span>
                ))}
              </div>
              <p className="text-sm text-slate-500 mt-4 leading-relaxed">
                {s.has_organization
                  ? "Organization schema is present, but sameAs coverage is thin. Each missing profile is a cross-link AI cannot follow to confirm RISA as the correct entity."
                  : "No Organization schema means AI has no canonical entity anchor for RISA. This is the single highest-leverage supply-side fix, and should be addressed before building out sameAs links."}
              </p>
            </Card>
          </div>
        </div>

        {/* Suggested Organization JSON-LD */}
        <div>
          <Section label="Suggested Organization JSON-LD" />
          <div className="mt-2">
            <Card className="p-5">
              <Title
                hint="Drop this into the homepage head. Covers the entity plus the missing sameAs profiles."
                right={<Badge variant="brand">geo-schema</Badge>}
              >
                Suggested Organization JSON-LD
              </Title>
              <pre className="text-[11px] leading-relaxed font-mono bg-slate-900 text-slate-100 rounded-xl p-4 overflow-auto max-h-[340px]">
                <code>{SUGGESTED_JSONLD}</code>
              </pre>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
