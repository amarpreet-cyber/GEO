import { Award, Share2, ShieldCheck, Globe2 } from "lucide-react";
import { getCitations, getSiteAudit, getScore, getSummary, getBrandPresence, hasData } from "@/lib/data";
import { Card, Title, Section, PageHeader, NoData, MeterBar, GradeChip, Badge, EmptyState } from "@/components/ui";
import { DrillStat } from "@/components/DrillStat";
import { gradeFor } from "@/lib/derive";
import { BRIEFS } from "@/lib/metricBriefs";
import type { DrillRow } from "@/lib/drill";

const CLASS_COLOR: Record<string, string> = { owned: "#10b981", earned: "#3b82f6", competitor: "#ef4444", social: "#5C5C5C" };

const PROFILE_LABEL: Record<string, string> = {
  "linkedin.com": "LinkedIn", "crunchbase.com": "Crunchbase", "wikipedia.org": "Wikipedia",
  "wikidata.org": "Wikidata", "youtube.com": "YouTube", "github.com": "GitHub",
  "x.com": "X / Twitter", "twitter.com": "Twitter",
};

export default function Authority() {
  if (!hasData()) return <NoData />;
  const cites = getCitations().map((r) => ({ domain: r.domain, class: r.class, citations: Number(r.citations) }));
  const audit = getSiteAudit();
  const score = getScore();
  const summary = getSummary();
  const presence = getBrandPresence();

  const brandComp = score?.components?.find((c) => c.key === "brand");
  const brandScore = brandComp?.value ?? 0;
  const measured = !!presence && !!brandComp?.measured;

  const linked = new Set(audit?.schema?.sameas_linked || []);
  const missing = audit?.schema?.sameas_missing || [];
  const allProfiles = [...linked, ...missing];

  const ownedCites = cites.filter((c) => c.class === "owned");
  const earnedCites = cites.filter((c) => c.class === "earned");
  const socialCites = cites.filter((c) => c.class === "social");
  const owned = ownedCites.reduce((a, c) => a + c.citations, 0);
  const earned = earnedCites.reduce((a, c) => a + c.citations, 0);
  const social = socialCites.reduce((a, c) => a + c.citations, 0);

  const compDomains = cites.filter((c) => c.class === "competitor").sort((a, b) => b.citations - a.citations);
  const maxC = Math.max(...compDomains.map((c) => c.citations), owned + earned, 1);
  const I = "w-3.5 h-3.5";

  // level-3 rows: owned + earned domains as external links
  const ownedEarnedRows: DrillRow[] = [...ownedCites, ...earnedCites]
    .sort((a, b) => b.citations - a.citations)
    .slice(0, 50)
    .map((c) => ({
      label: c.domain,
      value: c.citations,
      tag: c.class,
      tagColor: CLASS_COLOR[c.class] || "#8A8A8A",
      href: `https://${c.domain}`,
      external: true,
    }));

  // level-3 rows: earned domains only
  const earnedRows: DrillRow[] = earnedCites
    .sort((a, b) => b.citations - a.citations)
    .slice(0, 50)
    .map((c) => ({
      label: c.domain,
      value: c.citations,
      tag: "earned",
      tagColor: CLASS_COLOR.earned,
      href: `https://${c.domain}`,
      external: true,
    }));

  // level-3 rows: social domains as external links
  const socialRows: DrillRow[] = socialCites
    .sort((a, b) => b.citations - a.citations)
    .slice(0, 50)
    .map((c) => ({
      label: c.domain,
      value: c.citations,
      tag: "social",
      tagColor: CLASS_COLOR.social,
      href: `https://${c.domain}`,
      external: true,
    }));

  // level-3 rows: brand presence platforms with real URLs
  const platformRows: DrillRow[] | null = presence
    ? presence.platforms.slice(0, 50).map((p) => {
        // use the platform's own url field if present, otherwise construct from key
        const url = (p as { url?: string }).url || `https://${p.key}`;
        return {
          label: p.label,
          value: p.present ? "present" : "missing",
          sub: p.signal,
          tag: p.present ? "live" : "missing",
          tagColor: p.present ? "#10b981" : "#8A8A8A",
          href: url,
          external: true,
        };
      })
    : null;

  // Wikipedia / Wikidata rows
  const wikiRows: DrillRow[] = [];
  if (presence?.wikipedia.present && presence.wikipedia.url) {
    wikiRows.push({
      label: "Wikipedia",
      value: "present",
      sub: presence.wikipedia.title,
      tag: "live",
      tagColor: "#10b981",
      href: presence.wikipedia.url,
      external: true,
    });
  } else {
    wikiRows.push({
      label: "Wikipedia",
      value: "missing",
      tag: "missing",
      tagColor: "#8A8A8A",
      href: "https://wikipedia.org",
      external: true,
    });
  }
  if (presence?.wikidata.present && presence.wikidata.id) {
    wikiRows.push({
      label: "Wikidata",
      value: "present",
      sub: presence.wikidata.id,
      tag: "live",
      tagColor: "#10b981",
      href: `https://www.wikidata.org/wiki/${presence.wikidata.id}`,
      external: true,
    });
  } else {
    wikiRows.push({
      label: "Wikidata",
      value: "missing",
      tag: "missing",
      tagColor: "#8A8A8A",
      href: "https://www.wikidata.org",
      external: true,
    });
  }

  // bar chart for authority score breakdown (owned + earned vs competitors)
  const authorityBarData = [
    { name: "RISA owned", value: owned, color: CLASS_COLOR.owned },
    { name: "RISA earned", value: earned, color: CLASS_COLOR.earned },
    { name: "RISA social", value: social, color: CLASS_COLOR.social },
  ].filter((d) => d.value > 0);

  return (
    <>
      <PageHeader
        title="Brand Authority"
        subtitle="Off-site signals AI engines use to recognise and trust RISA as an entity, benchmarked against rivals."
        right={<GradeChip grade={gradeFor(brandScore)} />}
      />

      <div className="space-y-6">

        {/* KPI tiles */}
        <div>
          <Section label="Authority signals" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger mt-2">
            <DrillStat
              label="Authority score"
              brief={BRIEFS.brand_authority}
              icon={<Award className={I} />}
              value={brandScore}
              decimals={0}
              suffix="/100"
              tone={brandScore >= 70 ? "good" : brandScore >= 40 ? "warn" : "bad"}
              footer={<MeterBar pct={brandScore} color={brandScore >= 70 ? "#10b981" : brandScore >= 40 ? "#CA8A04" : "#ef4444"} />}
              sub={measured ? "off-site entity scan" : "estimated"}
              detail={{
                blurb: BRIEFS.brand_authority,
                chart: authorityBarData.length > 0
                  ? { kind: "bar", unit: "citations", data: authorityBarData }
                  : undefined,
                rowsTitle: "Owned and earned authority domains",
                rows: ownedEarnedRows,
                href: "/citations",
                hrefLabel: "Open Citations",
              }}
            />
            <DrillStat
              label="Wikipedia / Wikidata"
              brief="Presence on Wikipedia and Wikidata — the two canonical entity records AI engines prioritise for entity resolution."
              icon={<Globe2 className={I} />}
              value={(presence?.wikipedia.present ? 1 : 0) + (presence?.wikidata.present ? 1 : 0)}
              suffix="/2"
              accent={presence?.wikipedia.present ? "#10b981" : "#ef4444"}
              tone={presence?.wikipedia.present ? "good" : "bad"}
              sub="canonical entity records"
              detail={presence ? {
                blurb: "Wikipedia and Wikidata are the canonical entity records AI engines use for entity resolution.",
                rowsTitle: "Entity records",
                rows: wikiRows,
              } : undefined}
            />
            <DrillStat
              label="Earned citations"
              brief={BRIEFS.earned}
              icon={<ShieldCheck className={I} />}
              value={earned}
              accent="#3b82f6"
              sub="third-party authority"
              detail={{
                blurb: BRIEFS.earned,
                chart: {
                  kind: "bar",
                  unit: "citations",
                  data: earnedCites.slice(0, 10).map((c) => ({ name: c.domain, value: c.citations, color: CLASS_COLOR.earned })),
                },
                rowsTitle: "Earned citation domains",
                rows: earnedRows,
              }}
            />
            <DrillStat
              label="Social citations"
              brief={BRIEFS.social}
              icon={<Share2 className={I} />}
              value={social}
              accent="#5C5C5C"
              tone={social < 3 ? "bad" : undefined}
              sub="Reddit, YouTube, forums"
              detail={presence ? {
                blurb: "Brand presence across social and community platforms AI engines use for entity signals.",
                chart: {
                  kind: "bar",
                  unit: "citations",
                  data: socialCites.slice(0, 10).map((c) => ({ name: c.domain, value: c.citations, color: CLASS_COLOR.social })),
                },
                rowsTitle: "Platform presence",
                rows: platformRows || socialRows,
              } : {
                blurb: "Social citations across Reddit, YouTube, forums and community platforms.",
                chart: {
                  kind: "bar",
                  unit: "citations",
                  data: socialCites.slice(0, 10).map((c) => ({ name: c.domain, value: c.citations, color: CLASS_COLOR.social })),
                },
                rowsTitle: "Social citation domains",
                rows: socialRows,
              }}
            />
          </div>
        </div>

        {/* Platform reach + authority footprint */}
        <div>
          <Section label="Off-site footprint" />
          <div className="grid grid-cols-12 gap-5 mt-2 stagger">
            <Card className="col-span-12 lg:col-span-6 p-5">
              <Title
                brief="Platforms AI engines use to resolve an entity. Presence here directly improves entity confidence and citability."
                right={<GradeChip grade={gradeFor(brandScore)} />}
              >
                Platform reach
              </Title>
              {presence ? (
                <div className="space-y-3">
                  {presence.platforms.map((p) => (
                    <div key={p.key} className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${p.present ? "bg-emerald-500" : "bg-slate-300"}`} />
                      <span className="w-24 shrink-0 text-sm text-slate-700 truncate">{p.label}</span>
                      <div className="flex-1">
                        <MeterBar pct={p.present ? 100 : 0} color={p.present ? "#10b981" : "#D6D6D6"} />
                      </div>
                      <span className={`w-28 text-right text-[11px] truncate ${p.present ? "text-emerald-600 font-medium" : "text-slate-400"}`}>{p.signal}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No brand presence data"
                  hint="Run the brand scan to populate off-site platform reach."
                  command="python run.py brand"
                />
              )}

              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-3">sameAs links on the homepage</div>
                <div className="flex flex-wrap gap-2">
                  {[...linked].map((p) => (
                    <span key={p} className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{PROFILE_LABEL[p] || p}
                    </span>
                  ))}
                  {missing.map((p) => (
                    <span key={p} className="inline-flex items-center gap-1.5 text-xs bg-slate-100 text-slate-400 px-2.5 py-1 rounded-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />{PROFILE_LABEL[p] || p}
                    </span>
                  ))}
                  {allProfiles.length === 0 && <span className="text-xs text-slate-400">none detected</span>}
                </div>
              </div>

              {brandScore === 0 && (
                <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
                  Zero AI-resolvable footprint. RISA likely has these profiles, but without sameAs links or citations the engines cannot connect them. Linking is the single fastest authority win.
                </p>
              )}
            </Card>

            <Card className="col-span-12 lg:col-span-6 p-5 flex flex-col">
              <Title brief="Citations to RISA-owned vs each rival's own domains. Bigger means more self-published authority the engine trusts.">
                Authority footprint vs rivals
              </Title>
              <div className="space-y-2">
                <div className="flex items-center gap-3 bg-brand-light ring-1 ring-inset ring-brand/15 rounded-lg px-2 py-1.5">
                  <span className="w-28 shrink-0 truncate text-sm font-semibold text-ink">RISA (owned+earned)</span>
                  <div className="flex-1 h-2.5 rounded-full bg-white/60 overflow-hidden">
                    <div className="h-full rounded-full meter-fill bg-brand" style={{ width: `${(100 * (owned + earned)) / maxC}%` }} />
                  </div>
                  <span className="w-12 text-right tnum text-sm text-brand font-semibold">{owned + earned}</span>
                </div>
                {compDomains.slice(0, 10).map((c) => (
                  <div key={c.domain} className="flex items-center gap-3 px-2 py-1.5 rounded-lg ds-card-hover">
                    <span className="w-28 shrink-0 truncate text-sm text-slate-700">{c.domain}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full meter-fill bg-competitor" style={{ width: `${(100 * c.citations) / maxC}%` }} />
                    </div>
                    <span className="w-12 text-right tnum text-sm text-slate-600">{c.citations}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-4 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand" /> RISA</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-competitor" /> competitor-owned</span>
                <span className="ml-auto">{summary?.top_competitors?.length || 0} rivals tracked</span>
              </div>

              {presence && presence.competitors.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-3">Entity records vs rivals</div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-28 shrink-0 truncate font-semibold text-ink">RISA Labs</span>
                      <Badge variant={presence.wikipedia.present ? "success" : "danger"}>
                        {presence.wikipedia.present ? "Wikipedia" : "no Wikipedia"}
                      </Badge>
                      <Badge variant={presence.wikidata.present ? "success" : "neutral"}>
                        {presence.wikidata.present ? "Wikidata" : "no Wikidata"}
                      </Badge>
                    </div>
                    {presence.competitors.map((c) => (
                      <div key={c.name} className="flex items-center gap-2 text-xs">
                        <span className="w-28 shrink-0 truncate text-slate-600">{c.name}</span>
                        <Badge variant={c.wikipedia ? "success" : "neutral"}>{c.wikipedia ? "Wikipedia" : "—"}</Badge>
                        <Badge variant={c.wikidata ? "success" : "neutral"}>{c.wikidata ? "Wikidata" : "—"}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

      </div>
    </>
  );
}
