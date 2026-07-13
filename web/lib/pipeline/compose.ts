// Composite GEO score — aligned to the GEO research paper (Aggarwal et al., 2024).
// Ported from geo/compose.py.
//
//   DEMAND (40%): visibility 30% (mean 1/rank) + share_of_voice 10%
//   SUPPLY (60%): citability 20% + brand 15% + eeat 10% + technical 8% + schema 4% + platform 3%
import path from "node:path";
import { AppConfig } from "./config";
import { readJson, readCsv, writeJson } from "./io";
import type { Progress } from "./collect";

const WEIGHTS: Record<string, number> = {
  visibility: 0.3,
  share_of_voice: 0.1,
  citability: 0.2,
  brand: 0.15,
  eeat: 0.1,
  technical: 0.08,
  schema: 0.04,
  platform: 0.03,
};
const LABELS: Record<string, string> = {
  visibility: "Answer-engine visibility",
  share_of_voice: "Share of voice",
  citability: "Citability",
  brand: "Brand authority",
  eeat: "E-E-A-T",
  technical: "Technical",
  schema: "Schema / entity",
  platform: "Platform coverage",
};

const clamp = (v: number) => Math.max(0, Math.min(100, v));
const grade = (v: number) => (v >= 60 ? "A" : v >= 40 ? "B" : v >= 20 ? "C" : v >= 10 ? "D" : "F");
const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "");

type Component = { key: string; label: string; value: number; weight: number; contribution: number; measured: boolean; note: string };
function comp(key: string, value: number, measured: boolean, note: string): Component {
  const v = Math.round(value * 10) / 10;
  return {
    key,
    label: LABELS[key],
    value: v,
    weight: WEIGHTS[key],
    contribution: Math.round(v * WEIGHTS[key] * 10) / 10,
    measured,
    note,
  };
}

type Issue = { severity: string; title: string; fix: string; module: string };
const issue = (severity: string, title: string, fix: string, module: string): Issue => ({ severity, title, fix, module });

export function compose(cfg: AppConfig, onProgress?: Progress): any {
  const outDir = cfg.outputDir;
  const summary = readJson<any>(path.join(outDir, "summary_metrics.json")) || {};
  const audit = readJson<any>(path.join(outDir, "site_audit.json")) || {};
  const citab = readJson<any>(path.join(outDir, "citability.json"));
  const eeatDoc = readJson<any>(path.join(outDir, "eeat.json"));
  const presence = readJson<any>(path.join(outDir, "brand_presence.json"));
  const cites = readCsv<any>(path.join(outDir, "normalized", "citations.csv"));

  const crawler = audit.crawler || {};
  const schema = audit.schema || {};
  const llmstxt = audit.llmstxt || {};

  // citation-registry rollups
  const byClass: Record<string, number> = {};
  const domainsByClass: Record<string, Set<string>> = {};
  for (const r of cites) {
    const k = (r.class || "earned").trim();
    const n = parseInt(r.citations || "0", 10) || 0;
    byClass[k] = (byClass[k] || 0) + n;
    (domainsByClass[k] ||= new Set()).add(r.domain);
  }
  const totalCites = Object.values(byClass).reduce((a, b) => a + b, 0) || 1;
  const owned = byClass.owned || 0;
  const earned = byClass.earned || 0;
  const social = byClass.social || 0;
  const ownedEarnedShare = (100 * (owned + earned)) / totalCites;
  const distinctDomains = new Set(cites.map((r: any) => r.domain).filter(Boolean)).size;
  const distinctEarned = (domainsByClass.earned || new Set()).size;
  const sameasLinked = (schema.sameas_linked || []).length;

  // demand-side
  const visRaw = Number(summary.visibility_score || 0);
  const sovRaw = Number(summary.brand_share_of_voice || 0) * 100;
  const promptsCount = Number(summary.prompts_count || 0);
  const demandMeasured = promptsCount > 0;

  const components: Component[] = [];

  components.push(
    comp(
      "visibility",
      visRaw,
      demandMeasured,
      demandMeasured
        ? `mean(1/rank) across ${promptsCount} prompts × 3 engines (Claude, GPT-4o, Gemini)`
        : "no pipeline run yet — run the full pipeline to collect answers",
    ),
  );
  components.push(
    comp(
      "share_of_voice",
      sovRaw,
      demandMeasured,
      demandMeasured ? `RISA share of all tracked entity mentions across ${promptsCount} prompts` : "no pipeline run yet",
    ),
  );

  // citability
  if (citab && citab.pages) {
    components.push(comp("citability", Number(citab.score || 0), true, `mean of ${citab.pages.length} owned pages`));
  } else {
    components.push(comp("citability", clamp(0.6 * ownedEarnedShare), false, "estimate — run citability for page-level scores"));
  }

  // brand authority
  if (presence && presence.score != null) {
    components.push(comp("brand", Number(presence.score), true, "off-site presence scan"));
  } else {
    const v = clamp(
      0.45 * ownedEarnedShare + 0.3 * 100 * Math.min(1, sameasLinked / 8) + 0.25 * 100 * Math.min(1, owned / 5),
    );
    components.push(comp("brand", v, false, "estimate from citations + sameAs — run brand for the off-site scan"));
  }

  // E-E-A-T
  if (eeatDoc && eeatDoc.score != null) {
    components.push(comp("eeat", Number(eeatDoc.score), true, "content E-E-A-T scan"));
  } else {
    const v = clamp(
      25 * (schema.has_organization ? 1 : 0) +
        25 * Math.min(1, distinctEarned / 20) +
        25 * Math.min(1, owned / 5) +
        25 * Math.min(1, sameasLinked / 4),
    );
    components.push(comp("eeat", v, false, "estimate from entity + citation signals — run eeat for content scoring"));
  }

  // technical
  const techVal = clamp(0.7 * (crawler.score || 0) + 0.3 * (llmstxt.score || 0));
  components.push(comp("technical", techVal, !!Object.keys(audit).length, "crawler access + llms.txt"));

  // schema
  components.push(comp("schema", Number(schema.score || 0), !!Object.keys(audit).length, "homepage JSON-LD + sameAs"));

  // platform
  const platVal = clamp(
    50 * Math.min(1, distinctDomains / 40) + 30 * Math.min(1, social / 3) + 20 * Math.min(1, sameasLinked / 8),
  );
  components.push(comp("platform", platVal, true, "web-surface breadth across cited domains + social reach"));

  const subscores: Record<string, number> = {};
  for (const c of components) subscores[c.key] = Math.round(c.value * 10) / 10;
  const geo = Math.round(components.reduce((a, c) => a + c.value * WEIGHTS[c.key], 0) * 10) / 10;
  const gr = grade(geo);

  const issues = collectIssues(audit, citab, components, summary);

  const out = {
    generated_at: nowIso(),
    geo_score: geo,
    grade: gr,
    subscores,
    components,
    weights: WEIGHTS,
    issues,
    any_estimated: components.some((c) => !c.measured),
  };
  writeJson(path.join(outDir, "geo_score.json"), out);
  snapshot(outDir, geo);

  const measured = components.filter((c) => c.measured).length;
  onProgress?.(`[compose] GEO score = ${geo}/100  grade ${gr}  (${measured}/8 dimensions measured, ${issues.length} issues)`);
  return out;
}

