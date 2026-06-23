import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, MapPin, Building2, Globe, Zap } from "lucide-react";
import { getPrompts, getActionsByPrompt, getDomainClass, hasData } from "@/lib/data";
import { jbool, jparse, num } from "@/lib/derive";
import {
  Card, Title, Section, PageHeader, SentPill, NoData, StatCard,
  Badge, KeyRow, ClassTag, MeterBar,
} from "@/components/ui";
import { BRIEFS } from "@/lib/metricBriefs";

const CLASS_COLOR: Record<string, string> = {
  owned: "#10b981", earned: "#3b82f6", competitor: "#ef4444", social: "#5C5C5C",
};

const I = "w-3.5 h-3.5";

export default function PromptDetail({ params }: { params: { id: string } }) {
  if (!hasData()) return <NoData />;
  const rows = getPrompts();
  const idx = Number(params.id);
  const r = rows[idx];
  if (!r) notFound();

  const comps = jparse(r.competitors_present);
  const domains = jparse(r.cited_domains);
  const domClass = getDomainClass();
  const actions = getActionsByPrompt()[r.prompt] || [];
  const mentioned = jbool(r.brand_mentioned);
  const position = num(r.brand_position);
  const citeCount = domains.length;

  // group domains by class for a quick class breakdown
  const domainsByClass: Record<string, string[]> = {};
  domains.forEach((d) => {
    const k = domClass[d] || "earned";
    (domainsByClass[k] ||= []).push(d);
  });

  return (
    <>
      <PageHeader
        title="Prompt Detail"
        subtitle={r.prompt}
        right={
          <div className="flex items-center gap-2">
            <Badge variant="neutral">{r.engine || "claude"}</Badge>
            {r.topic && <Badge variant="neutral">{r.topic}</Badge>}
          </div>
        }
      />

      <Link
        href="/prompts"
        className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-brand mb-4 transition"
      >
        <ArrowLeft className="w-3 h-3" /> back to library
      </Link>

      <div className="space-y-6">
        {/* ── Position & signal ── */}
        <div>
          <Section label="Signal" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger mt-2">
            <StatCard
              label="Mentioned"
              brief={BRIEFS.win_rate}
              icon={<FileText className={I} />}
              value={mentioned ? 100 : 0}
              suffix="%"
              decimals={0}
              tone={mentioned ? "good" : "bad"}
              accent={mentioned ? "#22c55e" : "#ef4444"}
              sub={mentioned ? "RISA named in this answer" : "RISA absent from this answer"}
            />
            <StatCard
              label="Position"
              brief={BRIEFS.avg_position}
              icon={<MapPin className={I} />}
              value={position > 0 ? position : 0}
              prefix={position > 0 ? "#" : ""}
              suffix={position > 0 ? "" : "—"}
              decimals={0}
              tone={position === 1 ? "good" : position > 0 ? "warn" : "bad"}
              sub={position > 0 ? "in answer" : "not mentioned"}
            />
            <StatCard
              label="Cited domains"
              brief={BRIEFS.cited_domains}
              icon={<Globe className={I} />}
              value={citeCount}
              sub={`${Object.keys(domainsByClass).length} class types`}
            />
            <StatCard
              label="Competitors"
              brief="Number of competitor brands named in the AI answer for this prompt."
              icon={<Building2 className={I} />}
              value={comps.length}
              accent={comps.length > 2 ? "#ef4444" : "#CA8A04"}
              tone={comps.length > 2 ? "bad" : comps.length > 0 ? "warn" : "good"}
              sub={comps.length > 0 ? comps.slice(0, 2).join(", ") : "none named"}
            />
          </div>
        </div>

        {/* ── Metadata + sentiment / competitors / domains ── */}
        <div>
          <Section label="Context" />
          <div className="grid grid-cols-12 gap-5 mt-2">
            {/* Left column: metadata + competitors + domains */}
            <div className="col-span-12 lg:col-span-4 space-y-4">
              {/* Metadata */}
              <Card className="p-4">
                <Title brief="The classification tags attached to this prompt: persona, intent, topic, engine.">
                  Prompt metadata
                </Title>
                <div className="space-y-0.5">
                  <KeyRow k="Persona" v={<Badge>{r.persona?.toUpperCase() || "—"}</Badge>} />
                  <KeyRow k="Intent" v={<Badge variant="brand">{r.intent || "—"}</Badge>} />
                  {r.topic && <KeyRow k="Topic" v={<span className="text-[13px] text-slate-700">{r.topic}</span>} />}
                  <KeyRow k="Engine" v={<span className="text-[13px] text-slate-700">{r.engine || "—"}</span>} />
                  <KeyRow k="Sentiment" v={<SentPill label={r.brand_sentiment_label || "absent"} />} />
                  {position > 0 && (
                    <KeyRow k="Position" v={<span className="text-[13px] font-semibold text-brand">#{position}</span>} />
                  )}
                </div>
              </Card>

              {/* Competitors */}
              <Card className="p-4">
                <Title brief="Competitor brands the AI named in its answer for this prompt.">
                  Competitors named
                  {comps.length > 0 && (
                    <span className="ml-1.5 text-[11px] font-normal text-slate-400">({comps.length})</span>
                  )}
                </Title>
                <div className="flex flex-wrap gap-1.5">
                  {comps.length
                    ? comps.map((c) => <Badge key={c} variant="competitor">{c}</Badge>)
                    : <span className="text-[12px] text-slate-400">No competitors named</span>}
                </div>
              </Card>

              {/* Cited domains */}
              <Card className="p-4">
                <Title brief={BRIEFS.cited_domains}>
                  Cited domains
                  {citeCount > 0 && (
                    <span className="ml-1.5 text-[11px] font-normal text-slate-400">({citeCount})</span>
                  )}
                </Title>
                {citeCount > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(domainsByClass).map(([cls, doms]) => (
                      <div key={cls}>
                        <div className="mb-1.5"><ClassTag k={cls} /></div>
                        <div className="flex flex-wrap gap-1.5 pl-1">
                          {doms.map((d) => (
                            <span
                              key={d}
                              className="text-[11px] px-2 py-0.5 rounded flex items-center gap-1"
                              style={{ background: (CLASS_COLOR[cls] || "#8A8A8A") + "18" }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CLASS_COLOR[cls] || "#8A8A8A" }} />
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-[12px] text-slate-400">No domains cited</span>
                )}
              </Card>
            </div>

            {/* Right column: actions + answer */}
            <div className="col-span-12 lg:col-span-8 space-y-4">
              {/* Recommended actions */}
              {actions.length > 0 && (
                <Card className="p-5">
                  <Title
                    brief="Content and authority actions that could earn RISA a citation for this prompt."
                    right={<Badge variant="warn">{actions.length} action{actions.length > 1 ? "s" : ""}</Badge>}
                  >
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-yellow-600" />
                      Recommended actions
                    </span>
                  </Title>
                  <ul className="space-y-2">
                    {actions.map((a, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <span className="w-5 h-5 rounded grid place-items-center bg-brand-light text-brand text-[11px] font-semibold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {a}
                      </li>
                    ))}
                  </ul>
                  {!mentioned && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <MeterBar pct={Math.min(100, 20 * actions.length)} color="#CA8A04" />
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        {actions.length} action{actions.length > 1 ? "s" : ""} available to earn this mention
                      </p>
                    </div>
                  )}
                </Card>
              )}

              {/* Engine answer */}
              <Card className="p-5">
                <Title
                  brief="The raw AI-generated answer for this prompt, exactly as captured by the pipeline."
                  right={
                    r.answer_summary
                      ? <Badge variant="neutral">has summary</Badge>
                      : undefined
                  }
                >
                  Engine answer
                </Title>
                {r.answer_summary && (
                  <div className="mb-3 p-3 bg-brand-light rounded-lg border border-brand/10">
                    <div className="text-[11px] uppercase tracking-wide text-brand font-semibold mb-1">Summary</div>
                    <p className="text-[13px] text-slate-700 leading-relaxed">{r.answer_summary}</p>
                  </div>
                )}
                <div className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 max-h-[55vh] overflow-auto scroll leading-relaxed">
                  {r.response || "(no answer text captured)"}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
