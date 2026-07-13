// OpenAI (ChatGPT) as an answer engine — Responses API + web_search tool.
// Ported from geo/engines/openai_engine.py using global fetch (no SDK dependency).
import type { AppConfig } from "../config";
import { AnswerResult, Engine, dedupe, emptyResult } from "./types";

const SYSTEM =
  "You are a helpful assistant answering a user's question as a consumer AI assistant would. " +
  "Give a direct answer and name specific real companies/products when asked about tools or vendors. " +
  "Use the web and ground claims in sources.";

export class OpenAIEngine implements Engine {
  readonly name = "openai";
  readonly model: string;
  private key: string;

  constructor(_cfg: AppConfig) {
    this.model = process.env.OPENAI_MODEL || "gpt-4o";
    this.key = process.env.OPENAI_API_KEY || "";
  }

  available(): boolean {
    return !!this.key;
  }

  async answer(prompt: string): Promise<AnswerResult> {
    if (!this.available()) return emptyResult(this.name, this.model, prompt, "", "OPENAI_API_KEY not set");

    const payload = {
      model: this.model,
      instructions: SYSTEM,
      input: prompt,
      tools: [{ type: "web_search" }],
    };

    let data: any;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 90000);
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
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
    for (const item of data.output || []) {
      const content = Array.isArray(item.content) ? item.content : [];
      for (const c of content) {
        if (c.type === "output_text" || c.type === "text") {
          textParts.push(c.text || "");
          for (const ann of c.annotations || []) if (ann?.url) cited.push(ann.url);
        }
      }
    }
    const text = (data.output_text || textParts.filter(Boolean).join("\n")).trim();
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
