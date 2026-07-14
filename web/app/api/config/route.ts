import { NextResponse } from "next/server";
import { getAppConfig, saveAppConfig } from "@/lib/firestore";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LOCAL_CONFIG = path.resolve(process.cwd(), "data/app-config.json");

function readLocalConfig() {
  try { return JSON.parse(fs.readFileSync(LOCAL_CONFIG, "utf8")); } catch { return null; }
}
function writeLocalConfig(data: unknown) {
  try {
    fs.mkdirSync(path.dirname(LOCAL_CONFIG), { recursive: true });
    fs.writeFileSync(LOCAL_CONFIG, JSON.stringify(data, null, 2));
  } catch { /* noop */ }
}

export async function GET() {
  // Try Firestore first, fall back to local file
  const cfg = await getAppConfig();
  if (cfg) return NextResponse.json({ ok: true, config: cfg });
  const local = readLocalConfig();
  return NextResponse.json({ ok: true, config: local });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });

  const config = { ...body, setup_complete: true };

  // Save to local file always (works without Firestore)
  writeLocalConfig(config);

  // Save to Firestore if available
  try {
    await saveAppConfig(config);
  } catch {
    // Not configured — local file is the fallback
  }

  const res = NextResponse.json({ ok: true });
  // Cookie tells middleware that setup is complete — persists across sessions.
  // MUST be named `__session`: Firebase Hosting strips every other cookie, so
  // any other name never reaches the browser and the setup gate loops forever.
  res.cookies.set("__session", "setup=1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: false,
    sameSite: "lax",
  });
  return res;
}
