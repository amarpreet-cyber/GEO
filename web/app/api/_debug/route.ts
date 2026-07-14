import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// TEMP diagnostic: where does the container run, and is the snapshot present?
export async function GET() {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "data", "output"),
    path.join(cwd, "web", "data", "output"),
    path.resolve(cwd, "..", "output"),
  ];
  const info = candidates.map((p) => ({
    path: p,
    exists: fs.existsSync(p),
    files: fs.existsSync(p) ? fs.readdirSync(p).slice(0, 8) : [],
  }));
  let cwdList: string[] = [];
  let dataList: string[] = [];
  try { cwdList = fs.readdirSync(cwd).slice(0, 50); } catch { /* noop */ }
  try { dataList = fs.readdirSync(path.join(cwd, "data")).slice(0, 50); } catch { /* noop */ }
  return NextResponse.json({ cwd, candidates: info, cwdList, dataList });
}
