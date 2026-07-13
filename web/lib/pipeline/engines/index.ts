// Pluggable answer-engine layer. Ported from geo/engines/__init__.py.
import type { AppConfig } from "../config";
import { Engine } from "./types";
import { ClaudeEngine } from "./claude";
import { OpenAIEngine } from "./openai";
import { GeminiEngine } from "./gemini";

export function getEngine(name: string, cfg: AppConfig): Engine | null {
  const n = name.trim().toLowerCase();
  if (["claude", "anthropic"].includes(n)) return new ClaudeEngine(cfg);
  if (["openai", "chatgpt", "gpt"].includes(n)) return new OpenAIEngine(cfg);
  if (["gemini", "google"].includes(n)) return new GeminiEngine(cfg);
  return null;
}

export type { Engine, AnswerResult } from "./types";
