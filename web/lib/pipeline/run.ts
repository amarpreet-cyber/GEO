// Pipeline orchestrator — the TypeScript equivalent of run.py's command dispatch.
// Runs stages in-process (no Python subprocess) and writes the same output files
// the dashboard reads. Optionally mirrors output into Firestore per stage.
import { loadEnv } from "./env";
import { AppConfig, loadConfig } from "./config";
import { fileExists } from "./io";
import { buildPromptLibrary, writePromptsCsv } from "./prompts";
import { collect, type Progress } from "./collect";
import { analyze } from "./analyze";
import { siteAudit } from "./siteAudit";
import { citability } from "./citability";
import { brandPresence } from "./brandPresence";
import { eeat } from "./eeat";
import { compose } from "./compose";
import { runCompetitorProfiles } from "./competitorProfile";
import { flushStageToFirestore } from "../firestore-sync";

export type Stage =
  | "prompts" | "collect" | "analyze" | "audit" | "citability"
  | "brand" | "eeat" | "compose" | "all" | "full" | "comp-profile";

export const STAGES: Stage[] = [
  "prompts", "collect", "analyze", "audit", "citability",
  "brand", "eeat", "compose", "all", "full", "comp-profile",
];

export type RunOptions = {
  limit?: number | null;
  runId?: string;
  onProgress?: Progress;
  flush?: boolean; // mirror output to Firestore per stage
};

async function maybeFlush(runId: string | undefined, cfg: AppConfig, stage: string, flush: boolean) {
  if (flush && runId) await flushStageToFirestore(runId, cfg.outputDir, stage).catch(() => {});
}

function cmdPrompts(cfg: AppConfig, onProgress?: Progress): void {
  const rows = buildPromptLibrary(cfg);
  writePromptsCsv(rows, cfg.promptsPath);
  onProgress?.(`[prompts] wrote ${rows.length} prompts -> ${cfg.promptsPath}`);
}

export async function runStage(stage: Stage, opts: RunOptions = {}): Promise<void> {
  loadEnv();
  const { limit = null, runId, onProgress, flush = true } = opts;
  const cfg = loadConfig();

  switch (stage) {
    case "prompts":
      cmdPrompts(cfg, onProgress);
      break;

    case "collect": {
      if (!fileExists(cfg.promptsPath)) cmdPrompts(cfg, onProgress);
      await collect(cfg, limit, onProgress);
      await maybeFlush(runId, cfg, "collect", flush);
      break;
    }

    case "analyze":
      await analyze(cfg, null, onProgress);
      await maybeFlush(runId, cfg, "analyze", flush);
      break;

    case "audit":
      await siteAudit(cfg, onProgress);
      await maybeFlush(runId, cfg, "audit", flush);
      break;

    case "citability":
      await citability(cfg, onProgress);
      await maybeFlush(runId, cfg, "citability", flush);
      break;

    case "brand":
      await brandPresence(cfg, onProgress);
      await maybeFlush(runId, cfg, "brand", flush);
      break;

    case "eeat":
      await eeat(cfg, onProgress);
      await maybeFlush(runId, cfg, "eeat", flush);
      break;

    case "compose":
      compose(cfg, onProgress);
      await maybeFlush(runId, cfg, "compose", flush);
      break;

    case "comp-profile":
      await runCompetitorProfiles(cfg, onProgress);
      await maybeFlush(runId, cfg, "comp-profile", flush);
      break;

    case "all": {
      if (!fileExists(cfg.promptsPath)) cmdPrompts(cfg, onProgress);
      const records = await collect(cfg, limit, onProgress);
      await analyze(cfg, records, onProgress);
      await maybeFlush(runId, cfg, "all", flush);
      break;
    }

    case "full": {
      // Always regenerate prompts — keywords may have changed via the wizard.
      cmdPrompts(cfg, onProgress);
      const records = await collect(cfg, limit, onProgress);
      await analyze(cfg, records, onProgress);
      await siteAudit(cfg, onProgress);
      await citability(cfg, onProgress);
      await brandPresence(cfg, onProgress);
      await eeat(cfg, onProgress);
      compose(cfg, onProgress);
      await runCompetitorProfiles(cfg, onProgress);
      await maybeFlush(runId, cfg, "full", flush);
      break;
    }

    default:
      throw new Error(`unknown stage: ${stage}`);
  }
}
