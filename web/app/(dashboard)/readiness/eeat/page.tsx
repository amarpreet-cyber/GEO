import { BadgeCheck, Microscope, Award, ShieldCheck, Sparkles } from "lucide-react";
import { getScore, getEeat, hasData } from "@/lib/data";
import { BRIEFS } from "@/lib/metricBriefs";
import { Card, Title, Section, PageHeader, NoData, MeterBar, Badge, ScorePill } from "@/components/ui";
import { DrillStat } from "@/components/DrillStat";
import type { DrillRow } from "@/lib/drill";

type Pillars = { experience: number; expertise: number; authoritativeness: number; trust: number };

const PILLARS: { key: keyof Pillars; label: string; icon: typeof Sparkles; blurb: string }[] = [
  { key: "experience", label: "Experience", icon: Sparkles, blurb: "First-hand proof: deployments, named practices, real outcomes." },
  { key: "expertise", label: "Expertise", icon: Microscope, blurb: "Demonstrated domain depth: oncology RCM specifics, citations, technical authority." },
  { key: "authoritativeness", label: "Authoritativeness", icon: Award, blurb: "Third-party recognition: earned media, analyst coverage, partners." },
  { key: "trust", label: "Trust", icon: ShieldCheck, blurb: "Safety signals: HIPAA/SOC2, clear ownership, schema, honest claims." },
];

const PILLAR_ACCENTS: Record<keyof Pillars, string> = {
  experience: "#0056D6",
  expertise: "#3b82f6",
  authoritativeness: "#10b981",
  trust: "#CA8A04",
};

const I = "w-3.5 h-3.5";

