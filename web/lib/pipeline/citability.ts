// Page-level citability — how quotable the brand's own pages are to an answer engine.
// Ported from geo/citability.py (deterministic, no-LLM rubric).
import path from "node:path";
import { AppConfig } from "./config";
import { fetchText, extractHtml, resolveUrl, type Extracted } from "./html";
import { writeJson } from "./io";
import type { Progress } from "./collect";

const MAX_PAGES = 6;
const PRONOUN_OPENERS = ["it ", "this ", "that ", "they ", "these ", "those ", "he ", "she ", "we ", "our ", "its "];
const STAT = /(\$\s?\d[\d,.]*|\d[\d,.]*\s?%|\b\d{2,}\b|\b\d+\.\d+\b)/g;
const PROPER = /\b[A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*\b/g;

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "");
}

function startsWithPronoun(s: string): boolean {
  const low = s.toLowerCase();
  return PRONOUN_OPENERS.some((p) => low.startsWith(p));
}

export function scorePage(url: string, html: string): any | null {
  let p: Extracted;
  try {
    p = extractHtml(html);
  } catch {
    return null;
  }
  const blob = p.text.join(" ");
  const words = blob.split(/\s+/).filter(Boolean);
  const nWords = words.length;
  if (nWords < 120) return null;

  const sentences = blob
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 24);
  const lead = words.slice(0, 60).join(" ").toLowerCase();

  // answer-first
  let answer = 100.0;
  if (startsWithPronoun(lead)) answer -= 35;
  const first90 = words.slice(0, 90).join(" ");
  if (!STAT.test(first90) && !lead.includes("is ") && !lead.includes("are ")) answer -= 25;
  STAT.lastIndex = 0;
  if (["welcome", "sign up", "get started", "book a demo", "contact us"].some((w) => lead.includes(w))) answer -= 25;
  answer = Math.max(0, answer);

  // self-containment
  let selfContained = 40.0;
  if (sentences.length) {
    const bad = sentences.filter((s) => startsWithPronoun(s)).length;
    selfContained = 100 * (1 - bad / sentences.length);
  }

  // structure
  const perK = 1000 / Math.max(nWords, 1);
  const headings = (p.h2 + p.h3) * perK;
  const lists = p.li * perK;
  const structure = Math.min(100, 55 * Math.min(1, headings / 6) + 45 * Math.min(1, lists / 10));

  // statistics density
  const statsN = (blob.match(STAT) || []).length;
  STAT.lastIndex = 0;
  const statistics = Math.min(100, 100 * Math.min(1, (statsN * perK) / 8));

  // specificity
  const proper = new Set(blob.match(PROPER) || []).size;
  const specificity = Math.min(100, 100 * Math.min(1, (proper * perK) / 12));

  const score = Math.round(
    0.3 * answer + 0.25 * selfContained + 0.2 * structure + 0.15 * statistics + 0.1 * specificity,
  );
  return {
    url,
    title: (p.title || url).slice(0, 90),
    words: nWords,
    score,
    subscores: {
      answer_first: Math.round(answer),
      self_contained: Math.round(selfContained),
      structure: Math.round(structure),
      statistics: Math.round(statistics),
      specificity: Math.round(specificity),
    },
    stats_found: statsN,
    headings: p.h2 + p.h3,
  };
}

export function discover(base: string, html: string): string[] {
  let host: string;
  try {
    host = new URL(base).host;
  } catch {
    host = "";
  }
  let p: Extracted;
  try {
    p = extractHtml(html);
  } catch {
    p = { text: [], h2: 0, h3: 0, li: 0, links: [], title: "" };
  }
  const seen = new Set<string>();
  const urls = [base];
  const skipFrag = ["#", "mailto:", "tel:", ".pdf", ".png", ".jpg", ".svg", "/privacy", "/terms", "/cookie"];
  for (const href of p.links) {
    const u = resolveUrl(base, href.split("#")[0]);
    let uHost: string;
    try {
      uHost = new URL(u).host;
    } catch {
      continue;
    }
    if (uHost !== host || seen.has(u) || u === base) continue;
    if (skipFrag.some((s) => u.toLowerCase().includes(s))) continue;
    seen.add(u);
    urls.push(u);
    if (urls.length >= MAX_PAGES) break;
  }
  return urls;
}

export async function citability(cfg: AppConfig, onProgress?: Progress): Promise<any> {
  const base = "https://" + cfg.brand.domain.replace(/\/$/, "");
  onProgress?.(`[citability] scoring owned pages under ${base}…`);
  const { status, body } = await fetchText(base, { htmlOnly: true });
  const pages: any[] = [];
  if (status === 200 && body) {
    for (const url of discover(base, body)) {
      const { status: st, body: pageBody } = url === base ? { status, body } : await fetchText(url, { htmlOnly: true });
      if (st === 200 && pageBody) {
        const sc = scorePage(url, pageBody);
        if (sc) pages.push(sc);
      }
    }
  }
  pages.sort((a, b) => b.score - a.score);
  const score = pages.length ? Math.round(pages.reduce((a, p) => a + p.score, 0) / pages.length) : 0;

  const out = {
    domain: base,
    fetched_at: nowIso(),
    score,
    pages_scored: pages.length,
    rubric: { answer_first: 0.3, self_contained: 0.25, structure: 0.2, statistics: 0.15, specificity: 0.1 },
    pages,
    note: "deterministic (no-LLM) page citability — uniqueness uses entity richness as a stand-in",
  };
  writeJson(path.join(cfg.outputDir, "citability.json"), out);
  onProgress?.(`[citability] mean score ${score}/100 across ${pages.length} pages`);
  return out;
}
