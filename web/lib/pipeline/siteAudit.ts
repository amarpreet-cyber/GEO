// Supply-side site diagnostics for the brand's own domain.
// Ported from geo/site_audit.py: crawler access, llms.txt, schema/sameAs.
import path from "node:path";
import { AppConfig } from "./config";
import { fetchText, resolveUrl } from "./html";
import { writeJson } from "./io";
import type { Progress } from "./collect";

const TIER1 = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-Web",
  "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended",
];
const TIER2 = [
  "Applebot-Extended", "Amazonbot", "Bytespider", "CCBot", "cohere-ai",
  "Meta-ExternalAgent", "Bingbot",
];
const SAMEAS_TARGETS = [
  "wikipedia.org", "wikidata.org", "linkedin.com", "crunchbase.com",
  "youtube.com", "github.com", "x.com", "twitter.com",
];

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "");
}

function parseRobots(text: string): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  let current: string[] | null = null;
  for (const raw of text.split("\n")) {
    const line = raw.split("#")[0].trim();
    if (!line || !line.includes(":")) continue;
    const idx = line.indexOf(":");
    const field = line.slice(0, idx).trim().toLowerCase();
    const val = line.slice(idx + 1).trim();
    if (field === "user-agent") {
      const ua = val.toLowerCase();
      current = groups[ua] ||= [];
    } else if (field === "disallow" && current != null) {
      current.push(val);
    }
  }
  return groups;
}

function botAllowed(bot: string, groups: Record<string, string[]>, robotsExists: boolean): boolean {
  if (!robotsExists) return true;
  let rules = groups[bot.toLowerCase()];
  if (rules == null) rules = groups["*"];
  if (rules == null) return true;
  return !rules.some((d) => d === "/");
}

async function crawlerAudit(base: string): Promise<any> {
  const { status, body } = await fetchText(resolveUrl(base, "/robots.txt"));
  const exists = status === 200 && !!(body || "").trim();
  const groups = exists ? parseRobots(body || "") : {};
  const bots = [
    ...TIER1.map((b) => ({ name: b, tier: 1, allowed: botAllowed(b, groups, exists) })),
    ...TIER2.map((b) => ({ name: b, tier: 2, allowed: botAllowed(b, groups, exists) })),
  ];
  const t1 = bots.filter((b) => b.tier === 1);
  const t2 = bots.filter((b) => b.tier === 2);
  const t1Ok = t1.filter((b) => b.allowed).length / t1.length;
  const t2Ok = t2.filter((b) => b.allowed).length / t2.length;
  const blanketBlock = (groups["*"] || []).some((d) => d === "/");
  const score = Math.round(
    100 * (0.5 * t1Ok + 0.25 * t2Ok + 0.15 * (blanketBlock ? 0 : 1) + 0.1 * (exists ? 1 : 0.5)),
  );
  return {
    score,
    robots_exists: exists,
    blanket_block: blanketBlock,
    tier1_allowed: `${t1.filter((b) => b.allowed).length}/${t1.length}`,
    tier2_allowed: `${t2.filter((b) => b.allowed).length}/${t2.length}`,
    bots,
  };
}

async function llmstxtAudit(base: string): Promise<any> {
  const { status, body } = await fetchText(resolveUrl(base, "/llms.txt"));
  const b = body || "";
  const present = status === 200 && !!b.trim() && !b.slice(0, 200).toLowerCase().includes("<html");
  if (!present) return { score: 0, present: false, note: "no /llms.txt — quick win (geo-llmstxt can generate one)" };
  const hasH1 = /^#\s+\S/m.test(b);
  const sections = (b.match(/^##\s+\S/gm) || []).length;
  const hasLinks = (b.split("](").length - 1) + (b.includes("http") ? 1 : 0) > 0;
  const score = Math.round(40 * (hasH1 ? 1 : 0) + 35 * Math.min(1, sections / 3) + 25 * (hasLinks ? 1 : 0));
  return { score, present: true, sections, chars: b.length };
}

async function schemaAudit(base: string): Promise<any> {
  const { status, body } = await fetchText(base);
  if (status !== 200 || !body) return { score: 0, reachable: false, note: `homepage not fetched (status ${status})` };
  const blocks = [...body.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(
    (m) => m[1],
  );
  const types = new Set<string>();
  const sameas = new Set<string>();
  let hasOrg = false;
  for (const raw of blocks) {
    let data: any;
    try {
      data = JSON.parse(raw.trim());
    } catch {
      continue;
    }
    const objs = Array.isArray(data) ? data : [data];
    for (const obj of objs) {
      if (!obj || typeof obj !== "object") continue;
      const t = obj["@type"];
      const tarr = Array.isArray(t) ? t : [t];
      for (const tt of tarr) {
        if (tt) types.add(tt);
        if (["Organization", "Corporation", "MedicalOrganization"].includes(tt)) hasOrg = true;
      }
      const sa = obj.sameAs;
      const saArr = Array.isArray(sa) ? sa : sa ? [sa] : [];
      for (const s of saArr) sameas.add(s);
    }
  }
  const linked = SAMEAS_TARGETS.filter((t) => [...sameas].some((s) => String(s).includes(t))).sort();
  const score = Math.round(
    35 * (hasOrg ? 1 : 0) +
      40 * Math.min(1, linked.length / 5) +
      15 * (blocks.length ? 1 : 0) +
      10 * Math.min(1, types.size / 3),
  );
  return {
    score,
    reachable: true,
    jsonld_blocks: blocks.length,
    has_organization: hasOrg,
    types: [...types].sort(),
    sameas_count: sameas.size,
    sameas_linked: linked,
    sameas_missing: SAMEAS_TARGETS.filter((t) => !linked.includes(t)),
  };
}

export async function siteAudit(cfg: AppConfig, onProgress?: Progress): Promise<any> {
  const base = "https://" + cfg.brand.domain.replace(/\/$/, "");
  onProgress?.(`[audit] auditing ${base} (crawlers, llms.txt, schema)…`);
  const crawler = await crawlerAudit(base);
  const llmstxt = await llmstxtAudit(base);
  const schema = await schemaAudit(base);
  const overall = Math.round(0.5 * crawler.score + 0.3 * schema.score + 0.2 * llmstxt.score);
  const out = {
    domain: base,
    fetched_at: nowIso(),
    readiness_score: overall,
    crawler,
    llmstxt,
    schema,
  };
  writeJson(path.join(cfg.outputDir, "site_audit.json"), out);
  onProgress?.(
    `[audit] readiness=${overall}/100  crawler=${crawler.score}  schema=${schema.score}  ` +
      `llms.txt=${llmstxt.score}  (Tier-1 crawlers allowed: ${crawler.tier1_allowed})`,
  );
  return out;
}
