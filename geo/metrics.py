"""Deterministic, brand-filtered metrics — the fixed core.

Fixes vs the original pipeline:
  * Share of voice is computed ONLY over the tracked set (brand + named
    competitors), so it is never polluted by countries, fabrics, prices, etc.
  * Brand position is a real rank derived from first-occurrence order of the
    tracked entities actually present in the text (no phantom `positions` field).
  * Visibility score uses real positions: mean(1/rank), absent => 0, *100.
  * Citations are classified owned / competitor / social / earned.
"""
from __future__ import annotations

from collections import Counter, defaultdict

from .config import AppConfig
from .text_cleaning import count_entity, domain_of, domain_root


# ---------------------------------------------------------------------------
# per-response extraction (deterministic)
# ---------------------------------------------------------------------------
def entity_hits(text: str, cfg: AppConfig) -> dict:
    """Mentions of the tracked set in one answer.

    Returns:
      {
        "brand": {"mentioned": bool, "count": int, "first": int|None},
        "competitors": {name: {"count": int, "first": int|None}, ...present only...},
      }
    """
    # brand: distinct (de-overlapped) occurrences across aliases
    b_count, b_first = count_entity(text, cfg.brand.aliases)

    comp: dict[str, dict] = {}
    for c in cfg.competitors:
        cnt, first = count_entity(text, c.all_names())
        if cnt > 0:
            comp[c.name] = {"count": cnt, "first": first}

    return {
        "brand": {"mentioned": b_count > 0, "count": b_count, "first": b_first},
        "competitors": comp,
    }


def brand_position(hits: dict, brand_name: str) -> int:
    """Rank of the brand among tracked entities present, by first occurrence.
    1 = first mentioned; 0 = brand not present."""
    order = []
    b = hits["brand"]
    if b["mentioned"] and b["first"] is not None:
        order.append((b["first"], brand_name))
    for name, d in hits["competitors"].items():
        if d["first"] is not None:
            order.append((d["first"], name))
    order.sort(key=lambda x: x[0])
    for i, (_, name) in enumerate(order, start=1):
        if name == brand_name:
            return i
    return 0


# ---------------------------------------------------------------------------
# citations
# ---------------------------------------------------------------------------
def classify_citation(url: str, cfg: AppConfig) -> tuple[str, str]:
    """Return (domain, klass) where klass in owned|competitor|social|earned."""
    dom = domain_of(url)
    if not dom:
        return "", "earned"
    # owned
    for od in cfg.brand.owned_domains:
        if dom == od or dom.endswith("." + od):
            return dom, "owned"
    # social / community / aggregators
    for sd in cfg.citation_social:
        if dom == sd or dom.endswith("." + sd):
            return dom, "social"
    # competitor (heuristic: competitor token appears in the registrable label)
    root = domain_root(dom)
    for c in cfg.competitors:
        for alias in c.all_names():
            token = "".join(ch for ch in alias.lower() if ch.isalnum())
            if token and len(token) >= 4 and token in root:
                return dom, "competitor"
    return dom, "earned"


# ---------------------------------------------------------------------------
# aggregate metrics across all responses
# ---------------------------------------------------------------------------
def share_of_voice(rows: list[dict], cfg: AppConfig) -> dict[str, float]:
    """Share of mentions over the tracked set (brand + competitors)."""
    counts: Counter = Counter()
    for r in rows:
        h = r["_hits"]
        counts[cfg.brand.name] += h["brand"]["count"]
        for name, d in h["competitors"].items():
            counts[name] += d["count"]
    total = sum(counts.values())
    if total == 0:
        return {}
    return {k: round(v / total, 4) for k, v in counts.most_common()}


def visibility_score(rows: list[dict]) -> float:
    """mean(1/rank) over all responses (absent => 0), scaled to 0-100."""
    if not rows:
        return 0.0
    acc = 0.0
    for r in rows:
        pos = r["_brand_position"]
        acc += (1.0 / pos) if pos and pos > 0 else 0.0
    return round(100.0 * acc / len(rows), 1)


def mention_rate(rows: list[dict]) -> float:
    if not rows:
        return 0.0
    m = sum(1 for r in rows if r["_hits"]["brand"]["mentioned"])
    return round(100.0 * m / len(rows), 1)


def avg_position(rows: list[dict]) -> float | None:
    pos = [r["_brand_position"] for r in rows if r["_brand_position"] and r["_brand_position"] > 0]
    return round(sum(pos) / len(pos), 2) if pos else None


def rollup(rows: list[dict], key: str) -> dict[str, dict]:
    """Per-segment (topic / persona / engine) mention-rate + visibility."""
    buckets: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        buckets[r.get(key) or "(unspecified)"].append(r)
    out = {}
    for seg, rs in buckets.items():
        out[seg] = {
            "prompts": len(rs),
            "mention_rate": mention_rate(rs),
            "visibility_score": visibility_score(rs),
            "avg_position": avg_position(rs),
        }
    return out


def competitor_leaderboard(rows: list[dict], cfg: AppConfig) -> list[dict]:
    """Mention count + presence-rate for each competitor, descending."""
    counts: Counter = Counter()
    appears: Counter = Counter()
    for r in rows:
        for name, d in r["_hits"]["competitors"].items():
            counts[name] += d["count"]
            appears[name] += 1
    n = len(rows) or 1
    idx = {c.name: c for c in cfg.competitors}
    out = []
    for name, cnt in counts.most_common():
        c = idx.get(name)
        out.append({
            "competitor": name,
            "category": c.category if c else "",
            "side": c.side if c else "",
            "mentions": cnt,
            "responses_present": appears[name],
            "presence_rate": round(100.0 * appears[name] / n, 1),
        })
    return out


def citation_summary(rows: list[dict], cfg: AppConfig) -> dict:
    """Citation counts by class + top domains."""
    by_class: Counter = Counter()
    by_domain: Counter = Counter()
    domain_class: dict[str, str] = {}
    for r in rows:
        urls = r.get("cited_urls") or []
        if not urls:
            urls = r.get("searched_urls") or []
        for u in urls:
            dom, klass = classify_citation(u, cfg)
            if not dom:
                continue
            by_class[klass] += 1
            by_domain[dom] += 1
            domain_class[dom] = klass
    top = [
        {"domain": d, "citations": c, "class": domain_class.get(d, "earned")}
        for d, c in by_domain.most_common(25)
    ]
    return {"by_class": dict(by_class), "top_domains": top}
