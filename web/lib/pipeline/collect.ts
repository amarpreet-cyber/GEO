// Stage 1 — collection. Fan the prompt set across engines, store raw answers.
// Ported from geo/collect.py. Adds bounded concurrency for speed.
import path from "node:path";
import { AppConfig } from "./config";
import { getEngine, Engine } from "./engines";
import { readPromptsCsv } from "./prompts";
import { writeJson } from "./io";
import type { Row } from "./metrics";

export type Progress = (msg: string) => void;

function randomUuid(): string {
  // Node 18+ has global crypto.randomUUID
  try {
    return (globalThis.crypto as any).randomUUID();
  } catch {
    return "id-" + Math.random().toString(36).slice(2);
  }
}

async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function collect(
  cfg: AppConfig,
  limit: number | null,
  onProgress?: Progress,
  concurrency = 4,
): Promise<Row[]> {
  let prompts = readPromptsCsv(cfg.promptsPath);
  if (limit) prompts = prompts.slice(0, limit);

  const engines: Engine[] = [];
  for (const name of cfg.engines) {
    const eng = getEngine(name, cfg);
    if (eng == null) onProgress?.(`[collect] engine '${name}' has no adapter — skipping`);
    else if (!eng.available()) onProgress?.(`[collect] engine '${name}' unavailable (missing key) — skipping`);
    else engines.push(eng);
  }
  if (!engines.length) throw new Error("No available engines. Set ANTHROPIC_API_KEY and ENGINES.");

  // Flatten to (prompt, engine, run) units so we can pool across them.
  type Unit = { row: (typeof prompts)[number]; eng: Engine; run: number };
  const units: Unit[] = [];
  for (const row of prompts) {
    for (const eng of engines) {
      for (let run = 0; run < cfg.responsesPerPrompt; run++) units.push({ row, eng, run });
    }
  }

  const total = units.length;
  let done = 0;
  // Format includes a `| done/total [` segment so the loading screen's tqdm-style
  // parser (web/app/setup/loading) can extract progress.
  onProgress?.(`Collecting answers: 0%| 0/${total} [ans]`);

  const records = await pool(units, concurrency, async (u) => {
    const res = await u.eng.answer(u.row.prompt);
    done++;
    if (done % Math.max(1, Math.floor(total / 50)) === 0 || done === total) {
      const pct = Math.floor((100 * done) / total);
      onProgress?.(`Collecting answers: ${pct}%| ${done}/${total} [ans]`);
    }
    if (res.error) onProgress?.(`[collect] ${res.engine} error on '${u.row.prompt.slice(0, 50)}...': ${res.error}`);
    return {
      uuid: randomUuid(),
      engine: res.engine,
      model: res.model,
      run: u.run,
      prompt: u.row.prompt,
      persona: u.row.persona || "",
      topic: u.row.topic || "",
      intent: u.row.intent || "",
      response: res.text,
      cited_urls: res.cited_urls,
      searched_urls: res.searched_urls,
      error: res.error,
      meta: res.meta,
    } as Row & { uuid: string; run: number; meta: unknown };
  });

  const out = path.join(cfg.outputDir, "responses.json");
  writeJson(out, records);
  onProgress?.(`[collect] wrote ${records.length} answers -> ${out}`);
  return records as unknown as Row[];
}