function collectIssues(audit: any, citab: any, components: Component[], summary: any): Issue[] {
  const out: Issue[] = [];
  const schema = audit.schema || {};
  const llmstxt = audit.llmstxt || {};
  const crawler = audit.crawler || {};

  if (Object.keys(audit).length && !llmstxt.present)
    out.push(issue("error", "No llms.txt published", "Publish /llms.txt with sections + links. <1 hour; few competitors have one.", "llms.txt"));
  if (Object.keys(audit).length && !schema.has_organization)
    out.push(issue("error", "No Organization schema on the homepage", "Add Organization (or MedicalOrganization) JSON-LD so AI resolves RISA as one trusted entity.", "schema"));
  const miss = schema.sameas_missing || [];
  if (Object.keys(audit).length && miss.length >= 4)
    out.push(issue("warning", `sameAs profiles missing (${(schema.sameas_linked || []).length}/8 linked)`, "Add sameAs links (LinkedIn, Crunchbase, Wikipedia, YouTube) to the Organization block.", "schema"));
  if (crawler && crawler.blanket_block)
    out.push(issue("error", "robots.txt blanket-blocks crawlers", "Remove the `Disallow: /` for `*`; it gates everything downstream.", "crawlers"));

  const vis = Number(summary.visibility_score || 0);
  const promptsCount = Number(summary.prompts_count || 0);
  if (promptsCount === 0)
    out.push(issue("error", "No pipeline run yet — demand score is 0", "Run the full pipeline to collect answers and unlock 40% of the GEO score.", "visibility"));
  else if (vis < 20)
    out.push(issue("warning", `Low answer-engine visibility (${vis.toFixed(1)}/100)`, "Win the unmentioned discovery/comparison prompts in Opportunities; build citable owned pages.", "visibility"));

  const sent = summary.sentiment_distribution || {};
  const absent = sent.absent || 0;
  if (absent && promptsCount > 0)
    out.push(issue("notice", `RISA absent on ${absent} prompts`, "These are the supply gap — see Prompts for the ranked worklist.", "visibility"));

  if (citab && citab.pages) {
    const weak = citab.pages.filter((p: any) => (p.score ?? 100) < 50);
    if (weak.length)
      out.push(issue("warning", `${weak.length} owned page(s) below citable threshold`, "Rewrite with answer-first paragraphs, self-contained passages, and hard stats.", "citability"));
  } else {
    out.push(issue("notice", "Page-level citability not scored yet", "Run citability to score risalabs.ai pages on how quotable they are.", "citability"));
  }

  for (const c of components) {
    if (!c.measured && !["visibility", "share_of_voice"].includes(c.key))
      out.push(issue("notice", `${c.label} is estimated`, c.note, c.key));
  }

  const order: Record<string, number> = { error: 0, warning: 1, notice: 2 };
  out.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
  return out;
}

function snapshot(outDir: string, geo: number): void {
  const histPath = path.join(outDir, "history", "index.json");
  const hist = readJson<any[]>(histPath) || [];
  if (hist.length && typeof hist[hist.length - 1] === "object") {
    hist[hist.length - 1].geo_score = geo;
    writeJson(histPath, hist);
  }
}
