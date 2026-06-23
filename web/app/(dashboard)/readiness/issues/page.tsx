import Link from "next/link";
import { AlertOctagon, TriangleAlert, Info, ArrowRight } from "lucide-react";
import { getScore, hasData } from "@/lib/data";
import { BRIEFS } from "@/lib/metricBriefs";
import {
  Card, Section, PageHeader, NoData, SevDot, Badge, Placeholder,
} from "@/components/ui";
import { DrillStat } from "@/components/DrillStat";
import type { DrillRow } from "@/lib/drill";

const MODULE_LINK: Record<string, string> = {
  "llms.txt": "/readiness/llms-txt", schema: "/readiness/schema", crawlers: "/readiness/crawlers",
  citability: "/readiness/citability", visibility: "/prompts/gaps", brand: "/citations/authority",
  eeat: "/readiness/eeat", platform: "/citations/authority", technical: "/readiness/crawlers",
};

const SEV_META: Record<string, { label: string; cls: string }> = {
  error: { label: "Errors", cls: "text-red-600" },
  warning: { label: "Warnings", cls: "text-yellow-600" },
  notice: { label: "Notices", cls: "text-slate-500" },
};

const I = "w-3.5 h-3.5";

export default function Issues() {
  if (!hasData()) return <NoData />;

  const score = getScore();
  const issues = score?.issues || [];
  const counts = { error: 0, warning: 0, notice: 0 } as Record<string, number>;
  issues.forEach((i) => (counts[i.severity] = (counts[i.severity] || 0) + 1));

  if (!issues.length) {
    return (
      <>
        <PageHeader
          title="Issues"
          subtitle="Severity-ranked fixes across every audit module. Fix errors first, they gate everything below."
        />
        <Placeholder
          title="No issues computed yet"
          note="The composite collects issues from crawlers, schema, llms.txt, citability, and visibility into one ranked worklist."
          ship="Run: python run.py compose"
        />
      </>
    );
  }

  // Donut: issues by severity
  const donutData = [
    { name: "Errors", value: counts.error, color: "#ef4444" },
    { name: "Warnings", value: counts.warning, color: "#CA8A04" },
    { name: "Notices", value: counts.notice, color: "#8A8A8A" },
  ].filter((d) => d.value > 0);

  // Rows: error issues linking to their module
  const errorRows: DrillRow[] = issues
    .filter((i) => i.severity === "error")
    .slice(0, 40)
    .map((it): DrillRow => ({
      label: it.title,
      sub: it.fix,
      tag: it.module,
      tagColor: "#ef4444",
      value: "error",
      href: MODULE_LINK[it.module],
    }));

  // Rows: warning issues linking to their module
  const warningRows: DrillRow[] = issues
    .filter((i) => i.severity === "warning")
    .slice(0, 40)
    .map((it): DrillRow => ({
      label: it.title,
      sub: it.fix,
      tag: it.module,
      tagColor: "#CA8A04",
      value: "warning",
      href: MODULE_LINK[it.module],
    }));

  // Rows: notice issues linking to their module
  const noticeRows: DrillRow[] = issues
    .filter((i) => i.severity === "notice")
    .slice(0, 40)
    .map((it): DrillRow => ({
      label: it.title,
      sub: it.fix,
      tag: it.module,
      tagColor: "#8A8A8A",
      value: "notice",
      href: MODULE_LINK[it.module],
    }));

  // All rows combined for the donut tile
  const allIssueRows: DrillRow[] = [...errorRows, ...warningRows, ...noticeRows].slice(0, 40);

  return (
    <>
      <PageHeader
        title="Issues"
        subtitle="Severity-ranked fixes across every audit module. Fix errors first, they gate everything below."
      />

      <div className="space-y-6">
        {/* Issue counts */}
        <div>
          <Section label="Issue counts" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger mt-2">
            <DrillStat
              label="Errors"
              brief={BRIEFS.issues}
              icon={<AlertOctagon className={I} />}
              value={counts.error}
              accent="#ef4444"
              tone={counts.error ? "bad" : "good"}
              sub="blocking, fix first"
              detail={{
                blurb: "Blocking issues that prevent AI crawlers or engines from correctly reading the site. Fix errors before anything else.",
                chart: { kind: "donut", data: donutData },
                rowsTitle: "Error issues",
                rows: errorRows.length > 0 ? errorRows : allIssueRows,
                href: errorRows.length > 0 ? MODULE_LINK[issues.find((i) => i.severity === "error")?.module || "crawlers"] || "/readiness/crawlers" : "/readiness",
                hrefLabel: "Open module",
              }}
            />
            <DrillStat
              label="Warnings"
              brief={BRIEFS.issues}
              icon={<TriangleAlert className={I} />}
              value={counts.warning}
              accent="#0056D6"
              sub="meaningful leakage"
              detail={{
                blurb: "Issues that cause meaningful leakage in AI citability and coverage. Address after all errors are cleared.",
                chart: { kind: "donut", data: donutData },
                rowsTitle: "Warning issues",
                rows: warningRows.length > 0 ? warningRows : allIssueRows,
                href: warningRows.length > 0 ? MODULE_LINK[issues.find((i) => i.severity === "warning")?.module || "schema"] || "/readiness/schema" : "/readiness",
                hrefLabel: "Open module",
              }}
            />
            <DrillStat
              label="Notices"
              brief={BRIEFS.issues}
              icon={<Info className={I} />}
              value={counts.notice}
              accent="#8A8A8A"
              sub="opportunities and estimates"
              detail={{
                blurb: "Lower-priority opportunities and estimates. Work through these after errors and warnings are resolved.",
                chart: { kind: "donut", data: donutData },
                rowsTitle: "Notice issues",
                rows: noticeRows.length > 0 ? noticeRows : allIssueRows,
                href: "/readiness",
                hrefLabel: "Open Readiness",
              }}
            />
          </div>
        </div>

        {/* Per-severity issue lists */}
        {(["error", "warning", "notice"] as const).map((sev) => {
          const list = issues.filter((i) => i.severity === sev);
          if (!list.length) return null;
          return (
            <div key={sev}>
              <Section label={`${SEV_META[sev].label} (${list.length})`} />
              <Card className="p-5 mt-2">
                <div className="space-y-2">
                  {list.map((it, idx) => {
                    const href = MODULE_LINK[it.module];
                    const body = (
                      <div className="flex items-start gap-3 border border-slate-200 rounded-lg p-3.5 ds-card-hover hover:border-brand/30">
                        <SevDot severity={it.severity} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-ink">{it.title}</span>
                            <Badge variant="neutral">{it.module}</Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{it.fix}</p>
                        </div>
                        {href && <ArrowRight className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />}
                      </div>
                    );
                    return href
                      ? <Link key={idx} href={href}>{body}</Link>
                      : <div key={idx}>{body}</div>;
                  })}
                </div>
              </Card>
            </div>
          );
        })}

        <p className="text-[11px] text-slate-400">
          Generated by compose.py from every audit module. Re-run: <code>python run.py full</code>
        </p>
      </div>
    </>
  );
}
