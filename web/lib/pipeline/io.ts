// Filesystem IO for pipeline stages — JSON + CSV writers/readers.
// The output directory is the API boundary: the pipeline writes it, the
// dashboard (web/lib/data.ts) reads it.
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function writeJson(filePath: string, obj: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf8");
}

export function readJson<T = any>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

export function writeCsv(filePath: string, rows: Record<string, unknown>[]): void {
  ensureDir(path.dirname(filePath));
  // Papa.unparse on [] emits ""; keep a header-only file consistent with pandas.
  const csv = rows.length ? Papa.unparse(rows) : "";
  fs.writeFileSync(filePath, csv, "utf8");
}

export function readCsv<T = Record<string, string>>(filePath: string): T[] {
  try {
    const text = fs.readFileSync(filePath, "utf8");
    return (Papa.parse(text, { header: true, skipEmptyLines: true }).data as T[]) || [];
  } catch {
    return [];
  }
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}
