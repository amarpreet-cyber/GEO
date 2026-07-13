// Lightweight text helpers shared across extraction. Ported from geo/text_cleaning.py.

function okBoundary(text: string, start: number, end: number): boolean {
  const isWord = (ch: string) => /[A-Za-z0-9_]/.test(ch);
  if (start > 0 && isWord(text[start - 1])) return false;
  if (end < text.length && isWord(text[end])) return false;
  return true;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function aliasSpans(text: string, alias: string): [number, number][] {
  if (!text || !alias) return [];
  const spans: [number, number][] = [];
  const re = new RegExp(escapeRe(alias.trim()), "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const start = m.index;
    const end = m.index + m[0].length;
    if (okBoundary(text, start, end)) spans.push([start, end]);
    if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-width
  }
  return spans;
}

export function mergeSpans(spans: [number, number][]): [number, number][] {
  if (!spans.length) return [];
  const sorted = [...spans].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out: [number, number][] = [sorted[0]];
  for (const [s, e] of sorted.slice(1)) {
    const last = out[out.length - 1];
    if (s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

// Distinct (de-overlapped) occurrences of an entity across its aliases.
export function countEntity(text: string, aliases: string[]): [number, number | null] {
  const spans: [number, number][] = [];
  for (const a of aliases) spans.push(...aliasSpans(text, a));
  const merged = mergeSpans(spans);
  return [merged.length, merged.length ? merged[0][0] : null];
}

export function domainOf(url: string): string {
  try {
    const u = new URL(url.includes("://") ? url : "http://" + url);
    const net = u.hostname.toLowerCase();
    return net.startsWith("www.") ? net.slice(4) : net;
  } catch {
    return "";
  }
}

export function domainRoot(domain: string): string {
  const parts = domain.split(".");
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0] || "";
}
