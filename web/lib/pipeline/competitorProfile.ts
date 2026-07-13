// Competitor profiles — logo, description, and page citability.
// Ported from geo/competitor_profile.py.
import Anthropic from "@anthropic-ai/sdk";
import path from "node:path";
import { AppConfig } from "./config";
import { fetchText, extractText } from "./html";
import { writeJson, readCsv } from "./io";
import type { Progress } from "./collect";

const KNOWN_DOMAINS: Record<string, string> = {
  "Cohere Health": "coherehealth.com",
  "Flatiron Health": "flatiron.com",
  Availity: "availity.com",
  Waystar: "waystar.com",
  Myndshft: "myndshft.com",
  Rhyme: "rhyme.com",
  CoverMyMeds: "covermymeds.com",
  "Humata Health": "humatahealth.com",
  AKASA: "akasa.com",
  ImagineSoftware: "imaginesoftware.com",
  Ascertain: "ascertain.io",
  "Infinitus Systems": "infinitusai.com",
  SmarterDx: "smarterdx.com",
  "RevSyn AI": "revsynai.com",
  Plenful: "plenful.com",
  "Olive AI": "oliveai.com",
  Medallion: "medallion.co",
  Tegria: "tegria.com",
  "Verata Health": "veratahealth.com",
  Xsolis: "xsolis.com",
  Valer: "valer.ai",
  Inovalon: "inovalon.com",
  "Experian Health": "experianhealth.com",
  Novu: "novu.co",
  "RISA Labs": "risalabs.ai",
};

function resolveDomain(name: string, configuredDomain = ""): string {
  if (configuredDomain) return configuredDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (KNOWN_DOMAINS[name]) return KNOWN_DOMAINS[name];
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${slug}.com`;
}

export function logoUrl(domain: string): string {
  return `https://logo.clearbit.com/${domain}`;
}
export function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

function citabilityScore(html: string): number {
  const text = extractText(html, 4000);
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < 50) return 0;
  const first = text.slice(0, 200).toLowerCase();
  const answerFirst = /^(welcome|we are|we're|introducing|discover|unlock|transform|revolutionize)/.test(first) ? 30 : 70;
  const statCount = (text.match(/\b\d+[\d,.]*[%$kKmMbB]?\b/g) || []).length;
  const stats = Math.min(100, Math.floor((statCount / Math.max(words, 1)) * 1000 * 10));
  const hCount = (html.match(/<h[1-4]/gi) || []).length;
  const structure = Math.min(100, hCount * 8);
  const pronounStarts = (text.slice(0, 1000).match(/\b(we|our|us|you|your)\b/gi) || []).length;
  const selfContained = Math.max(0, 100 - pronounStarts * 5);
  const score = Math.floor(answerFirst * 0.3 + selfContained * 0.25 + structure * 0.2 + stats * 0.15 + 70 * 0.1);
  return Math.min(100, Math.max(0, score));
}

async function checkLlmstxt(domain: string): Promise<boolean> {
  const { body } = await fetchText(`https://${domain}/llms.txt`, { timeout: 6000 });
  return body != null && body.trim().length > 20;
}

function checkOrgSchema(html: string): boolean {
  return /"@type"\s*:\s*"(Organization|MedicalOrganization)/i.test(html);
}

async function describe(name: string, domain: string, text: string, cfg: AppConfig): Promise<string> {
  if (!text || !cfg.enrich || !process.env.ANTHROPIC_API_KEY) return "";
  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: cfg.extractionModel,
      max_tokens: 80,
      messages: [
        {
          role: "user",
          content:
            `In one concise sentence, what does ${name} (${domain}) do in healthcare? ` +
            `Be specific about their product. Website text: ${text.slice(0, 2000)}`,
        },
      ],
    } as any);
    const block = (msg.content || []).find((b: any) => b.type === "text") as any;
    return (block?.text || "").trim().replace(/\.$/, "");
  } catch {
    return "";
  }
}

async function profileOne(name: string, configuredDomain: string, cfg: AppConfig): Promise<any> {
  const domain = resolveDomain(name, configuredDomain);
  const baseUrl = `https://${domain}`;
  const { status, body } = await fetchText(baseUrl, { htmlOnly: true });
  const html = body || "";
  const text = extractText(html, 4000);
  const cit = html ? citabilityScore(html) : 0;
  const hasLlms = await checkLlmstxt(domain);
  const hasSchema = checkOrgSchema(html);
  const description = await describe(name, domain, text, cfg);
  return {
    name,
    domain,
    logo_url: logoUrl(domain),
    favicon: faviconUrl(domain),
    description,
    reachable: status === 200,
    citability: cit,
    has_llmstxt: hasLlms,
    has_org_schema: hasSchema,
    geo_signals: { llmstxt: hasLlms, org_schema: hasSchema, citability: cit },
  };
}

export async function runCompetitorProfiles(cfg: AppConfig, onProgress?: Progress): Promise<any[]> {
  const sovPath = path.join(cfg.outputDir, "normalized", "share_of_voice.csv");
  const discovered = new Set<string>();
  for (const row of readCsv<any>(sovPath)) {
    if (row.entity && String(row.is_brand).toLowerCase() !== "true") discovered.add(row.entity);
  }

  const configDomainMap = new Map(cfg.competitors.map((c) => [c.name, c.domain]));
  const allNamesList: string[] = [];
  const seen = new Set<string>();
  for (const c of cfg.competitors) {
    if (!seen.has(c.name)) {
      allNamesList.push(c.name);
      seen.add(c.name);
    }
  }
  for (const n of discovered) {
    if (!seen.has(n) && n.toLowerCase() !== cfg.brand.name.toLowerCase()) {
      allNamesList.push(n);
      seen.add(n);
    }
  }

  const profiles: any[] = [];
  for (const name of allNamesList) {
    onProgress?.(`[competitor_profile] profiling ${name}...`);
    try {
      profiles.push(await profileOne(name, configDomainMap.get(name) || "", cfg));
    } catch (e: any) {
      const dom = resolveDomain(name, configDomainMap.get(name) || "");
      profiles.push({
        name,
        domain: dom,
        logo_url: logoUrl(dom),
        favicon: faviconUrl(dom),
        description: "",
        reachable: false,
        citability: 0,
        has_llmstxt: false,
        has_org_schema: false,
        geo_signals: { llmstxt: false, org_schema: false, citability: 0 },
      });
    }
  }

  const out = path.join(cfg.outputDir, "competitor_profiles.json");
  writeJson(out, profiles);
  onProgress?.(`[competitor_profile] wrote ${profiles.length} profiles -> ${out}`);
  return profiles;
}
