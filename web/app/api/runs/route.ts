import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { readState, addJob, patchJob, JOBS_DIR, REPO_ROOT, type Job } from "@/lib/store";
import { createRunDoc, updateRunStatus } from "@/lib/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STAGES = new Set(["prompts", "analyze", "audit", "citability", "brand", "eeat", "compose", "all", "full", "collect", "comp-profile"]);
const HEAVY = new Set(["collect", "all", "full"]);

function pythonBin(): string {
  for (const p of [path.join(REPO_ROOT, ".venv/bin/python"), path.join(REPO_ROOT, ".venv/bin/python3")]) {
    if (fs.existsSync(p)) return p;
  }
  return "python3";
}

export async function GET() {
  return NextResponse.json({ ok: true, jobs: readState().jobs });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const stage = String(body?.stage || "");
  if (!STAGES.has(stage)) return NextResponse.json({ ok: false, error: "unknown stage" }, { status: 400 });

  const running = readState().jobs.find((j) => j.status === "running");
  if (running && (HEAVY.has(stage) || HEAVY.has(running.stage))) {
    return NextResponse.json({ ok: false, error: `a run is already in progress (${running.stage})` }, { status: 409 });
  }

  const jobNum = readState().jobs.length;
  const id = "job_" + Math.abs(hashStr(stage + jobNum + JSON.stringify(readState().jobs.slice(0, 1)))).toString(36);
  const runId = `run_${Date.now()}`;

  try { fs.mkdirSync(JOBS_DIR, { recursive: true }); } catch { /* noop */ }
  const logPath = path.join(JOBS_DIR, `${id}.log`);
  // Optional prompt limit — used for the first "quick preview" run from the wizard
  const limit = body?.limit ? parseInt(body.limit) : null;
  const args = ["run.py", stage, ...(limit ? ["--limit", String(limit)] : [])];
  const stageLabel = limit ? `${stage} (${limit} prompts)` : stage;

  const job: Job = { id, stage: stageLabel, status: "running", startedAt: Date.now(), runId };
  addJob(job);

  // Create Firestore run doc (no-op if Firestore not configured)
  await createRunDoc(runId, stageLabel).catch(() => {});

  const childEnv = { ...process.env, GEO_RUN_ID: runId };
  const child = spawn(pythonBin(), args, { cwd: REPO_ROOT, env: childEnv });
  const logFd = fs.openSync(logPath, "w");
  let tail = "";
  const onData = (buf: Buffer) => {
    const s = buf.toString();
    fs.writeSync(logFd, s);
    tail = (tail + s).slice(-1200);
    patchJob(id, { tail });
  };
  child.stdout.on("data", onData);
  child.stderr.on("data", onData);
  child.on("close", (code) => {
    try { fs.closeSync(logFd); } catch { /* noop */ }
    const status = code === 0 ? "done" : "error";
    patchJob(id, { status, endedAt: Date.now(), exitCode: code, tail });
    // Mirror final status to Firestore
    updateRunStatus(runId, code === 0 ? "complete" : "error",
      code !== 0 ? { error: `exit code ${code}` } : {}
    ).catch(() => {});
  });
  child.on("error", (e) => {
    patchJob(id, { status: "error", endedAt: Date.now(), exitCode: -1, tail: String(e) });
    updateRunStatus(runId, "error", { error: String(e) }).catch(() => {});
  });

  return NextResponse.json({ ok: true, jobId: id, runId }, { status: 202 });
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
