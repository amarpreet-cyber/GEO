// Pure derivations ported from the original single-file dashboard so the heavy
// logic lives once and runs server-side. Safe to import in server or client.
import type { PromptRow } from "./types";

export const num = (v: unknown): number => (v === "" || v == null ? 0 : Number(v));
export const jbool = (v: unknown): boolean => v === true || v === "True" || v === "true";
export const jparse = (v: unknown): string[] => {
  try { return JSON.parse(String(v ?? "[]").replace(/'/g, '"')); } catch { return []; }
};

export const INTENT_W: Record<string, number> = { comparison: 3, discovery: 3, brand: 1 };

export type Opportunity = {
  prompt: string; persona: string; intent: string;
  comps: string[]; score: number; action?: string;
};

export function opportunities(rows: PromptRow[], actionsByPrompt: Record<string, string[]>): Opportunity[] {
  return rows
    .filter((r) => !jbool(r.brand_mentioned))
    .map((r) => {
      const comps = jparse(r.competitors_present);
      const score = (INTENT_W[r.intent] || 1) * (1 + 0.25 * comps.length);
      return { prompt: r.prompt, persona: r.persona, intent: r.intent, comps, score, action: (actionsByPrompt[r.prompt] || [])[0] };
    })
    .sort((a, b) => b.score - a.score);
}

export type Agg = ReturnType<typeof aggregate>;

export function aggregate(
  rows: PromptRow[],
  brand: string,
  compMeta: Record<string, { category: string; side: string }>,
  domClass: Record<string, string>,
) {
  const n = rows.length || 1;
  const mentioned = rows.filter((r) => jbool(r.brand_mentioned)).length;
  const visibility = (100 * rows.reduce((a, r) => { const p = num(r.brand_position); return a + (p > 0 ? 1 / p : 0); }, 0)) / n;
  const pos = rows.map((r) => num(r.brand_position)).filter((p) => p > 0);
  const avgPos = pos.length ? pos.reduce((a, b) => a + b, 0) / pos.length : null;

  const presence: Record<string, number> = { [brand]: mentioned };
  rows.forEach((r) => jparse(r.competitors_present).forEach((c) => (presence[c] = (presence[c] || 0) + 1)));
  const tot = Object.values(presence).reduce((a, b) => a + b, 0) || 1;
  const sov = Object.entries(presence)
    .filter(([, v]) => v > 0)
    .map(([name, v]) => ({ name, share: (100 * v) / tot, count: v, isBrand: name === brand }))
    .sort((a, b) => b.share - a.share);

  const sent: Record<string, number> = {};
  rows.forEach((r) => { const l = r.brand_sentiment_label || "absent"; sent[l] = (sent[l] || 0) + 1; });

  const cls: Record<string, number> = {};
  rows.forEach((r) => jparse(r.cited_domains).forEach((dm) => { const k = domClass[dm] || "earned"; cls[k] = (cls[k] || 0) + 1; }));

  const comp = sov
    .filter((s) => !s.isBrand)
    .map((s) => ({ competitor: s.name, present: s.count, presence_rate: (100 * s.count) / n, ...(compMeta[s.name] || { category: "", side: "" }) }));

  return { n: rows.length, mentioned, mention_rate: (100 * mentioned) / n, visibility, avgPos, sov, sent, cls, comp };
}

export function groupVisibility(rows: PromptRow[], key: keyof PromptRow) {
  const b: Record<string, PromptRow[]> = {};
  rows.forEach((r) => { const k = (r[key] as string) || "—"; (b[k] ||= []).push(r); });
  return Object.entries(b).map(([name, rs]) => ({
    name: key === "persona" ? name.toUpperCase() : name,
    visibility: +((100 * rs.reduce((a, r) => { const p = num(r.brand_position); return a + (p > 0 ? 1 / p : 0); }, 0)) / rs.length).toFixed(1),
    mention: +((100 * rs.filter((r) => jbool(r.brand_mentioned)).length) / rs.length).toFixed(1),
  }));
}

export const gradeFor = (v: number) => (v >= 60 ? "A" : v >= 40 ? "B" : v >= 20 ? "C" : v >= 10 ? "D" : "F");

const SENT_KEYS = ["positive", "neutral", "negative", "absent"] as const;

// sentiment counts per segment (persona/topic/intent) — for stacked breakdowns
export function groupSentiment(rows: PromptRow[], key: keyof PromptRow) {
  const b: Record<string, Record<string, number>> = {};
  rows.forEach((r) => {
    const k = (r[key] as string) || "—";
    const l = r.brand_sentiment_label || "absent";
    (b[k] ||= {})[l] = (b[k]?.[l] || 0) + 1;
  });
  return Object.entries(b).map(([name, counts]) => {
    const total = SENT_KEYS.reduce((a, s) => a + (counts[s] || 0), 0) || 1;
    return {
      name: key === "persona" ? name.toUpperCase() : name,
      total,
      positive: counts.positive || 0,
      neutral: counts.neutral || 0,
      negative: counts.negative || 0,
      absent: counts.absent || 0,
      posShare: +((100 * (counts.positive || 0)) / total).toFixed(1),
    };
  });
}

// "Where competitors get cited" → placement targets. Earned authorities the
// engine trusts (RISA should earn a slot) + rival-owned domains winning citations.
export type CitationGap = { domain: string; klass: string; citations: number; kind: "earned-authority" | "competitor-owned" };
export function citationGaps(citations: { domain: string; class: string; citations: number }[]): CitationGap[] {
  return citations
    .filter((c) => c.class === "earned" || c.class === "competitor")
    .map((c): CitationGap => ({
      domain: c.domain, klass: c.class, citations: c.citations,
      kind: c.class === "competitor" ? "competitor-owned" : "earned-authority",
    }))
    .sort((a, b) => b.citations - a.citations);
}

// ── Prompt segmentation ────────────────────────────────────────────────────
// Mutually-exclusive prompt "type" used to section the prompt set:
//   brand   — directly involves RISA (brand intent, or the prompt text names RISA)
//   comparison — head-to-head / "best tool" queries where RISA competes
//   keyword — broad discovery / problem queries (the keyword-level demand)
export type PromptType = "brand" | "comparison" | "keyword";
export function promptType(r: PromptRow): PromptType {
  if ((r.intent || "").toLowerCase() === "brand" || /\brisa\b/i.test(r.prompt || "")) return "brand";
  if ((r.intent || "").toLowerCase() === "comparison") return "comparison";
  return "keyword";
}

// Rank-weighted visibility + mention stats for an arbitrary prompt bucket — used to
// show visibility per segment (type or sector) without re-deriving the formula.
export function groupStats(rows: PromptRow[]) {
  const n = rows.length || 1;
  const vis = (100 * rows.reduce((a, r) => { const p = num(r.brand_position); return a + (p > 0 ? 1 / p : 0); }, 0)) / n;
  const mentioned = rows.filter((r) => jbool(r.brand_mentioned)).length;
  const pos = rows.map((r) => num(r.brand_position)).filter((p) => p > 0);
  return {
    count: rows.length,
    mentioned,
    visibility: +vis.toFixed(1),
    mention: +((100 * mentioned) / n).toFixed(1),
    avgPos: pos.length ? +(pos.reduce((a, b) => a + b, 0) / pos.length).toFixed(1) : null,
  };
}

// Bucket prompts into named groups, preserving each row's index in the ORIGINAL
// list (for /prompts/<index> drill links).
export function bucketBy<K extends string>(
  rows: PromptRow[], keyOf: (r: PromptRow, i: number) => K,
): { key: K; rows: { row: PromptRow; idx: number }[] }[] {
  const m = new Map<K, { row: PromptRow; idx: number }[]>();
  rows.forEach((row, idx) => { const k = keyOf(row, idx); (m.get(k) || m.set(k, []).get(k)!).push({ row, idx }); });
  return [...m.entries()].map(([key, rows]) => ({ key, rows }));
}
