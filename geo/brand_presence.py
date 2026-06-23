"""Off-site brand authority — the entity footprint AI uses to recognise a brand.

Ports geo-brand-mentions into a deterministic, network-only scan (no LLM cost):
real Wikipedia + Wikidata lookups, plus the off-site profiles asserted via the
homepage's schema sameAs and any social/owned citations the answer engine made.
Scores platform coverage on the geo-brand-mentions weighting and runs the same
Wikipedia/Wikidata check for the top competitors as a vs-competitor benchmark.

Reads: site_audit.json, normalized/citations.csv, summary_metrics.json.
Writes: output/brand_presence.json. Pure stdlib (urllib).
"""
from __future__ import annotations

import csv
import json
import os
import urllib.parse
import urllib.request
from datetime import datetime

from .config import AppConfig

_UA = "Mozilla/5.0 (compatible; RISA-GEO-Presence/1.0)"
# geo-brand-mentions platform weighting
PLATFORMS = [
    {"key": "youtube.com", "label": "YouTube", "weight": 25},
    {"key": "reddit.com", "label": "Reddit", "weight": 25},
    {"key": "wikipedia.org", "label": "Wikipedia", "weight": 20},
    {"key": "linkedin.com", "label": "LinkedIn", "weight": 15},
    {"key": "other", "label": "Other (Crunchbase, GitHub, X)", "weight": 15},
]


def _get(url: str, timeout: int = 12):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": _UA})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8", "replace"))
    except Exception:
        return None


def _wikipedia(name: str) -> dict:
    q = urllib.parse.urlencode({"action": "query", "list": "search", "srsearch": name,
                                "srlimit": 1, "format": "json"})
    data = _get(f"https://en.wikipedia.org/w/api.php?{q}")
    hits = (((data or {}).get("query") or {}).get("search")) or []
    if hits and name.split()[0].lower() in hits[0].get("title", "").lower():
        title = hits[0]["title"]
        return {"present": True, "title": title,
                "url": "https://en.wikipedia.org/wiki/" + title.replace(" ", "_")}
    return {"present": False}


def _wikidata(name: str) -> dict:
    q = urllib.parse.urlencode({"action": "wbsearchentities", "search": name,
                                "language": "en", "limit": 1, "format": "json"})
    data = _get(f"https://www.wikidata.org/w/api.php?{q}")
    hits = (data or {}).get("search") or []
    if hits and name.split()[0].lower() in (hits[0].get("label", "") or "").lower():
        return {"present": True, "id": hits[0].get("id")}
    return {"present": False}


def brand_presence(cfg: AppConfig) -> dict:
    out_dir = cfg.output_dir
    print(f"[brand] scanning off-site presence for {cfg.brand.name}…")

    # signals from prior stages
    audit = _read_json(os.path.join(out_dir, "site_audit.json")) or {}
    summary = _read_json(os.path.join(out_dir, "summary_metrics.json")) or {}
    sameas = set((audit.get("schema") or {}).get("sameas_linked", []) or [])
    cite_domains, social_cites = set(), 0
    try:
        with open(os.path.join(out_dir, "normalized", "citations.csv"), encoding="utf-8") as f:
            for r in csv.DictReader(f):
                cite_domains.add((r.get("domain") or "").lower())
                if (r.get("class") or "") == "social":
                    social_cites += int(float(r.get("citations") or 0))
    except Exception:
        pass

    wiki = _wikipedia(cfg.brand.name)
    wd = _wikidata(cfg.brand.name)

    def present(key: str) -> tuple[bool, str]:
        if key == "wikipedia.org":
            return wiki["present"], "Wikipedia article" if wiki["present"] else "no article"
        if key == "other":
            hits = [p for p in ("crunchbase.com", "github.com", "x.com", "twitter.com") if any(p in s for s in sameas)]
            return bool(hits) or wd["present"], (", ".join(hits) or ("Wikidata entity" if wd["present"] else "none"))
        linked = any(key in s for s in sameas)
        cited = any(key in d for d in cite_domains)
        if key == "reddit.com" and social_cites:
            cited = True
        sig = "sameAs link" if linked else ("cited in answers" if cited else "not found")
        return (linked or cited), sig

    platforms, score = [], 0.0
    for p in PLATFORMS:
        ok, sig = present(p["key"])
        platforms.append({**p, "present": ok, "signal": sig})
        if ok:
            score += p["weight"]

    # vs-competitor benchmark: same Wikipedia/Wikidata check for the top rivals
    competitors = []
    for name in (summary.get("top_competitors") or [])[:5]:
        w = _wikipedia(name)
        d = _wikidata(name)
        competitors.append({"name": name, "wikipedia": w["present"], "wikidata": d["present"],
                            "entity_score": (60 if w["present"] else 0) + (40 if d["present"] else 0)})

    out = {
        "domain": "https://" + cfg.brand.domain,
        "fetched_at": datetime.now().isoformat(timespec="seconds"),
        "score": round(score),
        "platform_score": round(score),
        "wikipedia": wiki,
        "wikidata": wd,
        "platforms": platforms,
        "competitors": competitors,
        "note": "deterministic entity scan (Wikipedia/Wikidata APIs + schema sameAs + answer citations)",
    }
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "brand_presence.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    covered = sum(p["present"] for p in platforms)
    print(f"[brand] authority {round(score)}/100 — {covered}/{len(platforms)} platforms, "
          f"Wikipedia={'yes' if wiki['present'] else 'no'}, Wikidata={'yes' if wd['present'] else 'no'}")
    return out


def _read_json(path: str):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None
