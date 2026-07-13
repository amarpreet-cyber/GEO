// Deterministic, brand-filtered metrics — the fixed core. Ported from geo/metrics.py.
import { AppConfig, allNames } from "./config";
import { countEntity, domainOf, domainRoot } from "./textCleaning";

export type EntityHits = {
  brand: { mentioned: boolean; count: number; first: number | null };
  competitors: Record<string, { count: number; first: number | null }>;
};

export type Row = {
  engine: string;
  model: string;
  prompt: string;
  persona: string;
  topic: string;
  intent: string;
  response: string;
  cited_urls?: string[];
  searched_urls?: string[];
  error?: string | null;
  _hits?: EntityHits;
  _brand_position?: number;
  _enrich?: any;
};

export function entityHits(text: string, cfg: AppConfig): EntityHits {
  const [bCount, bFirst] = countEntity(text, cfg.brand.aliases);
  const comp: EntityHits["competitors"] = {};
  for (const c of cfg.competitors) {
    const [cnt, first] = countEntity(text, allNames(c));
    if (cnt > 0) comp[c.name] = { count: cnt, first };
  }
  return {
    brand: { mentioned: bCount > 0, count: bCount, first: bFirst },
    competitors: comp,
  };
}

// Rank of the brand among tracked entities present, by first occurrence.
export function brandPosition(hits: EntityHits, brandName: string): number {
  const order: [number, string][] = [];
  const b = hits.brand;
  if (b.mentioned && b.first != null) order.push([b.first, brandName]);
  for (const [name, d] of Object.entries(hits.competitors)) {
    if (d.first != null) order.push([d.first, name]);
  }
  order.sort((a, z) => a[0] - z[0]);
  for (let i = 0; i < order.length; i++) if (order[i][1] === brandName) return i + 1;
  return 0;
}

export function classifyCitation(url: string, cfg: AppConfig): [string, string] {
  const dom = domainOf(url);
  if (!dom) return ["", "earned"];
  for (const od of cfg.brand.ownedDomains) {
    if (dom === od || dom.endsWith("." + od)) return [dom, "owned"];
  }
  for (const sd of cfg.citationSocial) {
    if (dom === sd || dom.endsWith("." + sd)) return [dom, "social"];
  }
  const root = domainRoot(dom);
  for (const c of cfg.competitors) {
    for (const alias of allNames(c)) {
      const token = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (token && token.length >= 4 && root.includes(token)) return [dom, "competitor"];
    }
  }
  return [dom, "earned"];
}

export function shareOfVoice(rows: Row[], cfg: AppConfig): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const h = r._hits!;
    counts[cfg.brand.name] = (counts[cfg.brand.name] || 0) + h.brand.count;
    for (const [name, d] of Object.entries(h.competitors)) {
      counts[name] = (counts[name] || 0) + d.count;
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    out[k] = Math.round((v / total) * 10000) / 10000;
  }
  return out;
}

export function visibilityScore(rows: Row[]): number {
  if (!rows.length) return 0;
  let acc = 0;
  for (const r of rows) {
    const pos = r._brand_position || 0;
    acc += pos > 0 ? 1 / pos : 0;
  }
  return Math.round((100 * acc) / rows.length * 10) / 10;
}

export function mentionRate(rows: Row[]): number {
  if (!rows.length) return 0;
  const m = rows.filter((r) => r._hits!.brand.mentioned).length;
  return Math.round((100 * m) / rows.length * 10) / 10;
}

export function avgPosition(rows: Row[]): number | null {
  const pos = rows.map((r) => r._brand_position || 0).filter((p) => p > 0);
  if (!pos.length) return null;
  return Math.round((pos.reduce((a, b) => a + b, 0) / pos.length) * 100) / 100;
}

export function rollup(rows: Row[], key: keyof Row): Record<string, any> {
  const buckets: Record<string, Row[]> = {};
  for (const r of rows) {
    const seg = (r[key] as string) || "(unspecified)";
    (buckets[seg] ||= []).push(r);
  }
  const out: Record<string, any> = {};
  for (const [seg, rs] of Object.entries(buckets)) {
    out[seg] = {
      prompts: rs.length,
      mention_rate: mentionRate(rs),
      visibility_score: visibilityScore(rs),
      avg_position: avgPosition(rs),
    };
  }
  return out;
}

export function competitorLeaderboard(rows: Row[], cfg: AppConfig): any[] {
  const counts: Record<string, number> = {};
  const appears: Record<string, number> = {};
  for (const r of rows) {
    for (const [name, d] of Object.entries(r._hits!.competitors)) {
      counts[name] = (counts[name] || 0) + d.count;
      appears[name] = (appears[name] || 0) + 1;
    }
  }
  const n = rows.length || 1;
  const idx = new Map(cfg.competitors.map((c) => [c.name, c]));
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, cnt]) => {
      const c = idx.get(name);
      return {
        competitor: name,
        category: c ? c.category : "",
        side: c ? c.side : "",
        mentions: cnt,
        responses_present: appears[name],
        presence_rate: Math.round((100 * appears[name]) / n * 10) / 10,
      };
    });
}

export function citationSummary(rows: Row[], cfg: AppConfig): any {
  const byClass: Record<string, number> = {};
  const byDomain: Record<string, number> = {};
  const domainClass: Record<string, string> = {};
  for (const r of rows) {
    let urls = r.cited_urls || [];
    if (!urls.length) urls = r.searched_urls || [];
    for (const u of urls) {
      const [dom, klass] = classifyCitation(u, cfg);
      if (!dom) continue;
      byClass[klass] = (byClass[klass] || 0) + 1;
      byDomain[dom] = (byDomain[dom] || 0) + 1;
      domainClass[dom] = klass;
    }
  }
  const top = Object.entries(byDomain)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([d, c]) => ({ domain: d, citations: c, class: domainClass[d] || "earned" }));
  return { by_class: byClass, top_domains: top };
}
