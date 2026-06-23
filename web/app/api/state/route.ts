import { NextResponse } from "next/server";
import { getSlice, setSlice, type State } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const KEYS = new Set(["actions", "activate", "alerts"]);

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key") || "";
  if (!KEYS.has(key)) return NextResponse.json({ ok: false, error: "unknown key" }, { status: 400 });
  return NextResponse.json({ ok: true, value: getSlice(key as keyof State) });
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || !KEYS.has(body.key)) return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  setSlice(body.key as keyof State, body.value);
  return NextResponse.json({ ok: true });
}
