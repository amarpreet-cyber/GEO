import { NextResponse } from "next/server";
import { getPrompts, getActionsByPrompt, getDomainClass } from "@/lib/data";
import { jbool, jparse, num } from "@/lib/derive";

export const dynamic = "force-dynamic";

// Single-prompt analysis VM — the same data the /prompts/[id] page assembles,
// served as JSON so the in-context PromptDrawer can show it without navigating.
export function GET(_req: Request, { params }: { params: { id: string } }) {
  const rows = getPrompts();
  const idx = Number(params.id);
  const r = rows[idx];
  if (!r) return NextResponse.json({ error: "not found" }, { status: 404 });

  const domains = jparse(r.cited_domains);
  const domClass = getDomainClass();
  const domainsByClass: Record<string, string[]> = {};
  domains.forEach((d) => { const k = domClass[d] || "earned"; (domainsByClass[k] ||= []).push(d); });

  return NextResponse.json({
    id: idx,
    prompt: r.prompt,
    persona: r.persona || "",
    intent: r.intent || "",
    topic: r.topic || "",
    engine: r.engine || "claude",
    mentioned: jbool(r.brand_mentioned),
    position: num(r.brand_position),
    sentiment: r.brand_sentiment_label || "absent",
    competitors: jparse(r.competitors_present),
    domainsByClass,
    citeCount: domains.length,
    actions: getActionsByPrompt()[r.prompt] || [],
    answer_summary: r.answer_summary || "",
    response: r.response || "",
  });
}
