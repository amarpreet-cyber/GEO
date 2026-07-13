// Claude as an answer engine — Anthropic Messages API + web_search server tool.
// Ported from geo/engines/claude.py using @anthropic-ai/sdk.
import Anthropic from "@anthropic-ai/sdk";
import type { AppConfig } from "../config";
import { AnswerResult, Engine, dedupe, emptyResult } from "./types";

const URL_RE = /https?:\/\/[^\s\]\)>"']+/gi;

const SYSTEM =
  "You are a knowledgeable assistant answering a user's question as you would " +
  "in a consumer AI assistant. Give a direct, helpful answer. When the question " +
  "is about tools, vendors, or products, name specific real companies/products. " +
  "Do not refuse to name vendors. If you use the web, ground claims in the sources.";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export class ClaudeEngine implements Engine {
  readonly name = "claude";
  readonly model: string;
  private client: Anthropic | null;
  private maxTokens: number;
  private useWeb: boolean;
  private webMaxUses: number;

  constructor(cfg: AppConfig) {
    this.model = cfg.collectionModel;
    this.maxTokens = cfg.collectionMaxTokens;
    this.useWeb = cfg.useWebSearch;
    this.webMaxUses = cfg.webSearchMaxUses;
    this.client = this.available() ? new Anthropic() : null;
  }

  available(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  private tools(): any[] {
    if (!this.useWeb) return [];
    return [{ type: "web_search_20260209", name: "web_search", max_uses: this.webMaxUses }];
  }

  private async create(messages: any[], attempt = 0): Promise<any> {
    try {
      return await this.client!.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: SYSTEM,
        tools: this.tools(),
        messages,
      });
    } catch (e: any) {
      // Retry transient errors (429/5xx/connection) with exponential backoff.
      const status = e?.status ?? 0;
      const retryable = status === 429 || status >= 500 || e?.name === "APIConnectionError";
      if (retryable && attempt < 4) {
        await sleep(Math.min(2000 * 2 ** attempt, 40000));
        return this.create(messages, attempt + 1);
      }
      throw e;
    }
  }

  async answer(prompt: string): Promise<AnswerResult> {
    if (!this.available()) return emptyResult(this.name, this.model, prompt, "", "ANTHROPIC_API_KEY not set");

    let messages: any[] = [{ role: "user", content: prompt }];
    const textParts: string[] = [];
    const cited: string[] = [];
    const searched: string[] = [];
    const usage = { input_tokens: 0, output_tokens: 0 };

    try {
      for (let i = 0; i < 8; i++) {
        const resp = await this.create(messages);
        usage.input_tokens += resp.usage?.input_tokens || 0;
        usage.output_tokens += resp.usage?.output_tokens || 0;
        this.harvest(resp, textParts, cited, searched);
        if (resp.stop_reason === "pause_turn") {
          messages = [...messages, { role: "assistant", content: resp.content }];
          continue;
        }
        break;
      }
    } catch (e: any) {
      return emptyResult(
        this.name,
        this.model,
        prompt,
        textParts.filter(Boolean).join("\n").trim(),
        `${e?.name || "Error"}: ${e?.message || e}`,
      );
    }

    const text = textParts.filter(Boolean).join("\n").trim();
    const bare = text.match(URL_RE) || [];
    for (const u of bare) searched.push(u.replace(/[.,);]+$/, ""));

    return {
      engine: this.name,
      model: this.model,
      prompt,
      text,
      cited_urls: dedupe(cited),
      searched_urls: dedupe(searched),
      error: null,
      meta: { usage, web_search: this.useWeb },
    };
  }

  private harvest(resp: any, textParts: string[], cited: string[], searched: string[]): void {
    for (const block of resp.content || []) {
      if (block.type === "text") {
        textParts.push(block.text);
        for (const c of block.citations || []) {
          if (c?.url) cited.push(c.url);
        }
      } else if (block.type === "web_search_tool_result") {
        const content = block.content;
        if (Array.isArray(content)) {
          for (const r of content) if (r?.url) searched.push(r.url);
        }
      }
    }
  }
}
