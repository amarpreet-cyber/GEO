// Off-site brand authority — the entity footprint AI uses to recognise a brand.
// Ported from geo/brand_presence.py: Wikipedia + Wikidata lookups + sameAs + citations.
import path from "node:path";
import { AppConfig } from "./config";
import { readJson, writeJson, readCsv } from "./io";
import type { Progress } from "./collect";

const UA = "Mozilla/5.0 (compatible; RISA-GEO-Presence/1.0)";
const PLATFORMS = [
  { key: "youtube.com", label: "YouTube", weight: 25 },
  { key: "reddit.com", label: "Reddit", weight: 25 },
  { key: "wikipedia.org", label: "Wikipedia", weight: 20 },
  { key: "linkedin.com", label: "LinkedIn", weight: 15 },
  { key: "other", label: "Other (Crunchbase, GitHub, X)", weight: 15 },
];

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "");
}

async function getJson(url: string): Promise<any | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal });
    clearTimeout(t);
    return await res.json();
  } catch {
    return null;
  }
}

async function wikipedia(name: string): Promise<any> {
  const q = new URLSearchParams({ action: "query", list: "search", srsearch: name, srlimit: "1", format: "json" });
  const data = await getJson(`https://en.wikipedia.org/w/api.php?${q}`);
  const hits = data?.query?.search || [];
  if (hits.length && (hits[0].title || "").toLowerCase().includes(name.split(" ")[0].toLowerCase())) {
    const title = hits[0].title;
    return { present: true, title, url: "https://en.wikipedia.org/wiki/" + title.replace(/ /g, "_") };
  }
  return { present: false };
}

async function wikidata(name: string): Promise<any> {
  const q = new URLSearchParams({ action: "wbsearchentities", search: name, language: "en", limit: "1", format: "json" });
  const data = await getJson(`https://www.wikidata.org/w/api.php?${q}`);
  const hits = data?.search || [];
  if (hits.length && (hits[0].label || "").toLowerCase().includes(name.split(" ")[0].toLowerCase())) {
    return { present: true, id: hits[0].id };
  }
  return { present: false };
}

export async function brandPresence(cfg: AppConfig, onProgress?: Progress): Promise<any> {
  const outDir = cfg.outputDir;
  onProgress?.(`[brand] scanning off-site presence for ${cfg.brand.name}…`);

  const audit = readJson<any>(path.join(outDir, "site_audit.json")) || {};
  const summary = readJson<any>(path.join(outDir, "summary_metrics.json")) || {};
  const sameas = new Set<string>((audit.schema?.sameas_linked || []) as string[]);
  const citeDomains = new Set<string>();
  let socialCites = 0;
  for (const r of readCsv<any>(path.join(outDir, "normalized", "citations.csv"))) {
    citeDomains.add((r.domain || "").toLowerCase());
    if ((r.class || "") === "social") socialCites += parseInt(r.citations || "0", 10) || 0;
  }

  const wiki = await wikipedia(cfg.brand.name);
  const wd = await wikidata(cfg.brand.name);

  const present = (key: string): [boolean, string] => {
    if (key === "wikipedia.org") return [wiki.present, wiki.present ? "Wikipedia article" : "no article"];
    if (key === "other") {
      const hits = ["crunchbase.com", "github.com", "x.com", "twitter.com"].filter((p) =>
        [...sameas].some((s) => s.includes(p)),
      );
      return [hits.length > 0 || wd.present, hits.join(", ") || (wd.present ? "Wikidata entity" : "none")];
    }
    const linked = [...sameas].some((s) => s.includes(key));
    let cited = [...citeDomains].some((d) => d.includes(key));
    if (key === "reddit.com" && socialCites) cited = true;
    const sig = linked ? "sameAs link" : cited ? "cited in answers" : "not found";
    return [linked || cited, sig];
  };

  const platforms: any[] = [];
  let score = 0;
  for (const p of PLATFORMS) {
    const [ok, sig] = present(p.key);
    platforms.push({ ...p, present: ok, signal: sig });
    if (ok) score += p.weight;
  }

  const competitors: any[] = [];
  for (const name of (summary.top_competitors || []).slice(0, 5)) {
    const w = await wikipedia(name);
    const d = await wikidata(name);
    competitors.push({
      name,
      wikipedia: w.present,
      wikidata: d.present,
      entity_score: (w.present ? 60 : 0) + (d.present ? 40 : 0),
    });
  }

  const out = {
    domain: "https://" + cfg.brand.domain,
    fetched_at: nowIso(),
    score: Math.round(score),
    platform_score: Math.round(score),
    wikipedia: wiki,
    wikidata: wd,
    platforms,
    competitors,
    note: "deterministic entity scan (Wikipedia/Wikidata APIs + schema sameAs + answer citations)",
  };
  writeJson(path.join(outDir, "brand_presence.json"), out);
  const covered = platforms.filter((p) => p.present).length;
  onProgress?.(
    `[brand] authority ${Math.round(score)}/100 — ${covered}/${platforms.length} platforms, ` +
      `Wikipedia=${wiki.present ? "yes" : "no"}, Wikidata=${wd.present ? "yes" : "no"}`,
  );
  return out;
}
