// Pipeline configuration — merges config/risa.yaml (brand/domain model) with the
// setup-wizard config (web/data/app-config.json) and .env runtime knobs.
// Ported 1:1 from geo/config.py + run.py::_apply_app_config.
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

export type Brand = {
  name: string;
  aliases: string[];
  domain: string;
  ownedDomains: string[];
  positioning: string;
  proofMetrics: Record<string, string>;
  trustAnchors: string[];
};

export type Competitor = {
  name: string;
  category: string;
  side: string;
  aliases: string[];
  domain: string;
};

export type Persona = {
  id: string;
  title: string;
  pain: string;
  queries: string[];
};

export type KeywordMeta = { id: string; label: string; category: string };

export type AppConfig = {
  brand: Brand;
  competitors: Competitor[];
  topics: string[];
  personas: Persona[];
  citationSocial: string[];
  // runtime
  engines: string[];
  collectionModel: string;
  extractionModel: string;
  responsesPerPrompt: number;
  enrich: boolean;
  useWebSearch: boolean;
  webSearchMaxUses: number;
  collectionMaxTokens: number;
  rateLimitSleep: number;
  promptsPath: string;
  outputDir: string;
  keywordMeta: KeywordMeta[];
};

// ── env helpers ────────────────────────────────────────────────────────────
const S = (k: string, d: string) => (process.env[k] ?? "") || d;
const I = (k: string, d: number) => (process.env[k] ? parseInt(process.env[k] as string, 10) : d);
const F = (k: string, d: number) => (process.env[k] ? parseFloat(process.env[k] as string) : d);
const B = (k: string, d: boolean) => {
  const v = process.env[k];
  if (v == null || v === "") return d;
  return ["1", "true", "yes", "y", "on"].includes(v.trim().toLowerCase());
};
const L = (k: string, d: string[]) => {
  const v = process.env[k];
  if (v == null || v === "") return d;
  return v.split(",").map((s) => s.trim()).filter(Boolean);
};

// Repo root = one level above the Next app (web/). Mirrors run.py REPO_ROOT.
export const REPO_ROOT = path.resolve(process.cwd(), "..");

function firstExisting(paths: string[]): string | null {
  for (const p of paths) if (fs.existsSync(p)) return p;
  return null;
}

export function allNames(c: Competitor): string[] {
  return [c.name, ...c.aliases];
}

export function normalizedDir(cfg: AppConfig): string {
  return path.join(cfg.outputDir, "normalized");
}

// Output dir resolved identically to web/lib/data.ts so the pipeline writes
// exactly where the dashboard reads.
export function resolveOutputDir(): string {
  const bundled = path.resolve(process.cwd(), "data", "output");
  return (
    process.env.GEO_OUTPUT_DIR ||
    (fs.existsSync(bundled) ? bundled : path.resolve(process.cwd(), "..", "output"))
  );
}

export function loadConfig(): AppConfig {
  const configPath =
    firstExisting([
      process.env.CONFIG_PATH || "",
      // Bundled inside the app (Cloud Run / App Hosting ships only web/).
      path.join(process.cwd(), "config", "risa.yaml"),
      // Local dev: config lives at the repo root, one level above web/.
      path.join(REPO_ROOT, "config", "risa.yaml"),
      path.join(process.cwd(), "..", "config", "risa.yaml"),
    ]) || path.join(process.cwd(), "config", "risa.yaml");

  const raw = parseYaml(fs.readFileSync(configPath, "utf8")) as any;

  const b = raw.brand || {};
  const brand: Brand = {
    name: b.name,
    aliases: b.aliases || [b.name],
    domain: b.domain || "",
    ownedDomains: b.owned_domains || [],
    positioning: (b.positioning || "").trim(),
    proofMetrics: b.proof_metrics || {},
    trustAnchors: b.trust_anchors || [],
  };

  const competitors: Competitor[] = (raw.competitors || []).map((c: any) => ({
    name: c.name,
    category: c.category || "",
    side: c.side || "",
    aliases: c.aliases || [],
    domain: c.domain || "",
  }));

  const personas: Persona[] = (raw.personas || []).map((p: any) => ({
    id: p.id,
    title: p.title,
    pain: p.pain || "",
    queries: p.queries || [],
  }));

  const citationSocial: string[] = (raw.citation_classes || {}).social || [];

  const cfg: AppConfig = {
    brand,
    competitors,
    topics: raw.topics || [],
    personas,
    citationSocial,
    engines: L("ENGINES", ["claude"]),
    collectionModel: S("COLLECTION_MODEL", "claude-sonnet-4-6"),
    extractionModel: S("EXTRACTION_MODEL", "claude-haiku-4-5"),
    responsesPerPrompt: I("RESPONSES_PER_PROMPT", 1),
    enrich: B("ENRICH", true),
    useWebSearch: B("USE_WEB_SEARCH", true),
    webSearchMaxUses: I("WEB_SEARCH_MAX_USES", 5),
    collectionMaxTokens: I("COLLECTION_MAX_TOKENS", 4000),
    rateLimitSleep: F("RATE_LIMIT_SLEEP", 0),
    // Deterministic absolute path. The legacy .env PROMPTS_PATH was relative to
    // the repo root (Python cwd); honor it only if absolute, else pin to REPO_ROOT.
    promptsPath:
      process.env.GEO_PROMPTS_PATH ||
      (process.env.PROMPTS_PATH && path.isAbsolute(process.env.PROMPTS_PATH)
        ? process.env.PROMPTS_PATH
        : path.join(REPO_ROOT, "prompts", "risa_prompts.csv")),
    outputDir: resolveOutputDir(),
    keywordMeta: [],
  };

  applyAppConfig(cfg);
  return cfg;
}

// Merge setup-wizard config (web/data/app-config.json) into cfg in place.
// Lets the wizard drive which keywords + competitors the pipeline tracks.
function applyAppConfig(cfg: AppConfig): void {
  const p = firstExisting([
    path.join(process.cwd(), "data", "app-config.json"),
    path.join(REPO_ROOT, "web", "data", "app-config.json"),
  ]);
  if (!p) return;

  let appCfg: any;
  try {
    appCfg = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return;
  }
  if (!appCfg) return;

  const b = appCfg.brand || {};
  if (b.name) cfg.brand.name = b.name;
  if (b.domain) cfg.brand.domain = b.domain;
  if (b.aliases) cfg.brand.aliases = b.aliases;

  const compList: any[] = appCfg.competitors || [];
  if (compList.length) {
    cfg.competitors = compList.map((c) => ({
      name: c.name,
      category: c.category || "",
      side: c.side || "adjacent",
      aliases: [],
      domain: c.domain || "",
    }));
  }

  const kwList: KeywordMeta[] = appCfg.keywords || [];
  if (kwList.length) {
    cfg.topics = kwList.map((k) => k.label);
    cfg.keywordMeta = kwList;
  }
}
