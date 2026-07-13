// Shared HTML fetch + extraction helpers for the supply-side audit stages.
// Mirrors the behavior of geo/citability.py::_Extractor and the urllib fetches,
// implemented with global fetch + regex (no cheerio dependency).

const UA = "Mozilla/5.0 (compatible; RISA-GEO/1.0)";

export type FetchResult = { status: number | null; body: string | null };

export async function fetchText(
  url: string,
  opts: { timeout?: number; htmlOnly?: boolean; maxBytes?: number } = {},
): Promise<FetchResult> {
  const { timeout = 12000, htmlOnly = false } = opts;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    const ctype = res.headers.get("content-type") || "";
    if (htmlOnly && ctype && !ctype.includes("html")) return { status: null, body: null };
    const text = await res.text();
    return { status: res.status, body: text };
  } catch {
    return { status: null, body: null };
  }
}

const SKIP_BLOCKS = /<(script|style|noscript|svg|head|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/gi;

export type Extracted = {
  text: string[];
  h2: number;
  h3: number;
  li: number;
  links: string[];
  title: string;
};

// Approximates the Python HTMLParser: strips skipped blocks, then counts
// headings/list-items and pulls visible text + same-page links.
export function extractHtml(html: string): Extracted {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
  const h2 = (html.match(/<h2\b/gi) || []).length;
  const h3 = (html.match(/<h3\b/gi) || []).length;
  const li = (html.match(/<li\b/gi) || []).length;
  const links: string[] = [];
  const linkRe = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) links.push(m[1]);

  const stripped = html.replace(SKIP_BLOCKS, " ");
  const noTags = stripped.replace(/<[^>]+>/g, " ");
  const decoded = decodeEntities(noTags);
  const text = decoded
    .split(/\s*\n\s*|\s{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  // Also split on runs of whitespace to approximate token-level joins.
  const flat = decoded.replace(/\s+/g, " ").trim();
  return { text: flat ? [flat] : text, h2, h3, li, links, title };
}

export function extractText(html: string, maxLen = 4000): string {
  const stripped = html.replace(SKIP_BLOCKS, " ");
  const noTags = stripped.replace(/<[^>]+>/g, " ");
  return decodeEntities(noTags).replace(/\s+/g, " ").trim().slice(0, maxLen);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// Resolve a possibly-relative href against a base URL.
export function resolveUrl(base: string, href: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}
