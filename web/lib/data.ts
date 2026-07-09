// Server-only typed loaders over the pipeline outputs (output/*).
// The output directory is the API boundary: Python owns it, Next reads it.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import Papa from "papaparse";
import type {
  Summary, PromptRow, CompetitorRow, CitationRow, ActionRow, HistoryRun, SiteAudit, ScoreDoc, CitabilityDoc,
  BrandPresenceDoc, EeatDoc, SiteAuditReport, CompetitorProfile,
} from "./types";

// Local dev reads the live pipeline output at ../output. For deploys (Vercel), the
// data is bundled into the project at data/output — prefer that when present so the
// app works without the sibling directory.
const DATA_DIR = path.resolve(process.cwd(), "data");
const BUNDLED_OUTPUT = path.join(DATA_DIR, "output");
const OUTPUT_DIR =
  process.env.GEO_OUTPUT_DIR ||
  (fs.existsSync(BUNDLED_OUTPUT) ? BUNDLED_OUTPUT : path.resolve(process.cwd(), "..", "output"));

function readText(rel: string): string | null {
  try { return fs.readFileSync(path.join(OUTPUT_DIR, rel), "utf8"); }
  catch { return null; }
}
function readJson<T>(rel: string): T | null {
  const t = readText(rel);
  if (t == null) return null;
  try { return JSON.parse(t) as T; } catch { return null; }
}
function readDataJson<T>(name: string): T | null {
  try {
    const t = fs.readFileSync(path.join(DATA_DIR, name), "utf8");
    return JSON.parse(t) as T;
  } catch { return null; }
}
function readCsv<T>(rel: string): T[] {
  const t = readText(rel);
  if (t == null) return [];
  return (Papa.parse(t, { header: true, skipEmptyLines: true }).data as T[]) || [];
}

// runId = the actual run timestamp from history (real "last run" date). File mtime is
// unreliable once bundled/deployed (build tools reset it), so use the recorded ts first.
export const getRunId = cache((): string => {
  const hist = readJson<Array<{ ts?: string }>>("history/index.json");
  const lastTs = hist && hist.length ? hist[hist.length - 1]?.ts : undefined;
  if (lastTs) return lastTs;
  try { return fs.statSync(path.join(OUTPUT_DIR, "summary_metrics.json")).mtime.toISOString(); }
  catch { return "none"; }
});

export const getSummary = cache(() => readJson<Summary>("summary_metrics.json"));
export const getPrompts = cache(() => readCsv<PromptRow>("prompt_analysis.csv"));
export const getCompetitors = cache(() => readCsv<CompetitorRow>("normalized/competitor_analysis.csv"));
export const getCitations = cache(() => readCsv<CitationRow>("normalized/citations.csv"));
export const getCitationUrls = cache(() => readCsv<{ url: string; domain: string; class: string; title: string; prompt: string; engine: string; persona: string; topic: string }>("normalized/citation_urls.csv"));
export const getRecommendedActions = cache(() => readCsv<ActionRow>("normalized/recommended_actions.csv"));
export const getNormalized = cache((name: string) => readCsv<Record<string, string>>(`normalized/${name}.csv`));
export const getHistory = cache(() => readJson<HistoryRun[]>("history/index.json") || []);
export const getSiteAudit = cache(() => readJson<SiteAudit>("site_audit.json"));
export const getSiteAuditReport = cache(() => readDataJson<SiteAuditReport>("site-audit.json"));
export const getScore = cache(() => readJson<ScoreDoc>("geo_score.json"));
export const getCitability = cache(() => readJson<CitabilityDoc>("citability.json"));
export const getBrandPresence = cache(() => readJson<BrandPresenceDoc>("brand_presence.json"));
export const getEeat = cache(() => readJson<EeatDoc>("eeat.json"));
export const getCompetitorProfiles = cache(() => readJson<CompetitorProfile[]>("competitor_profiles.json") ?? []);

// Derived lookups used across screens.
export const getDomainClass = cache((): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const c of getCitations()) if (c.domain) map[c.domain] = c.class;
  return map;
});
export const getCompetitorMeta = cache((): Record<string, { category: string; side: string }> => {
  const map: Record<string, { category: string; side: string }> = {};
  for (const c of getCompetitors()) map[c.competitor] = { category: c.category, side: c.side };
  return map;
});
export const getActionsByPrompt = cache((): Record<string, string[]> => {
  const map: Record<string, string[]> = {};
  for (const a of getRecommendedActions()) (map[a.prompt] ||= []).push(a.action);
  return map;
});

export const getLocalAppConfig = cache(() => readDataJson<{
  keywords?: { id: string; label: string; category: string }[];
  competitors?: { id: string; name: string }[];
  brand?: { name: string; domain: string };
}>("app-config.json"));

export function hasData(): boolean {
  return getSummary() != null;
}
