import Link from "next/link";
import { Building2, Tag, Swords, ArrowRight, Globe, Cpu } from "lucide-react";
import { getSummary, getCompetitors, getPrompts, hasData } from "@/lib/data";
import {
  Section, Card, Title, PageHeader, NoData, KeyRow, Badge, MeterBar,
} from "@/components/ui";

const SIDE_COLOR: Record<string, string> = {
  provider: "#10b981",
  payer: "#ef4444",
  horizontal: "#5C5C5C",
};

export default function Settings() {
  if (!hasData()) return <NoData />;
  const summary = getSummary();
  const competitors = getCompetitors();
  const prompts = getPrompts();
  const topics = Object.keys(summary?.by_topic || {}).filter(
    (t) => t && t !== "(unspecified)"
  );
  const personas = Object.entries(summary?.by_persona || {});
  const engines = summary?.generated_engines || [];

  const byCat: Record<string, typeof competitors> = {};
  competitors.forEach((c) => (byCat[c.category || "other"] ||= []).push(c));

  const maxVisibility = Math.max(
    ...personas.map(([, v]) => v.visibility_score),
    1
  );

  return (
    <>
      <PageHeader
        title="Project Settings"
        subtitle="The brand model driving this tracker. Read from config/risa.yaml. Swap that file to retarget."
        right={
          <div className="flex items-center gap-2">
            <Badge variant="neutral">read-only</Badge>
            <Link
              href="/settings/runs"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg transition press"
            >
              Run history <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        }
      />

      <div className="space-y-6">
        {/* ── Brand identity ── */}
        <div>
          <Section label="Brand identity" />
          <div className="grid grid-cols-12 gap-5 mt-2">
            <Card className="col-span-12 lg:col-span-4 p-5">
              <Title brief="Entity identity matched in AI answers, including aliases and owned domains.">
                <span className="inline-flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand" /> Brand
                </span>
              </Title>
              <KeyRow k="Name" v={summary?.brand ?? "—"} />
              <KeyRow k="Domain" v="risalabs.ai" />
              <KeyRow k="Prompts tracked" v={summary?.prompts_count ?? prompts.length} />
              <KeyRow k="Competitors tracked" v={competitors.length} />
              <KeyRow k="Topics" v={topics.length} />
            </Card>

            <Card className="col-span-12 lg:col-span-4 p-5">
              <Title brief="AI engines queried in the pipeline. More engines give a more robust visibility signal.">
                <span className="inline-flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-brand" /> Engines
                </span>
              </Title>
              {engines.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {engines.map((e) => (
                    <span
                      key={e}
                      className="inline-flex items-center gap-1.5 text-xs font-medium bg-brand-light text-brand px-3 py-1.5 rounded-lg"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                      {e}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 mt-2">No engines configured.</p>
              )}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  Add engines in <code className="bg-slate-100 px-1 rounded">config/risa.yaml</code> under the <code className="bg-slate-100 px-1 rounded">engines</code> key.
                </div>
              </div>
            </Card>

            <Card className="col-span-12 lg:col-span-4 p-5">
              <Title brief="Owned domain properties that anchor brand mentions in AI citation graphs.">
                <span className="inline-flex items-center gap-2">
                  <Globe className="w-4 h-4 text-brand" /> Properties
                </span>
              </Title>
              {[
                { label: "Primary", url: "risalabs.ai" },
                { label: "Docs", url: "docs.risalabs.ai" },
              ].map((p) => (
                <div
                  key={p.label}
                  className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0"
                >
                  <span className="text-[12px] text-slate-500">{p.label}</span>
                  <a
                    href={`https://${p.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-brand hover:underline font-medium"
                  >
                    {p.url}
                  </a>
                </div>
              ))}
            </Card>
          </div>
        </div>

        {/* ── Personas ── */}
        <div>
          <Section label="Buyer personas" />
          <div className="mt-2">
            {personas.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
                {personas.map(([id, v]) => {
                  const visPct = (v.visibility_score / maxVisibility) * 100;
                  return (
                    <div
                      key={id}
                      className="ds-card ds-card-hover p-4"
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="text-sm font-bold text-ink uppercase tracking-wide">
                            {id}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {v.prompts} prompts
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-lg font-semibold tnum text-ink leading-none">
                            {v.visibility_score.toFixed(0)}
                          </div>
                          <div className="text-[10px] text-slate-400">visibility</div>
                        </div>
                      </div>
                      <MeterBar pct={visPct} />
                      <div className="flex justify-between mt-2 text-[11px] text-slate-400">
                        <span>{v.mention_rate.toFixed(0)}% mention rate</span>
                        <span>{v.visibility_score.toFixed(0)}/100</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Card className="p-5">
                <p className="text-sm text-slate-400">
                  No persona data found. Add personas to your config/risa.yaml.
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* ── Competitive set ── */}
        <div>
          <Section
            label="Competitive set"
            right={
              <span className="text-[11px] text-slate-400">
                {competitors.length} tracked
              </span>
            }
          />
          <Card className="p-5 mt-2">
            <Title
              brief={`${competitors.length} tracked competitors, grouped by category. Drives share-of-voice and gap analysis.`}
            >
              <span className="inline-flex items-center gap-2">
                <Swords className="w-4 h-4 text-brand" /> By category
              </span>
            </Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              {Object.entries(byCat).map(([cat, list]) => (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] uppercase tracking-wide font-semibold text-slate-400">
                      {cat}
                    </span>
                    <span className="text-[10px] text-slate-300">({list.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((c) => (
                      <span
                        key={c.competitor}
                        className="inline-flex items-center gap-1.5 text-xs bg-white border border-slate-200 px-2 py-1 rounded-lg ds-card-hover"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: SIDE_COLOR[c.side] || "#8A8A8A" }}
                        />
                        {c.competitor}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-5">
              {Object.entries(SIDE_COLOR).map(([k, color]) => (
                <span key={k} className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                  {k}
                </span>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Topic taxonomy ── */}
        <div>
          <Section
            label="Topic taxonomy"
            right={
              <span className="text-[11px] text-slate-400">{topics.length} topics</span>
            }
          />
          <Card className="p-5 mt-2">
            <Title
              brief="Themes RISA visibility is rolled up against. Defined in the prompt config."
            >
              <span className="inline-flex items-center gap-2">
                <Tag className="w-4 h-4 text-brand" /> Topics
              </span>
            </Title>
            {topics.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {topics.map((t) => (
                  <span
                    key={t}
                    className="text-xs bg-brand-light text-brand px-2.5 py-1 rounded-lg"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No topics defined in config.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
