import { NextResponse } from "next/server";
import { getAppConfig } from "@/lib/firestore";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LOCAL_CONFIG = path.resolve(process.cwd(), "data/app-config.json");

function readLocalConfig() {
  try { return JSON.parse(fs.readFileSync(LOCAL_CONFIG, "utf8")); } catch { return null; }
}

export async function GET(req: Request) {
  // Vercel Cron authenticates with the CRON_SECRET header.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  // Read schedule from config
  const cfg = (await getAppConfig()) || readLocalConfig();
  const schedule = cfg?.schedule;

  if (!schedule?.enabled || !schedule.cron) {
    return NextResponse.json({ ok: true, skipped: "schedule disabled or manual" });
  }

  // Trigger a full pipeline run
  const base = new URL(req.url).origin;
  try {
    const res = await fetch(`${base}/api/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal": "cron" },
      body: JSON.stringify({ stage: "full" }),
    });
    const data = await res.json();
    return NextResponse.json({ ok: true, triggered: true, jobId: data.jobId });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
