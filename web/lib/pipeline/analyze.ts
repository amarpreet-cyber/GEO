// Stage 2 — analysis. responses.json -> summary_metrics.json + normalized CSVs.
// Ported from geo/analyze.py.
import path from "node:path";
import { AppConfig, normalizedDir } from "./config";
import * as M from "./metrics";
import type { Row } from "./metrics";
import { Enricher, stubEnrich } from "./enrich";
import { writeJson, writeCsv, readJson } from "./io";
import type { Progress } from "./collect";

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "");
}

function loadResponses(cfg: AppConfig): Row[] {
  return readJson<Row[]>(path.join(cfg.outputDir, "responses.json")) || [];
}

function urlTitle(url: string): string {
  try {
    const p = new URL(url).pathname.replace(/\/$/, "");
    let slug = p.includes("/") ? p.split("/").pop()! : p;
    if (slug.includes(".")) slug = slug.split(".").slice(0, -1).join(".");
    const title = slug
      .replace(/[-_]/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return title || url;
  } catch {
    return url;
  }
}

export async function analyze(
  cfg: AppConfig,
  records: Row[] | null,
  onProgress?: Progress,
): Promise<any> {
  let rows = records ?? loadResponses(cfg);
  rows = rows.filter((r) => !r.error);

  const useEnrich = cfg.enrich && !!process.env.ANTHROPIC_API_KEY;
  const enricher = useEnrich ? new Enricher(cfg) : null;
  if (!useEnrich) onProgress?.("[analyze] enrichment OFF (no key or ENRICH=0) — deterministic metrics only");

  // 1. deterministic signals + enrichment, per response
  let i = 0;
  const total = rows.length;
  for (const r of rows) {
    const text = r.response || "";
    const hits = M.entityHits(text, cfg);
    r._hits = hits;
    r._brand_position = M.brandPosition(hits, cfg.brand.name);
    const compsPresent = Object.keys(hits.competitors);
    if (enricher) {
      r._enrich = await enricher.enrich(r.prompt, text, hits.brand.mentioned, compsPresent);
    } else {
      r._enrich = stubEnrich(hits.brand.mentioned);
    }
    i++;
    if (i % Math.max(1, Math.floor(total / 40)) === 0 || i === total) {
      const pct = total ? Math.floor((100 * i) / total) : 100;
      onProgress?.(`Analyzing answers: ${pct}%| ${i}/${total} [ans]`);
    }
  }

  // 2. aggregate metrics
  const sov = M.shareOfVoice(rows, cfg);
  const citations = M.citationSummary(rows, cfg);
  const leaderboard = M.competitorLeaderboard(rows, cfg);
  const sentimentCounts: Record<string, number> = {};
  for (const r of rows) {
    const lbl = r._enrich?.brand_sentiment_label || "absent";
    sentimentCounts[lbl] = (sentimentCounts[lbl] || 0) + 1;
  }

  const byTopic = M.rollup(rows, "topic");
  const byPersona = M.rollup(rows, "persona");
  const byEngine = M.rollup(rows, "engine");
  const byIntent = M.rollup(rows, "intent");

  const summary = {
    brand: cfg.brand.name,
    generated_engines: [...new Set(rows.map((r) => r.engine))].sort(),
    prompts_count: rows.length,
    visibility_score: M.visibilityScore(rows),
    mention_rate: M.mentionRate(rows),
    average_position: M.avgPosition(rows),
    share_of_voice: sov,
    brand_share_of_voice: sov[cfg.brand.name] || 0,
    sentiment_distribution: sentimentCounts,
    citations,
    top_competitors: leaderboard.slice(0, 5).map((c) => c.competitor),
    by_topic: byTopic,
    by_persona: byPersona,
    by_engine: byEngine,
    by_intent: byIntent,
  };
  writeJson(path.join(cfg.outputDir, "summary_metrics.json"), summary);

  // 3. normalized CSVs
  writePromptAnalysis(cfg, rows);
  writeCsv(path.join(normalizedDir(cfg), "competitor_analysis.csv"), leaderboard);
  writeCsv(
    path.join(normalizedDir(cfg), "share_of_voice.csv"),
    Object.entries(sov).map(([k, v]) => ({ entity: k, share: v, is_brand: k === cfg.brand.name })),
  );
  writeCsv(path.join(normalizedDir(cfg), "citations.csv"), citations.top_domains);

  writeCitationUrls(cfg, rows, onProgress);

  const actions: any[] = [];
  const emerging: any[] = [];
  for (const r of rows) {
    for (const a of r._enrich?.recommended_actions || []) {
      actions.push({ prompt: r.prompt, persona: r.persona, topic: r.topic, action: a });
    }
    for (const t of r._enrich?.emerging_topics || []) {
      emerging.push({ prompt: r.prompt, topic: t });
    }
  }
  writeCsv(path.join(normalizedDir(cfg), "recommended_actions.csv"), actions);
  writeCsv(path.join(normalizedDir(cfg), "emerging_topics.csv"), emerging);

  const segMap: Record<string, Record<string, any>> = {
    topic: byTopic,
    persona: byPersona,
    engine: byEngine,
    intent: byIntent,
  };
  for (const [seg, rollupObj] of Object.entries(segMap)) {
    const rollupRows = Object.entries(rollupObj).map(([k, v]) => ({ segment: k, ...v }));
    writeCsv(path.join(normalizedDir(cfg), `rollup_${seg}.csv`), rollupRows);
  }

  // 4. extensive (per-prompt narrative)
  const extensive = rows.map((r) => ({
    prompt: r.prompt,
    engine: r.engine,
    persona: r.persona,
    topic: r.topic,
    brand_mentioned: r._hits!.brand.mentioned,
    brand_position: r._brand_position,
    summary: r._enrich?.answer_summary || "",
    sentiment_label: r._enrich?.brand_sentiment_label,
    sentiment_reasoning: r._enrich?.brand_sentiment_reasoning || "",
    recommended_actions: r._enrich?.recommended_actions || [],
  }));
  writeJson(path.join(cfg.outputDir, "extensive_analysis.json"), extensive);

  snapshotHistory(cfg, summary);

  onProgress?.(
    `[analyze] visibility=${summary.visibility_score}  mention_rate=${summary.mention_rate}%  ` +
      `brand_SoV=${Math.round(summary.brand_share_of_voice * 1000) / 10}% -> ${cfg.outputDir}`,
  );
  return summary;
}

function writePromptAnalysis(cfg: AppConfig, rows: Row[]): void {
  const out = rows.map((r) => {
    const enr = r._enrich || {};
    const hits = r._hits!;
    const citedDomains = [
      ...new Set(
        (r.cited_urls?.length ? r.cited_urls : r.searched_urls || [])
          .map((u) => M.classifyCitation(u, cfg)[0])
          .filter(Boolean),
      ),
    ].sort();
    return {
      prompt: r.prompt,
      engine: r.engine,
      model: r.model,
      persona: r.persona,
      topic: r.topic,
      intent: r.intent,
      brand_mentioned: hits.brand.mentioned,
      brand_mentions: hits.brand.count,
      brand_position: r._brand_position,
      brand_sentiment: enr.brand_sentiment_score,
      brand_sentiment_label: enr.brand_sentiment_label,
      competitors_present: JSON.stringify(Object.keys(hits.competitors)),
      n_citations: (r.cited_urls?.length ? r.cited_urls : r.searched_urls || []).length,
      cited_domains: JSON.stringify(citedDomains),
      answer_summary: enr.answer_summary || "",
      response: r.response || "",
    };
  });
  writeCsv(path.join(normalizedDir(cfg), "prompt_analysis.csv"), out);
  writeCsv(path.join(cfg.outputDir, "prompt_analysis.csv"), out); // dashboard reads top-level copy
}

function writeCitationUrls(cfg: AppConfig, rows: Row[], onProgress?: Progress): void {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const r of rows) {
    const urls = r.cited_urls?.length ? r.cited_urls : r.searched_urls || [];
    for (const u of urls) {
      const [dom, klass] = M.classifyCitation(u, cfg);
      if (!dom) continue;
      const key = u + "|||" + r.prompt;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        url: u,
        domain: dom,
        class: klass,
        title: urlTitle(u),
        prompt: r.prompt || "",
        engine: r.engine || "",
        persona: r.persona || "",
        topic: r.topic || "",
      });
    }
  }
  writeCsv(path.join(normalizedDir(cfg), "citation_urls.csv"), out);
  onProgress?.(`[analyze] wrote ${out.length} citation URLs`);
}

function snapshotHistory(cfg: AppConfig, summary: any): void {
  const idxPath = path.join(cfg.outputDir, "history", "index.json");
  const runs = readJson<any[]>(idxPath) || [];
  runs.push({
    ts: nowIso(),
    engines: summary.generated_engines,
    prompts_count: summary.prompts_count,
    visibility_score: summary.visibility_score,
    mention_rate: summary.mention_rate,
    average_position: summary.average_position,
    brand_share_of_voice: Math.round(summary.brand_share_of_voice * 100 * 100) / 100,
  });
  writeJson(idxPath, runs);
}
