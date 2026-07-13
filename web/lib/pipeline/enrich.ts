// Stage 2 enrichment — one structured Claude call per answer.
// Ported from geo/extract.py using @anthropic-ai/sdk structured outputs.
import Anthropic from "@anthropic-ai/sdk";
import type { AppConfig } from "./config";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    brand_present: { type: "boolean" },
    brand_sentiment_score: {
      type: "number",
      description: "0..1, how favorably the answer positions the brand. 0.5 if not mentioned.",
    },
    brand_sentiment_label: { type: "string", enum: ["negative", "neutral", "positive", "absent"] },
    brand_sentiment_reasoning: { type: "string" },
    answer_summary: {
      type: "string",
      description: "<=2 sentences: what this answer says re: the topic and who it favors.",
    },
    emerging_topics: { type: "array", items: { type: "string" } },
    recommended_actions: {
      type: "array",
      items: { type: "string" },
      description: "Concrete GEO actions so the brand would be cited/recommended for THIS prompt.",
    },
    competitor_sentiments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          label: { type: "string", enum: ["negative", "neutral", "positive"] },
        },
        required: ["name", "label"],
      },
    },
  },
  required: [
    "brand_present",
    "brand_sentiment_score",
    "brand_sentiment_label",
    "brand_sentiment_reasoning",
    "answer_summary",
    "emerging_topics",
    "recommended_actions",
    "competitor_sentiments",
  ],
};

export type Enrichment = {
  brand_present: boolean;
  brand_sentiment_score: number;
  brand_sentiment_label: string;
  brand_sentiment_reasoning: string;
  answer_summary: string;
  emerging_topics: string[];
  recommended_actions: string[];
  competitor_sentiments: { name: string; label: string }[];
};

export function stubEnrich(brandMentioned: boolean): Enrichment {
  return {
    brand_present: brandMentioned,
    brand_sentiment_score: 0.5,
    brand_sentiment_label: brandMentioned ? "neutral" : "absent",
    brand_sentiment_reasoning: "",
    answer_summary: "",
    emerging_topics: [],
    recommended_actions: [],
    competitor_sentiments: [],
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export class Enricher {
  private client: Anthropic;
  private model: string;
  private brand: string;

  constructor(cfg: AppConfig) {
    this.model = cfg.extractionModel;
    this.brand = cfg.brand.name;
    this.client = new Anthropic();
  }

  private async call(system: string, user: string, attempt = 0): Promise<Enrichment> {
    try {
      const resp = await this.client.messages.create({
        model: this.model,
        max_tokens: 1200,
        system,
        messages: [{ role: "user", content: user }],
        output_config: { format: { type: "json_schema", schema: SCHEMA } },
      } as any);
      const textBlock = (resp.content || []).find((b: any) => b.type === "text") as any;
      return JSON.parse(textBlock?.text || "{}");
    } catch (e: any) {
      const status = e?.status ?? 0;
      const retryable = status === 429 || status >= 500 || e?.name === "APIConnectionError";
      if (retryable && attempt < 4) {
        await sleep(Math.min(2000 * 2 ** attempt, 40000));
        return this.call(system, user, attempt + 1);
      }
      throw e;
    }
  }

  async enrich(
    prompt: string,
    answer: string,
    brandMentioned: boolean,
    competitorsPresent: string[],
  ): Promise<Enrichment> {
    const system =
      `You are a GEO (generative engine optimization) analyst for the brand '${this.brand}'.\n` +
      "You are given a user QUESTION and an AI assistant's ANSWER. Assess how the answer " +
      "positions the target brand and competitors, and recommend how the brand could earn " +
      "a citation or recommendation for this exact question. Return JSON only.\n" +
      "Scoring: 1.0 = answer strongly recommends the brand; 0.7-0.9 favorable mention; " +
      "0.4-0.6 neutral/listed; 0.1-0.3 unfavorable; 0.0 explicitly negative. " +
      "If the brand is absent, brand_sentiment_label='absent' and score=0.5.";
    const user = JSON.stringify({
      brand: this.brand,
      question: prompt,
      answer,
      brand_mentioned_detected: brandMentioned,
      competitors_detected_in_answer: competitorsPresent,
    });
    try {
      return await this.call(system, user);
    } catch (e: any) {
      return {
        brand_present: brandMentioned,
        brand_sentiment_score: 0.5,
        brand_sentiment_label: brandMentioned ? "neutral" : "absent",
        brand_sentiment_reasoning: `enrichment failed: ${e?.name || "Error"}: ${e?.message || e}`,
        answer_summary: "",
        emerging_topics: [],
        recommended_actions: [],
        competitor_sentiments: [],
      };
    }
  }
}
