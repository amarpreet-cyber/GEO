import Link from "next/link";
import { Kanban, CheckCircle2, CircleDot, Circle, Zap } from "lucide-react";
import { getRecommendedActions, hasData } from "@/lib/data";
import {
  Section, PageHeader, NoData, Badge,
} from "@/components/ui";
import ActionBoard, { type ActionItem } from "@/components/ActionBoard";
import { DrillStat } from "@/components/DrillStat";
import type { DrillDetail } from "@/lib/drill";

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return "a" + (h >>> 0).toString(36);
}

// Stable index for prompt → /prompts/{idx} links. Actions store a prompt field;
// map from action text hash back to the original action's prompt if available.
function promptIdx(prompt: string, promptToIdx: Map<string, number>): string | undefined {
  const i = promptToIdx.get(prompt);
  return i !== undefined ? `/prompts/${i}` : undefined;
}

export default function Actions() {
  if (!hasData()) return <NoData />;
  const raw = getRecommendedActions();
  const seen = new Set<string>();
  const actions: ActionItem[] = [];
  for (const r of raw) {
    if (!r.action || seen.has(r.action)) continue;
    seen.add(r.action);
    actions.push({
      id: hash(r.action),
      action: r.action,
      persona: r.persona || "",
      topic: r.topic || "",
      prompt: r.prompt || "",
    });
  }

  const personas = [...new Set(actions.map((a) => a.persona).filter(Boolean))];
  const total = actions.length;

  // build prompt-to-index from the underlying raw records (all unique prompts in order)
  const allPrompts = [...new Set(raw.map((r) => r.prompt).filter(Boolean))];
  const promptToIdx = new Map(allPrompts.map((p, i) => [p, i]));

  // ── DrillStat details ────────────────────────────────────────────────────────

  // persona breakdown for the donut
  const personaCounts: Record<string, number> = {};
  actions.forEach((a) => { if (a.persona) personaCounts[a.persona] = (personaCounts[a.persona] || 0) + 1; });
  const personaColors: string[] = ["#0056D6", "#22c55e", "#CA8A04", "#ef4444", "#5C5C5C", "#14b8a6"];
  const personaChart = Object.entries(personaCounts).map(([name, value], i) => ({
    name: name.toUpperCase(), value, color: personaColors[i % personaColors.length],
  }));

  // total detail: donut by persona + all action rows
  const totalDetail: DrillDetail = {
    blurb: "All distinct GEO actions the pipeline recommends, deduplicated by action text.",
    chart: { kind: "donut", data: personaChart },
    rowsTitle: "All recommended actions",
    rows: actions.slice(0, 40).map((a) => ({
      label: a.action,
      sub: [a.persona?.toUpperCase(), a.topic].filter(Boolean).join(" · "),
      href: promptIdx(a.prompt, promptToIdx),
      tag: a.persona?.toUpperCase() || undefined,
      tagColor: "#0056D6",
    })),
    href: "/activate",
    hrefLabel: "Route to Activate",
  };

  // backlog = all actions (start position)
  const backlogDetail: DrillDetail = {
    blurb: "Actions not yet started. Every action lands here by default.",
    chart: { kind: "donut", data: personaChart },
    rowsTitle: "Backlog actions",
    rows: actions.slice(0, 40).map((a) => ({
      label: a.action,
      sub: [a.persona?.toUpperCase(), a.topic].filter(Boolean).join(" · "),
      href: promptIdx(a.prompt, promptToIdx),
    })),
  };

  // topic breakdown chart for in-progress / done
  const topicCounts: Record<string, number> = {};
  actions.forEach((a) => { if (a.topic) topicCounts[a.topic] = (topicCounts[a.topic] || 0) + 1; });
  const topicChart = Object.entries(topicCounts).map(([name, value]) => ({ name, value }));

  const inProgressDetail: DrillDetail = {
    blurb: "Actions you move to the in-progress column — tracked locally in the browser.",
    chart: topicChart.length > 0 ? { kind: "bar", data: topicChart } : undefined,
    rowsTitle: "Actions ready to start",
    rows: actions.slice(0, 10).map((a) => ({
      label: a.action,
      sub: [a.persona?.toUpperCase(), a.topic].filter(Boolean).join(" · "),
      href: promptIdx(a.prompt, promptToIdx),
    })),
  };

  const doneDetail: DrillDetail = {
    blurb: "Actions you have marked complete. Crossed out on the board.",
    chart: topicChart.length > 0 ? { kind: "bar", data: topicChart } : undefined,
    rowsTitle: "Completable actions",
    rows: actions.slice(0, 10).map((a) => ({
      label: a.action,
      sub: [a.persona?.toUpperCase(), a.topic].filter(Boolean).join(" · "),
      href: promptIdx(a.prompt, promptToIdx),
    })),
  };

  return (
    <>
      <PageHeader
        title="Action Board"
        subtitle="Every GEO action surfaced by the pipeline. Move cards through the kanban as you execute."
        right={
          <div className="flex items-center gap-2">
            <Badge variant="neutral">{total} total</Badge>
            <Badge variant="brand">{personas.length} persona{personas.length !== 1 ? "s" : ""}</Badge>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Summary strip */}
        <div>
          <Section label="Pipeline output" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger mt-2">
            <DrillStat
              label="Total actions"
              brief="All distinct GEO actions the pipeline recommends, deduped by action text."
              icon={<Kanban className="w-3.5 h-3.5" />}
              value={total}
              accent="var(--brand)"
              detail={totalDetail}
            />
            <DrillStat
              label="Backlog"
              brief="Actions not yet started — in the default backlog column."
              icon={<Circle className="w-3.5 h-3.5" />}
              value={total}
              accent="#8A8A8A"
              sub="start position"
              detail={backlogDetail}
            />
            <DrillStat
              label="In progress"
              brief="Actions you have moved to the in-progress column (persisted locally)."
              icon={<CircleDot className="w-3.5 h-3.5" />}
              value={0}
              accent="#0056D6"
              sub="move cards to track"
              detail={inProgressDetail}
            />
            <DrillStat
              label="Done"
              brief="Actions you have marked complete. Crossed out on the board."
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              value={0}
              accent="#22c55e"
              sub="completed actions"
              detail={doneDetail}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Counts above show pipeline output totals. Board status is saved locally per browser.{" "}
            <Link href="/activate" className="text-brand hover:underline inline-flex items-center gap-0.5">
              Route to outbound <Zap className="w-3 h-3" />
            </Link>
          </p>
        </div>

        {/* Kanban board */}
        <div>
          <Section
            label="Kanban board"
            right={
              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                <Kanban className="w-3.5 h-3.5" /> click move to advance, flag to prioritise
              </span>
            }
          />
          <div className="mt-2">
            <ActionBoard actions={actions} />
          </div>
        </div>
      </div>
    </>
  );
}
