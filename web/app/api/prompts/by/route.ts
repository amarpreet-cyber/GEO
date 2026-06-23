import { NextResponse } from "next/server";
import { getPrompts, getSummary } from "@/lib/data";
import { jbool, jparse, num } from "@/lib/derive";

export const dynamic = "force-dynamic";

// The prompts behind ANY metric. field = how to match, value = the segment value:
//   name       -> a brand: RISA answers, or a competitor present in the answer
//   persona    -> prompts for that buyer persona
//   intent     -> prompts of that query intent
//   sentiment  -> answers with that sentiment toward RISA
//   topic      -> prompts in that sector/topic
// Returns the matching prompts with their original index (for /prompts/<idx> drill).
export function GET(req: Request) {
  const url = new URL(req.url);
  const field = (url.searchParams.get("field") || "name").trim();
  const value = (url.searchParams.get("value") || "").trim();
  if (!value) return NextResponse.json({ error: "missing value" }, { status: 400 });

  const rows = getPrompts();
  const brand = getSummary()?.brand || "RISA Labs";
  const lc = value.toLowerCase();
  const isBrand = field === "name" && (lc === brand.toLowerCase() || /risa/i.test(value));

  const match = (r: typeof rows[number]): boolean => {
    switch (field) {
      case "name":
        return isBrand
          ? jbool(r.brand_mentioned)
          : jparse(r.competitors_present).some((c) => c.toLowerCase() === lc);
      case "persona": return (r.persona || "").toLowerCase() === lc;
      case "intent": return (r.intent || "").toLowerCase() === lc;
      case "sentiment": return (r.brand_sentiment_label || "absent").toLowerCase() === lc;
      case "topic": return ((r.topic || "").trim() || "general oncology rcm").toLowerCase() === lc;
      default: return false;
    }
  };

  const prompts: { idx: number; prompt: string; persona: string; intent: string; position: number }[] = [];
  rows.forEach((r, idx) => {
    if (match(r)) prompts.push({ idx, prompt: r.prompt, persona: r.persona || "", intent: r.intent || "", position: num(r.brand_position) });
  });

  return NextResponse.json({ field, value, isBrand, count: prompts.length, prompts });
}
