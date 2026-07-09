// Mutable app state — Next owns this, separate from the immutable pipeline output/.
// JSON-file store at web/data/state.json (single-user internal tool; swap for SQLite
// if it ever goes multi-writer — the read/write surface here is the seam).
import "server-only";
import fs from "node:fs";
import path from "node:path";

export type Job = {
  id: string; stage: string; status: "running" | "done" | "error";
  startedAt: number; endedAt?: number; exitCode?: number | null; tail?: string;
  runId?: string;
};
export type State = {
  actions: Record<string, { status: string; pri: boolean }>;
  activate: unknown[];
  alerts: Record<string, { key: string; threshold: number; enabled: boolean }>;
  jobs: Job[];
};

const DATA_DIR = path.resolve(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "state.json");
const EMPTY: State = { actions: {}, activate: [], alerts: {}, jobs: [] };

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch { /* noop */ } }

export function readState(): State {
  try { return { ...EMPTY, ...JSON.parse(fs.readFileSync(FILE, "utf8")) }; }
  catch { return { ...EMPTY }; }
}

export function writeState(next: State): void {
  ensureDir();
  // write-and-rename for crash safety
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
  fs.renameSync(tmp, FILE);
}

export function getSlice<K extends keyof State>(key: K): State[K] {
  return readState()[key];
}

export function setSlice<K extends keyof State>(key: K, value: State[K]): void {
  const s = readState();
  s[key] = value;
  writeState(s);
}

export function patchJob(id: string, patch: Partial<Job>): void {
  const s = readState();
  s.jobs = s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j));
  writeState(s);
}

export function addJob(job: Job): void {
  const s = readState();
  s.jobs = [job, ...s.jobs].slice(0, 50); // keep last 50
  writeState(s);
}

export const JOBS_DIR = path.join(DATA_DIR, "jobs");
export const REPO_ROOT = path.resolve(process.cwd(), "..");
