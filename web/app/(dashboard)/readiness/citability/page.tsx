import { FileSearch, Quote, Hash, ListTree } from "lucide-react";
import { getCitability, hasData } from "@/lib/data";
import { BRIEFS } from "@/lib/metricBriefs";
import {
  Card, Title, Section, PageHeader, NoData, MeterBar,
  ProgressRow, ScorePill, Placeholder,
} from "@/components/ui";
import { DrillStat } from "@/components/DrillStat";
import type { DrillRow } from "@/lib/drill";

const SUB_LABEL: Record<string, string> = {
  answer_first: "Answer-first", self_contained: "Self-contained", structure: "Structure",
  statistics: "Statistics", specificity: "Specificity",
};
const SUB_COLOR: Record<string, string> = {
  answer_first: "#0056D6", self_contained: "#3b82f6", structure: "#5C5C5C",
  statistics: "#CA8A04", specificity: "#10b981",
};

const I = "w-3.5 h-3.5";

export default function Citability() {
  if (!hasData()) return <NoData />;
  const doc = getCitability();

  if (!doc || !doc.pages?.length) {
    return (
      <>
        <PageHeader
          title="Page Citability"
          subtitle="How quotable RISA pages are to an answer engine."
        />
        <Placeholder
          title="Citability not scored yet"
          note="Fetch and score pages on answer-first structure, self-contained passages, statistics and specificity."
          ship="Run: python run.py citability"
        />
      </>
    );
  }

  const pages = doc.pages;
  const best = pages[0];
  const worst = pages[pages.length - 1];
  const avgStats = pages.reduce((a, p) => a + p.stats_found, 0) / pages.length;

  const citabilityColor =
    doc.score >= 70 ? "#22c55e" : doc.score >= 45 ? "#CA8A04" : "#ef4444";
  const citabilityTone: "good" | "warn" | "bad" =
    doc.score >= 70 ? "good" : doc.score >= 45 ? "warn" : "bad";
  const worstTone: "good" | "warn" | "bad" =
    worst.score >= 70 ? "good" : worst.score >= 45 ? "warn" : "bad";

  // Bar chart: per-page citability scores
  const pageBar = pages.slice(0, 12).map((p) => ({
    name: p.title.length > 28 ? p.title.slice(0, 28) + "..." : p.title,
    value: p.score,
  }));

  // Rows: each page with external link
  const pageRows: DrillRow[] = pages.slice(0, 40).map((p) => ({
    label: p.title || p.url,
    sub: p.url.replace(/^https?:\/\//, ""),
    value: p.score,
    href: p.url,
    external: true,
  }));

  // Best page row
  const bestPageRows: DrillRow[] = [
    {
      label: best.title || best.url,
      sub: best.url.replace(/^https?:\/\//, ""),
      value: best.score,
      href: best.url,
      external: true,
    },
    ...pages.slice(1, 10).map((p): DrillRow => ({
      label: p.title || p.url,
      sub: p.url.replace(/^https?:\/\//, ""),
      value: p.score,
      href: p.url,
      external: true,
    })),
  ];

  // Worst page row
  const worstPageRows: DrillRow[] = [...pages].reverse().slice(0, 10).map((p): DrillRow => ({
    label: p.title || p.url,
    sub: p.url.replace(/^https?:\/\//, ""),
    value: p.score,
    href: p.url,
    external: true,
  }));

  return (
    <>
      <PageHeader
        title="Page Citability"
        subtitle={`How quotable ${doc.domain} pages are to an answer engine. Scored ${doc.pages_scored} pages.`}
      />

      <div className="space-y-6">
        {/* Site average */}
        <div>
          <Section label="Site average" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger mt-2">
            <DrillStat
              label="Mean citability"
              brief={BRIEFS.citability}
              icon={<FileSearch className={I} />}
              value={doc.score}
              unit="/100"
              tone={citabilityTone}
              footer={<MeterBar pct={doc.score} color={citabilityColor} />}
              detail={{
                blurb: BRIEFS.citability,
                chart: { kind: "bar", unit: "/100", data: pageBar },
                rowsTitle: "All pages",
                rows: pageRows,
                href: "/readiness/citability",
                hrefLabel: "Open Citability",
              }}
            />
            <DrillStat
              label="Strongest page"
              brief="Highest citability score across all scored pages."
              icon={<Quote className={I} />}
              value={best.score}
              unit="/100"
              accent="#10b981"
              tone="good"
              sub={best.title.length > 40 ? best.title.slice(0, 40) + "..." : best.title}
              detail={{
                blurb: "The highest-scoring page for AI citability. Use it as a template for rewriting weaker pages.",
                chart: { kind: "bar", unit: "/100", data: pageBar },
                rowsTitle: "Top pages by citability",
                rows: bestPageRows,
                href: best.url,
                hrefLabel: "Open page",
              }}
            />
            <DrillStat
              label="Weakest page"
              brief="Lowest citability score, signalling the most room to improve quoteability."
              icon={<ListTree className={I} />}
              value={worst.score}
              unit="/100"
              accent="#ef4444"
              tone={worstTone}
              sub={worst.title.length > 40 ? worst.title.slice(0, 40) + "..." : worst.title}
              detail={{
                blurb: "The lowest-scoring page. Rewriting it with answer-first structure and statistics will yield the biggest citability lift.",
                chart: { kind: "bar", unit: "/100", data: pageBar },
                rowsTitle: "Weakest pages (rewrite worklist)",
                rows: worstPageRows,
                href: worst.url,
                hrefLabel: "Open page",
              }}
            />
            <DrillStat
              label="Avg stats / page"
              brief="Average count of quantified statistics per page"
              icon={<Hash className={I} />}
              value={avgStats}
              decimals={1}
              accent="#0056D6"
              sub="hard numbers AI can lift"
              detail={{
                blurb: "Average count of quantified statistics per page. More stats = more quotable facts for AI to cite.",
                chart: { kind: "bar", unit: "/100", data: pageBar },
                rowsTitle: "Pages (sorted by citability)",
                rows: pageRows,
                href: "/readiness/citability",
                hrefLabel: "Open Citability",
              }}
            />
          </div>
        </div>

        {/* Citability rubric */}
        <div>
          <Section label="Citability rubric" />
          <Card className="p-5 mt-2">
            <Title brief="Weighting the scoring model applies when deciding to quote a passage.">
              Citability rubric
            </Title>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(doc.rubric).map(([k, w]) => (
                <div key={k} className="rounded-lg border border-slate-200 p-3 text-center">
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">
                    {SUB_LABEL[k] || k}
                  </div>
                  <div
                    className="text-lg font-semibold tnum mt-1"
                    style={{ color: SUB_COLOR[k] }}
                  >
                    {Math.round(w * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Page scores */}
        <div>
          <Section label="Page scores" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 stagger mt-2">
            {pages.map((p) => (
              <Card key={p.url} className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{p.title}</div>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-brand hover:underline truncate block"
                    >
                      {p.url.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                  <ScorePill value={p.score} suffix="/100" thresholds={[45, 70]} />
                </div>
                <div className="space-y-2">
                  {Object.entries(p.subscores).map(([k, v]) => (
                    <ProgressRow
                      key={k}
                      label={SUB_LABEL[k] || k}
                      value={v}
                      color={SUB_COLOR[k]}
                      labelWidth="w-28"
                    />
                  ))}
                </div>
                <div className="border-t border-slate-100 pt-3 mt-3 flex items-center gap-4 text-[11px] text-slate-400">
                  <span>{p.words.toLocaleString()} words</span>
                  <span>{p.headings} headings</span>
                  <span>{p.stats_found} stats</span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-slate-400">
          {doc.note} · fetched {new Date(doc.fetched_at).toLocaleString()}
        </p>
      </div>
    </>
  );
}