export default function Eeat() {
  if (!hasData()) return <NoData />;

  const doc = getEeat();
  const measured = !!doc && doc.score != null;
  const score = doc?.score ?? getScore()?.components?.find((c) => c.key === "eeat")?.value ?? 0;
  const pillars: Pillars = {
    experience: doc?.pillars?.experience ?? Math.round(score * 0.85),
    expertise: doc?.pillars?.expertise ?? Math.round(score * 1.1),
    authoritativeness: doc?.pillars?.authoritativeness ?? Math.round(score * 0.95),
    trust: doc?.pillars?.trust ?? Math.round(score * 1.05),
  };

  // Bar chart: 4 pillars
  const pillarBar = [
    { name: "Experience", value: pillars.experience },
    { name: "Expertise", value: pillars.expertise },
    { name: "Authoritativeness", value: pillars.authoritativeness },
    { name: "Trust", value: pillars.trust },
  ];

  // Page rows (external links) when measured
  const pageRows: DrillRow[] = measured && doc!.pages.length > 0
    ? [...doc!.pages].sort((a, b) => a.score - b.score).slice(0, 40).map((pg): DrillRow => ({
        label: pg.title || pg.url,
        sub: pg.url,
        value: pg.score,
        href: pg.url,
        external: true,
      }))
    : [];

  return (
    <>
      <PageHeader
        title="Content E-E-A-T"
        subtitle="Experience, Expertise, Authoritativeness, Trust -- what Google and AI engines weigh before trusting a source."
        right={<Badge variant={measured ? "success" : "warn"}>{measured ? "measured" : "estimated"}</Badge>}
      />

      <div className="space-y-6">
        {/* E-E-A-T score */}
        <div>
          <Section label="E-E-A-T score" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger mt-2">
            <DrillStat
              label="E-E-A-T score"
              brief={BRIEFS.eeat}
              icon={<BadgeCheck className={I} />}
              value={Number(score)}
              unit="/100"
              tone={score >= 70 ? "good" : score >= 45 ? "warn" : "bad"}
              footer={<MeterBar pct={score} color={score >= 70 ? "#22c55e" : score >= 45 ? "#CA8A04" : "#ef4444"} />}
              detail={{
                blurb: BRIEFS.eeat,
                chart: { kind: "bar", unit: "/100", data: pillarBar },
                rowsTitle: measured ? "Per-page E-E-A-T scores" : "Pillar breakdown",
                rows: pageRows.length > 0 ? pageRows : pillarBar.map((p): DrillRow => ({
                  label: p.name,
                  value: p.value,
                })),
                href: "/readiness/eeat",
                hrefLabel: "Open E-E-A-T",
              }}
            />
            <DrillStat
              label="Experience"
              icon={<Sparkles className={I} />}
              value={pillars.experience}
              unit="/100"
              accent="#0056D6"
              footer={<MeterBar pct={pillars.experience} color="#0056D6" />}
              detail={{
                blurb: "First-hand proof: deployments, named practices, real outcomes.",
                chart: { kind: "bar", unit: "/100", data: pillarBar },
                rowsTitle: measured ? "Per-page E-E-A-T scores" : "All pillars",
                rows: pageRows.length > 0 ? pageRows : pillarBar.map((p): DrillRow => ({
                  label: p.name,
                  value: p.value,
                  tag: p.name === "Experience" ? "this pillar" : undefined,
                  tagColor: "#0056D6",
                })),
                href: "/readiness/eeat",
                hrefLabel: "Open E-E-A-T",
              }}
            />
            <DrillStat
              label="Expertise"
              icon={<Microscope className={I} />}
              value={pillars.expertise}
              unit="/100"
              accent="#3b82f6"
              footer={<MeterBar pct={pillars.expertise} color="#3b82f6" />}
              detail={{
                blurb: "Demonstrated domain depth: oncology RCM specifics, citations, technical authority.",
                chart: { kind: "bar", unit: "/100", data: pillarBar },
                rowsTitle: measured ? "Per-page E-E-A-T scores" : "All pillars",
                rows: pageRows.length > 0 ? pageRows : pillarBar.map((p): DrillRow => ({
                  label: p.name,
                  value: p.value,
                  tag: p.name === "Expertise" ? "this pillar" : undefined,
                  tagColor: "#3b82f6",
                })),
                href: "/readiness/eeat",
                hrefLabel: "Open E-E-A-T",
              }}
            />
            <DrillStat
              label="Authoritativeness"
              icon={<Award className={I} />}
              value={pillars.authoritativeness}
              unit="/100"
              accent="#10b981"
              footer={<MeterBar pct={pillars.authoritativeness} color="#10b981" />}
              detail={{
                blurb: "Third-party recognition: earned media, analyst coverage, partners.",
                chart: { kind: "bar", unit: "/100", data: pillarBar },
                rowsTitle: measured ? "Per-page E-E-A-T scores" : "All pillars",
                rows: pageRows.length > 0 ? pageRows : pillarBar.map((p): DrillRow => ({
                  label: p.name,
                  value: p.value,
                  tag: p.name === "Authoritativeness" ? "this pillar" : undefined,
                  tagColor: "#10b981",
                })),
                href: "/readiness/eeat",
                hrefLabel: "Open E-E-A-T",
              }}
            />
          </div>
        </div>

        {/* The four pillars */}
        <div>
          <Section label="The four pillars" />
          <Card className="p-5 mt-2">
            <Title
              brief={
                measured
                  ? "Scored by an LLM reading the actual page copy"
                  : "Estimated from entity and citability signals -- run the content scan for measured pillars"
              }
            >
              Pillar breakdown
            </Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {PILLARS.map((p) => (
                <div key={p.key} className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0 bg-brand-light text-brand">
                    <p.icon className="w-4.5 h-4.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">{p.label}</span>
                      <span className="text-sm tnum text-slate-600">{pillars[p.key]}/100</span>
                    </div>
                    <div className="mt-1.5">
                      <MeterBar pct={pillars[p.key]} color={PILLAR_ACCENTS[p.key]} />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{p.blurb}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Page scores -- only when measured and pages exist */}
        {measured && doc!.pages.length > 0 && (
          <div>
            <Section label="Page scores" />
            <Card className="p-5 mt-2">
              <Title brief="Per-page E-E-A-T scores, lowest first -- the rewrite worklist.">Page scores</Title>
              <div className="space-y-2">
                {[...doc!.pages].sort((a, b) => a.score - b.score).map((pg) => (
                  <div key={pg.url} className="flex items-start gap-3 border border-slate-200 rounded-lg p-3 ds-card-hover">
                    <ScorePill value={pg.score} suffix="/100" thresholds={[45, 70]} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{pg.title || pg.url}</div>
                      <a
                        href={pg.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-brand hover:underline truncate block"
                      >
                        {pg.url}
                      </a>
                      {pg.note && <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{pg.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-3">
                Scanned {new Date(doc!.fetched_at).toLocaleString()}{doc!.note ? ` · ${doc!.note}` : ""}
              </p>
            </Card>
          </div>
        )}

        {/* Run the content scan -- only when not measured */}
        {!measured && (
          <div>
            <Section label="Run the content scan" />
            <Card className="p-5 mt-2">
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0 bg-brand-light text-brand">
                  <Microscope className="w-4.5 h-4.5" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-ink">Run the content scan for measured scores</div>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                    The dedicated module reads key pages with an LLM and scores each pillar on the actual copy: bylines, credentials, citations, claims.
                  </p>
                  <code className="inline-block mt-2.5 text-xs font-mono bg-slate-100 text-slate-700 px-2 py-1 rounded">
                    python run.py eeat
                  </code>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
