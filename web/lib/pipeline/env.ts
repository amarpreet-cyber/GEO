// Load the repo-root .env once so the in-process pipeline (API route + CLI) sees
// ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY / ENGINES etc.
// dotenv does not override already-set vars, so Next's own env wins.
import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

let loaded = false;

export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  for (const p of [
    path.resolve(process.cwd(), "..", ".env"), // repo root when cwd = web/
    path.resolve(process.cwd(), ".env"),
  ]) {
    if (fs.existsSync(p)) dotenv.config({ path: p });
  }
}
