// Engine abstraction + the standard answer record every engine returns.
// Ported from geo/engines/base.py.
import type { AppConfig } from "../config";

export type AnswerResult = {
  engine: string;
  model: string;
  prompt: string;
  text: string;
  cited_urls: string[];
  searched_urls: string[];
  error: string | null;
  meta: Record<string, unknown>;
};

export interface Engine {
  readonly name: string;
  readonly model: string;
  available(): boolean;
  answer(prompt: string): Promise<AnswerResult>;
}

export function dedupe(seq: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of seq) {
    if (x && !seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}

export function emptyResult(
  engine: string,
  model: string,
  prompt: string,
  text = "",
  error: string | null = null,
): AnswerResult {
  return { engine, model, prompt, text, cited_urls: [], searched_urls: [], error, meta: {} };
}

export type EngineCtor = (cfg: AppConfig) => Engine;
