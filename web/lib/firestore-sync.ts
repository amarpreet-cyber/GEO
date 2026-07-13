// Firestore stage-flush — mirror pipeline output into Firestore per stage.
// Ported from geo/firestore.py GeoStore.flush_after_stage. Deliberately free of
// React's cache() so it can be imported from the plain-Node CLI (tsx), unlike
// lib/firestore.ts which holds the React-cached dashboard readers.
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { getFirestore } from "./firebase-admin";

function rj(outputDir: string, name: string): unknown | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(outputDir, name), "utf8"));
  } catch {
    return null;
  }
}
function rc(outputDir: string, name: string): Record<string, string>[] | null {
  try {
    const text = fs.readFileSync(path.join(outputDir, name), "utf8");
    return (Papa.parse(text, { header: true, skipEmptyLines: true }).data as Record<string, string>[]) || [];
  } catch {
    return null;
  }
}

export async function flushStageToFirestore(runId: string, outputDir: string, stage: string): Promise<void> {
  const db = getFirestore();
  if (!db) return;
  try {
    const data: Record<string, unknown> = {};
    if (["analyze", "all", "full"].includes(stage)) {
      const summary = rj(outputDir, "summary_metrics.json");
      if (summary) data.summary = summary;
      const norm: Record<string, unknown> = {};
      for (const key of [
        "competitor_analysis", "citations", "share_of_voice",
        "rollup_topic", "rollup_persona", "rollup_intent", "rollup_engine",
        "recommended_actions", "emerging_topics",
      ]) {
        const rows = rc(outputDir, `normalized/${key}.csv`);
        if (rows != null) norm[key] = rows;
      }
      if (Object.keys(norm).length) data.normalized = norm;
    }
    if (["audit", "full"].includes(stage)) { const v = rj(outputDir, "site_audit.json"); if (v) data.site_audit = v; }
    if (["citability", "full"].includes(stage)) { const v = rj(outputDir, "citability.json"); if (v) data.citability = v; }
    if (["brand", "full"].includes(stage)) { const v = rj(outputDir, "brand_presence.json"); if (v) data.brand_presence = v; }
    if (["eeat", "full"].includes(stage)) { const v = rj(outputDir, "eeat.json"); if (v) data.eeat = v; }
    if (["compose", "full"].includes(stage)) { const v = rj(outputDir, "geo_score.json"); if (v) data.geo_score = v; }
    if (["comp-profile", "full"].includes(stage)) { const v = rj(outputDir, "competitor_profiles.json"); if (v) data.competitor_profiles = v; }

    if (Object.keys(data).length) await db.collection("geo_runs").doc(runId).update(data);
    if (["analyze", "all", "full"].includes(stage)) await flushPrompts(db, runId, outputDir);
  } catch {
    /* Firestore flush is best-effort — never fail the run on it */
  }
}

async function flushPrompts(db: FirebaseFirestore.Firestore, runId: string, outputDir: string): Promise<void> {
  const rows = rc(outputDir, "prompt_analysis.csv");
  if (!rows) return;
  const seen = new Map<string, Record<string, string>>();
  for (const row of rows) {
    const pt = row.prompt || "";
    if (pt && !seen.has(pt)) seen.set(pt, row);
  }
  const coll = db.collection("geo_runs").doc(runId).collection("prompts");
  let batch = db.batch();
  let i = 0;
  for (const [promptText, row] of seen) {
    const docId = `p${String(i).padStart(3, "0")}`;
    let cited: unknown = [];
    try {
      cited = JSON.parse(row.cited_domains || "[]");
    } catch {
      cited = [];
    }
    batch.set(coll.doc(docId), {
      prompt_id: docId,
      prompt: promptText,
      engine: row.engine || "",
      persona: row.persona || "",
      topic: row.topic || "",
      intent: row.intent || "",
      brand_mentioned: row.brand_mentioned === "true" || row.brand_mentioned === "True",
      brand_position: parseInt(row.brand_position || "0", 10) || 0,
      brand_sentiment_label: row.brand_sentiment_label || "absent",
      n_citations: parseInt(row.n_citations || "0", 10) || 0,
      cited_domains: cited,
      answer_summary: row.answer_summary || "",
    });
    i++;
    if (i % 490 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
}
