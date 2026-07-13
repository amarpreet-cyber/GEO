import { NextResponse } from "next/server";
import { readState, addJob, patchJob, type Job } from "@/lib/store";
import { createRunDoc, updateRunStatus } from "@/lib/firestore";
import { runStage, STAGES, type Stage } from "@/lib/pipeline/run";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Long-running: the full pipeline can take many minutes. maxDuration guards the
// serverless timeout on Vercel (Node functions); locally it is unbounded.
export const maxDuration = 800;

const HEAVY = new Set<Stage>(["collect", "all", "full"]);
const STAGE_SET = new Set<string>(STAGES);

export async function GET() {
  return NextResponse.json({ ok: true, jobs: readState().jobs });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const stage = String(body?.stage || "") as Stage;
  if (!STAGE_SET.has(stage)) {
    return NextResponse.json({ ok: false, error: "unknown stage" }, { status: 400 });
  }

  const running = readState().jobs.find((j) => j.status === "running");
  if (running && (HEAVY.has(stage) || STAGE_SET.has(running.stage.split(" ")[0]))) {
    return NextResponse.json(
      { ok: false, error: `a run is already in progress (${running.stage})` },
      { status: 409 },
    );
  }

  const limit = body?.limit ? parseInt(String(body.limit), 10) : null;
  const jobNum = readState().jobs.length;
  const id = "job_" + Math.abs(hashStr(stage + jobNum + Date.now())).toString(36);
  const runId = `run_${Date.now()}`;
  const stageLabel = limit ? `${stage} (${limit} prompts)` : stage;

  const job: Job = { id, stage: stageLabel, status: "running", startedAt: Date.now(), runId, tail: "" };
  addJob(job);
  await createRunDoc(runId, stageLabel).catch(() => {});

  // Run the pipeline in-process, detached from the request. Node keeps the
  // promise alive for the life of the server process; progress streams into the
  // job's `tail` so the loading screen and Settings › Runs can poll it.
  let tail = "";
  const onProgress = (msg: string) => {
    tail = (tail + msg + "\n").slice(-1200);
    patchJob(id, { tail });
  };

  runStage(stage, { limit, runId, onProgress })
    .then(() => {
      patchJob(id, { status: "done", endedAt: Date.now(), exitCode: 0, tail });
      updateRunStatus(runId, "complete").catch(() => {});
    })
    .catch((e: unknown) => {
      const err = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      patchJob(id, { status: "error", endedAt: Date.now(), exitCode: 1, tail: tail + "\n" + err });
      updateRunStatus(runId, "error", { error: err }).catch(() => {});
    });

  return NextResponse.json({ ok: true, jobId: id, runId }, { status: 202 });
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
