// Gemini (Google AI) as an answer engine — generateContent + google_search.
// Ported from geo/engines/gemini_engine.py using global fetch.
import type { AppConfig } from "../config";
import { AnswerResult, Engine, dedupe, emptyResult } from "./types";

const SYSTEM =
  "Answer the user's question directly as a consumer AI assistant. Name specific real " +
  "companies/products when asked about tools or vendors. Use Google Search to ground claims.";

export class GeminiEngine implements Engine {
  readonly name = "gemini";
  readonly model: string;
  private key: string;

  constructor(_cfg: AppConfig) {
    this.model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    this.key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  }

  available(): boolean {
    return !!this.key;
  }

  async answer(prompt: string): Promise<AnswerResult> {
    if (!this.available()) return emptyResult(this.name, this.model, prompt, "", "GEMINI_API_KEY not set");

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.key}`;
    const payload = {
      system_instruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
    };

    let data: any;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 90000);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      data = await res.json();
    } catch (e: any) {
      return emptyResult(this.name, this.model, prompt, "", `${e?.name || "Error"}: ${e?.message || e}`);
    }

    const textParts: string[] = [];
    const cited: string[] = [];
    for (const cand of data.candidates || []) {
      for (const part of cand.content?.parts || []) {
        if (part.text) textParts.push(part.text);
      }
      const meta = cand.groundingMetadata || {};
      for (const chunk of meta.groundingChunks || []) {
        const uri = chunk.web?.uri;
        if (uri) cited.push(uri);
      }
    }
    const text = textParts.filter(Boolean).join("\n").trim();
    return {
      engine: this.name,
      model: this.model,
      prompt,
      text,
      cited_urls: dedupe(cited),
      searched_urls: dedupe(cited),
      error: null,
      meta: { web_search: true },
    };
  }
}
