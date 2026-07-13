// Build the GEO prompt library — questions a buyer would ask an AI answer engine.
// Ported 1:1 from geo/prompts.py. Prompts are generated dynamically from the
// selected keywords (cfg.keywordMeta) so the wizard drives the run.
import { AppConfig } from "./config";
import { writeCsv, readCsv } from "./io";

const CATEGORY_PERSONA: Record<string, string> = {
  core: "cro",
  clinical: "cmo",
  tech: "cio",
  custom: "ceo",
};

const DISCOVERY_TEMPLATES = [
  "What are the biggest challenges with {kw} in community oncology?",
  "How do oncology practices handle {kw} today?",
  "What software automates {kw} for cancer centers?",
  "How can an oncology group reduce costs related to {kw}?",
  "How does AI improve {kw} in oncology?",
  "Why do community oncology practices struggle with {kw}?",
  "What does good {kw} look like at a high-performing oncology practice?",
  "What is the ROI of investing in {kw} technology for oncology?",
  "How do payers and providers disagree on {kw} in oncology?",
  "What are the regulatory requirements around {kw} in cancer care?",
  "How do staffing shortages affect {kw} at community cancer centers?",
  "What metrics should an oncology CFO track for {kw}?",
  "How do large oncology networks like OneOncology approach {kw}?",
  "What are common mistakes oncology practices make with {kw}?",
  "How has {kw} changed in oncology over the last five years?",
];

const COMPARISON_TEMPLATES = [
  "Best AI solutions for {kw} in community oncology 2026",
  "Top vendors for {kw} in cancer centers",
  "Which companies are leading in {kw} automation for oncology?",
  "How do different {kw} platforms compare for community cancer centers?",
  "What should oncology practices look for when buying a {kw} solution?",
  "Build vs buy: should oncology practices build their own {kw} system?",
];

const BRAND_TEMPLATES = [
  "How does {brand} solve {kw} for oncology practices?",
  "What results has {brand} delivered for {kw}?",
  "Is {brand} a good fit for {kw} at a community cancer center?",
  "How does {brand}'s approach to {kw} differ from competitors?",
];

type Tup = [string, string, string, string]; // prompt, persona, topic, intent

function fill(t: string, kw: string, brand: string): string {
  return t.replaceAll("{kw}", kw).replaceAll("{brand}", brand);
}

function keywordPrompts(label: string, category: string, brand: string, competitors: string[]): Tup[] {
  const persona = CATEGORY_PERSONA[category] || "cro";
  const kw = label.toLowerCase();
  const rows: Tup[] = [];
  for (const t of DISCOVERY_TEMPLATES) rows.push([fill(t, kw, brand), persona, label, "discovery"]);
  for (const t of COMPARISON_TEMPLATES) rows.push([fill(t, kw, brand), "ceo", label, "comparison"]);
  for (const t of BRAND_TEMPLATES) rows.push([fill(t, kw, brand), persona, label, "brand"]);
  for (const comp of competitors.slice(0, 3)) {
    rows.push([`${brand} vs ${comp} for ${kw} in oncology`, "cio", label, "comparison"]);
  }
  return rows;
}

function competitorPrompts(brand: string, competitors: string[]): Tup[] {
  const rows: Tup[] = [];
  for (const comp of competitors.slice(0, 6)) {
    rows.push([
      `How does ${comp} compare to ${brand} for oncology prior authorization?`,
      "cio",
      "competitive comparison",
      "comparison",
    ]);
  }
  if (competitors.length >= 2) {
    const vs = competitors.slice(0, 3).join(" vs ");
    rows.push([`${vs} — which is best for community oncology revenue cycle?`, "ceo", "competitive comparison", "comparison"]);
  }
  return rows;
}

export type PromptRow = { id: string; prompt: string; persona: string; topic: string; intent: string };

export function buildPromptLibrary(cfg: AppConfig): PromptRow[] {
  const rows: PromptRow[] = [];
  const seen = new Set<string>();

  const add = (prompt: string, persona: string, topic: string, intent: string) => {
    const key = prompt.trim().toLowerCase();
    if (!prompt.trim() || seen.has(key)) return;
    seen.add(key);
    rows.push({
      id: `p${String(rows.length + 1).padStart(3, "0")}`,
      prompt: prompt.trim(),
      persona,
      topic,
      intent,
    });
  };

  const brand = cfg.brand.name;
  const competitors = cfg.competitors.map((c) => c.name);

  const kwList = cfg.keywordMeta || [];
  if (kwList.length) {
    for (const kw of kwList) {
      for (const [p, persona, topic, intent] of keywordPrompts(kw.label, kw.category || "core", brand, competitors)) {
        add(p, persona, topic, intent);
      }
    }
  } else if (cfg.topics.length) {
    for (const label of cfg.topics) {
      for (const [p, persona, topic, intent] of keywordPrompts(label, "core", brand, competitors)) {
        add(p, persona, topic, intent);
      }
    }
  }

  for (const [p, persona, topic, intent] of competitorPrompts(brand, competitors)) add(p, persona, topic, intent);

  for (const persona of cfg.personas) {
    for (const q of persona.queries) add(q, persona.id, "", "discovery");
  }

  return rows;
}

export function writePromptsCsv(rows: PromptRow[], filePath: string): void {
  writeCsv(filePath, rows as unknown as Record<string, unknown>[]);
}

export function readPromptsCsv(filePath: string): PromptRow[] {
  return readCsv<PromptRow>(filePath);
}
