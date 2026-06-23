// Global filter state lives in the URL query string (shareable, server-readable).
import type { PromptRow } from "./types";
import { jbool } from "./derive";

export type Mentioned = "all" | "yes" | "no";
export type Filters = {
  personas: string[];
  intents: string[];
  topics: string[];
  engines: string[];
  mentioned: Mentioned;
  q: string;
};

export type SP = Record<string, string | string[] | undefined>;

const arr = (v: string | string[] | undefined): string[] =>
  v == null ? [] : (Array.isArray(v) ? v : [v]).flatMap((x) => x.split(",")).map((s) => s.trim()).filter(Boolean);

export function parseFilters(sp: SP): Filters {
  const m = (Array.isArray(sp.mentioned) ? sp.mentioned[0] : sp.mentioned) as Mentioned;
  return {
    personas: arr(sp.personas),
    intents: arr(sp.intents),
    topics: arr(sp.topics),
    engines: arr(sp.engines),
    mentioned: m === "yes" || m === "no" ? m : "all",
    q: (Array.isArray(sp.q) ? sp.q[0] : sp.q) || "",
  };
}

export function applyFilters(rows: PromptRow[], f: Filters): PromptRow[] {
  return rows.filter((r) => {
    if (f.personas.length && !f.personas.includes(r.persona)) return false;
    if (f.intents.length && !f.intents.includes(r.intent)) return false;
    if (f.topics.length && !f.topics.includes(r.topic)) return false;
    if (f.engines.length && !f.engines.includes(r.engine)) return false;
    if (f.mentioned === "yes" && !jbool(r.brand_mentioned)) return false;
    if (f.mentioned === "no" && jbool(r.brand_mentioned)) return false;
    if (f.q) {
      const q = f.q.toLowerCase();
      if (!((r.prompt || "").toLowerCase().includes(q) || (r.answer_summary || "").toLowerCase().includes(q))) return false;
    }
    return true;
  });
}

export function toQuery(f: Partial<Filters>): string {
  const p = new URLSearchParams();
  if (f.personas?.length) p.set("personas", f.personas.join(","));
  if (f.intents?.length) p.set("intents", f.intents.join(","));
  if (f.topics?.length) p.set("topics", f.topics.join(","));
  if (f.engines?.length) p.set("engines", f.engines.join(","));
  if (f.mentioned && f.mentioned !== "all") p.set("mentioned", f.mentioned);
  if (f.q) p.set("q", f.q);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const activeCount = (f: Filters): number =>
  f.personas.length + f.intents.length + f.topics.length + f.engines.length + (f.mentioned !== "all" ? 1 : 0) + (f.q ? 1 : 0);
