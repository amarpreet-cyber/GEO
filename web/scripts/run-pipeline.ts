#!/usr/bin/env tsx
// Local CLI for the TypeScript GEO pipeline — the drop-in replacement for `python run.py`.
//
//   npx tsx scripts/run-pipeline.ts full [--limit N]
//   npx tsx scripts/run-pipeline.ts prompts
//   npx tsx scripts/run-pipeline.ts collect --limit 25
//   ... (stages: prompts collect analyze audit citability brand eeat compose all full comp-profile)
import { runStage, STAGES, type Stage } from "../lib/pipeline/run";

async function main() {
  const [stageArg, ...rest] = process.argv.slice(2);
  const stage = (stageArg || "full") as Stage;
  if (!STAGES.includes(stage)) {
    console.error(`unknown stage '${stage}'. one of: ${STAGES.join(", ")}`);
    process.exit(2);
  }

  let limit: number | null = null;
  const li = rest.indexOf("--limit");
  if (li >= 0 && rest[li + 1]) limit = parseInt(rest[li + 1], 10);

  const runId = process.env.GEO_RUN_ID || `run_${Date.now()}`;
  console.log(`[run] stage=${stage} limit=${limit ?? "none"} runId=${runId}`);

  await runStage(stage, {
    limit,
    runId,
    onProgress: (msg) => console.log(msg),
  });
  console.log("[run] done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
