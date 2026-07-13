// Content E-E-A-T — Experience, Expertise, Authoritativeness, Trust.
// Ported from geo/eeat.py: structured Claude scoring over a few owned pages.
import Anthropic from "@anthropic-ai/sdk";
import path from "node:path";
import { AppConfig } from "./config";
import { fetchText, extractText } from "./html";
import { discover } from "./citability";
import { writeJson } from "./io";
import type { Progress } from "./collect";

const MAX_PAGES = 4;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    experience: { type: "integer", description: "0-100: first-hand proof — real deployments, named customers, concrete outcomes." },
    expertise: { type: "integer", description: "0-100: demonstrated domain depth, specifics, credentials." },
    authoritativeness: { type: "integer", description: "0-100: signals of recognition — citations, named partners, press." },
    trust: { type: "integer", description: "0-100: transparency, security/compliance claims, clear ownership, no overreach." },
    note: { type: "string", description: "<=1 sentence on the biggest E-E-A-T gap on this page." },
  },
  required: ["experience", "expertise", "authoritativeness", "trust", "note"],
};

const SYSTEM =
  "You are an E-E-A-T analyst scoring a web page for how much an AI answer engine should trust it as a source. " +
  "Score each pillar 0-100 from the page text only. Be strict: marketing fluff is not expertise; " +
  "claims without specifics are not experience. Return JSON only.";

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "");
}

export async function eeat(cfg: AppConfig, onProgress?: Progress): Promise<any> {
  const base = "https://" + cfg.brand.domain.replace(/\/$/, "");
  onProgress?.(`[eeat] scoring content E-E-A-T under ${base}…`);
  const out: any = {
    domain: base,
    fetched_at: nowIso(),
    score: null,
    pillars: {},
    pages: [],
    note: "content E-E-A-T scan (extraction model, structured output)",
  };

  if (!process.env.ANTHROPIC_API_KEY) {
    out.note = "no ANTHROPIC_API_KEY — E-E-A-T left to compose estimate";
    writeJson(path.join(cfg.outputDir, "eeat.json"), out);
    onProgress?.("[eeat] skipped (no key) — compose will estimate");
    return out;
  }

  const { status, body } = await fetchText(base, { htmlOnly: true });
  const urls = (status === 200 && body ? discover(base, body) : []).slice(0, MAX_PAGES);

  const client = new Anthropic();
  const pillars: Record<string, number[]> = { experience: [], expertise: [], authoritativeness: [], trust: [] };

  for (const url of urls) {
    const { status: st, body: pageBody } = url === base ? { status, body } : await fetchText(url, { htmlOnly: true });
    const text = st === 200 && pageBody ? extractText(pageBody, 6000) : "";
    if (text.length < 200) continue;
    let d: any;
    try {
      const resp = await client.messages.create({
        model: cfg.extractionModel,
        max_tokens: 600,
        system: SYSTEM,
        messages: [{ role: "user", content: JSON.stringify({ url, page_text: text }) }],
        output_config: { format: { type: "json_schema", schema: SCHEMA } },
      } as any);
      const textBlock = (resp.content || []).find((b: any) => b.type === "text") as any;
      d = JSON.parse(textBlock?.text || "{}");
    } catch (e: any) {
      onProgress?.(`[eeat] scoring failed for ${url}: ${e?.name || "Error"}`);
      continue;
    }
    const score = Math.round((d.experience + d.expertise + d.authoritativeness + d.trust) / 4);
    out.pages.push({
      url,
      title: url.replace(base, "") || "/",
      score,
      pillars: { experience: d.experience, expertise: d.expertise, authoritativeness: d.authoritativeness, trust: d.trust },
      note: d.note || "",
    });
    for (const k of Object.keys(pillars)) pillars[k].push(d[k]);
  }

  if (pillars.experience.length) {
    const p: Record<string, number> = {};
    for (const [k, v] of Object.entries(pillars)) {
      if (v.length) p[k] = Math.round(v.reduce((a, b) => a + b, 0) / v.length);
    }
    out.pillars = p;
    const vals = Object.values(p);
    out.score = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  out.pages.sort((a: any, b: any) => b.score - a.score);
  writeJson(path.join(cfg.outputDir, "eeat.json"), out);
  if (out.score != null) {
    onProgress?.(`[eeat] E-E-A-T ${out.score}/100 across ${out.pages.length} pages`);
  } else {
    onProgress?.("[eeat] no pages scored — compose will estimate");
  }
  return out;
}
