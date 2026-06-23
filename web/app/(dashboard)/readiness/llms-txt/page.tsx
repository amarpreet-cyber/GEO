import { FileText, Check, X, Sparkles } from "lucide-react";
import { getSiteAudit, hasData } from "@/lib/data";
import { BRIEFS } from "@/lib/metricBriefs";
import { Card, Title, Section, PageHeader, NoData, MeterBar, Badge } from "@/components/ui";
import { DrillStat } from "@/components/DrillStat";
import type { DrillRow } from "@/lib/drill";

const SAMPLE = `# RISA Labs

> AI operating system for oncology. A provider-side control plane that runs
> auth-to-cash across medical prior authorization and drug economics.

## Core
- [Platform](https://risalabs.ai/platform): prior auth automation, denial management, payer policy alignment
- [Outcomes](https://risalabs.ai/outcomes): 30% touchless auths, 95%+ first-submission approval, 75% FTE reduction

## Proof
- Live with 8 oncology practices (OneOncology); $11M Series A (Cencora + Optum Ventures)
- Flatiron preferred partner · HIPAA + SOC2 compliant

## Contact
- [Book a demo](https://risalabs.ai/demo)`;

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-5 h-5 rounded-md grid place-items-center ${ok ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
        {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </span>
      <span className={ok ? "text-slate-700" : "text-slate-400"}>{label}</span>
    </div>
  );
}

export default function LlmsTxt() {
  const site = getSiteAudit();
  if (!hasData() || !site) return <NoData />;
  const l = site.llmstxt;

  const I = "w-3.5 h-3.5";

  // Quality checklist items as DrillRows
  const checklistItems: { ok: boolean; label: string; detail: string }[] = [
    { ok: !!l.present, label: "File published at /llms.txt", detail: l.present ? "File found" : "404 - quick win" },
    { ok: (l.sections ?? 0) >= 1, label: "Has a clear H1 title", detail: `${l.sections ?? 0} sections detected` },
    { ok: (l.sections ?? 0) >= 3, label: "3+ structured sections", detail: `${l.sections ?? 0} sections` },
    { ok: (l.chars ?? 0) > 200, label: "Substantive, link-rich (200+ chars)", detail: `${l.chars ?? 0} chars` },
  ];

  const checklistRows: DrillRow[] = checklistItems.map((item) => ({
    label: item.label,
    sub: item.detail,
    tag: item.ok ? "pass" : "fail",
    tagColor: item.ok ? "#22c55e" : "#ef4444",
    value: item.ok ? "yes" : "no",
  }));

  const passCount = checklistItems.filter((i) => i.ok).length;
  const failCount = checklistItems.filter((i) => !i.ok).length;

  return (
    <>
      <PageHeader
        title="llms.txt"
        subtitle={`Machine-readable AI guide at ${site.domain}/llms.txt -- the emerging standard for telling AI what your site is.`}
      />

      <div className="space-y-6">

        <div>
          <Section label="File metrics" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger mt-2">
            <DrillStat
              label="llms.txt score"
              brief={BRIEFS.llms_txt}
              icon={<FileText className={I} />}
              value={l.score}
              unit="/100"
              tone={l.score >= 50 ? "good" : "bad"}
              footer={<MeterBar pct={l.score} color={l.score >= 50 ? "#22c55e" : "#ef4444"} />}
              detail={{
                blurb: BRIEFS.llms_txt,
                chart: {
                  kind: "donut",
                  data: [
                    { name: "Pass", value: passCount, color: "#22c55e" },
                    { name: "Fail", value: failCount, color: "#ef4444" },
                  ],
                },
                rowsTitle: "Quality checklist",
                rows: checklistRows,
                href: "/readiness/llms-txt",
                hrefLabel: "Open llms.txt",
              }}
            />
            <DrillStat
              label="Present"
              brief="Whether the llms.txt file exists at the root path"
              value={l.present ? 1 : 0}
              sub={l.present ? "file found" : "404 -- quick win"}
              accent={l.present ? "#22c55e" : "#ef4444"}
              tone={l.present ? "good" : "bad"}
              detail={{
                blurb: "Whether a file exists at /llms.txt on the domain root.",
                chart: {
                  kind: "donut",
                  data: [
                    { name: l.present ? "Present" : "Absent", value: 1, color: l.present ? "#22c55e" : "#ef4444" },
                  ],
                },
                rowsTitle: "Quality checklist",
                rows: checklistRows,
                href: "/readiness/llms-txt",
                hrefLabel: "Open llms.txt",
              }}
            />
            <DrillStat
              label="Sections"
              brief="Number of ## section headings in the file"
              value={l.sections ?? 0}
              sub="## headings"
              accent="#3b82f6"
              detail={{
                blurb: "Number of ## section headings found in the llms.txt file. 3 or more is recommended.",
                chart: {
                  kind: "donut",
                  data: [
                    { name: "Present", value: l.sections ?? 0, color: "#3b82f6" },
                    { name: "Needed", value: Math.max(0, 3 - (l.sections ?? 0)), color: "#E6E6E6" },
                  ],
                },
                rowsTitle: "Quality checklist",
                rows: checklistRows,
                href: "/readiness/llms-txt",
                hrefLabel: "Open llms.txt",
              }}
            />
            <DrillStat
              label="Length"
              brief="Total character count of the llms.txt file"
              value={l.chars ?? 0}
              sub="characters"
              accent="#5C5C5C"
              detail={{
                blurb: "Total character count of the llms.txt file. More than 200 characters indicates substantive content.",
                chart: {
                  kind: "donut",
                  data: [
                    { name: "Content", value: Math.min(l.chars ?? 0, 500), color: "#5C5C5C" },
                    { name: "Gap to 500", value: Math.max(0, 500 - (l.chars ?? 0)), color: "#E6E6E6" },
                  ],
                },
                rowsTitle: "Quality checklist",
                rows: checklistRows,
                href: "/readiness/llms-txt",
                hrefLabel: "Open llms.txt",
              }}
            />
          </div>
        </div>

        <div>
          <Section label="Quality checklist" />
          <Card className="p-5 mt-2">
            <Title brief="What a strong llms.txt needs to guide AI systems effectively.">
              Quality checklist
            </Title>
            <div className="space-y-2.5">
              <CheckItem ok={!!l.present} label="File published at /llms.txt" />
              <CheckItem ok={(l.sections ?? 0) >= 1} label="Has a clear H1 title" />
              <CheckItem ok={(l.sections ?? 0) >= 3} label="3+ structured sections" />
              <CheckItem ok={(l.chars ?? 0) > 200} label="Substantive, link-rich" />
            </div>
            <div className="mt-5 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
              <p className="text-xs text-yellow-700 leading-relaxed">
                {l.present
                  ? "Present but thin -- flesh out sections and links."
                  : "Not published. Few competitors have one, so shipping it is a fast edge. Under one hour of work."}
              </p>
            </div>
          </Card>
        </div>

        <div>
          <Section label="Suggested llms.txt" />
          <Card className="p-5 mt-2">
            <Title
              brief="Drop this at risalabs.ai/llms.txt"
              right={
                <Badge variant="brand">
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    geo-llmstxt
                  </span>
                </Badge>
              }
            >
              Suggested llms.txt
            </Title>
            <pre className="text-[11px] leading-relaxed font-mono bg-slate-900 text-slate-100 rounded-xl p-4 overflow-auto scroll max-h-[340px]">
              <code>{SAMPLE}</code>
            </pre>
          </Card>
        </div>

      </div>
    </>
  );
}
