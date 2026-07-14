import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getSummary, getScore, hasData } from "@/lib/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// TEMP diagnostic: does the runtime read path actually find the snapshot?
export async function GET() {
  const cwd = process.cwd();
  const bundled = path.join(cwd, "data", "output");
  const summaryFile = path.join(bundled, "summary_metrics.json");

  let summary: unknown = null;
  let score: unknown = null;
  let readErr: string | null = null;
  try {
    summary = getSummary();
    score = getScore();
  } catch (e) {
    readErr = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  return NextResponse.json({
    cwd,
    GEO_READ_DIR: process.env.GEO_READ_DIR ?? null,
    GEO_OUTPUT_DIR: process.env.GEO_OUTPUT_DIR ?? null,
    bundledExists: fs.existsSync(bundled),
    outputFiles: fs.existsSync(bundled) ? fs.readdirSync(bundled) : [],
    summaryFileExists: fs.existsSync(summaryFile),
    summaryFileHead: fs.existsSync(summaryFile) ? fs.readFileSync(summaryFile, "utf8").slice(0, 120) : null,
    hasData: hasData(),
    summaryIsNull: summary === null,
    geoScore: (score as { geo_score?: number } | null)?.geo_score ?? null,
    readErr,
  });
}
