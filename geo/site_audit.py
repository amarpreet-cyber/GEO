"""Supply-side site diagnostics for the brand's own domain.

Folds the GEO skills' methodology (geo-crawlers, geo-llmstxt, geo-schema) into
the pipeline so the dashboard can explain WHY the brand is (in)visible:
  - AI crawler access  : can GPTBot / ClaudeBot / PerplexityBot reach the site?
  - llms.txt           : does the site ship the machine-readable AI guide?
  - schema / sameAs     : does the site assert its entity + link its profiles?

Writes output/site_audit.json. Pure stdlib (urllib) so it has no extra deps.
"""
from __future__ import annotations

import json
import os
import re
import urllib.request
from datetime import datetime
from urllib.parse import urljoin

from .config import AppConfig

_UA = "Mozilla/5.0 (compatible; RISA-GEO-Audit/1.0)"

# AI crawlers grouped by impact tier (per geo-crawlers methodology).
TIER1 = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-Web",
         "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended"]
TIER2 = ["Applebot-Extended", "Amazonbot", "Bytespider", "CCBot", "cohere-ai",
         "Meta-ExternalAgent", "Bingbot"]
# sameAs profiles AI uses for entity resolution (per geo-schema methodology).
SAMEAS_TARGETS = ["wikipedia.org", "wikidata.org", "linkedin.com", "crunchbase.com",
                  "youtube.com", "github.com", "x.com", "twitter.com"]


def _fetch(url: str, timeout: int = 12):
    """Return (status, text) or (None, error_string)."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": _UA})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception as e:  # noqa: BLE001
        return None, str(e)


# --------------------------------------------------------------------------
# robots.txt -> per-bot allow/block
# --------------------------------------------------------------------------
def _parse_robots(text: str) -> dict[str, list[str]]:
    """user-agent (lowercased) -> list of Disallow paths."""
    groups: dict[str, list[str]] = {}
    current: list[str] = []
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line or ":" not in line:
            continue
        field, _, val = line.partition(":")
        field, val = field.strip().lower(), val.strip()
        if field == "user-agent":
            ua = val.lower()
            current = groups.setdefault(ua, [])
        elif field == "disallow" and current is not None:
            current.append(val)
    return groups


def _bot_allowed(bot: str, groups: dict[str, list[str]], robots_exists: bool) -> bool:
    if not robots_exists:
        return True  # no robots.txt == everything allowed
    rules = groups.get(bot.lower())
    if rules is None:
        rules = groups.get("*")
    if rules is None:
        return True  # no matching group == allowed
    # blocked if the group disallows the site root
    return not any(d == "/" for d in rules)


def _crawler_audit(base: str) -> dict:
    status, body = _fetch(urljoin(base, "/robots.txt"))
    exists = status == 200 and bool(body.strip())
    groups = _parse_robots(body) if exists else {}
    bots = []
    for name, tier in [(b, 1) for b in TIER1] + [(b, 2) for b in TIER2]:
        bots.append({"name": name, "tier": tier, "allowed": _bot_allowed(name, groups, exists)})
    t1 = [b for b in bots if b["tier"] == 1]
    t2 = [b for b in bots if b["tier"] == 2]
    t1_ok = sum(b["allowed"] for b in t1) / len(t1)
    t2_ok = sum(b["allowed"] for b in t2) / len(t2)
    blanket_block = any(d == "/" for d in groups.get("*", []))
    # geo-crawlers weighting: Tier1 50, Tier2 25, no blanket block 15, robots present 10
    score = round(100 * (0.50 * t1_ok + 0.25 * t2_ok + 0.15 * (0 if blanket_block else 1) + 0.10 * (1 if exists else 0.5)))
    return {
        "score": score,
        "robots_exists": exists,
        "blanket_block": blanket_block,
        "tier1_allowed": f"{sum(b['allowed'] for b in t1)}/{len(t1)}",
        "tier2_allowed": f"{sum(b['allowed'] for b in t2)}/{len(t2)}",
        "bots": bots,
    }


# --------------------------------------------------------------------------
# llms.txt
# --------------------------------------------------------------------------
def _llmstxt_audit(base: str) -> dict:
    status, body = _fetch(urljoin(base, "/llms.txt"))
    present = status == 200 and bool(body.strip()) and "<html" not in body[:200].lower()
    if not present:
        return {"score": 0, "present": False, "note": "no /llms.txt — quick win (geo-llmstxt can generate one)"}
    has_h1 = bool(re.search(r"^#\s+\S", body, re.M))
    sections = len(re.findall(r"^##\s+\S", body, re.M))
    has_links = body.count("](") + body.count("http") > 0
    # completeness 40, structure 35, links 25
    score = round(40 * (1 if has_h1 else 0) + 35 * min(1, sections / 3) + 25 * (1 if has_links else 0))
    return {"score": score, "present": True, "sections": sections, "chars": len(body)}


# --------------------------------------------------------------------------
# schema / sameAs (homepage JSON-LD)
# --------------------------------------------------------------------------
def _schema_audit(base: str) -> dict:
    status, html = _fetch(base)
    if status != 200 or not html:
        return {"score": 0, "reachable": False, "note": f"homepage not fetched (status {status})"}
    blocks = re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
                        html, re.S | re.I)
    types, sameas = set(), set()
    has_org = False
    for b in blocks:
        try:
            data = json.loads(b.strip())
        except Exception:
            continue
        for obj in (data if isinstance(data, list) else [data]):
            if not isinstance(obj, dict):
                continue
            t = obj.get("@type")
            for tt in (t if isinstance(t, list) else [t]):
                if tt:
                    types.add(tt)
                if tt in ("Organization", "Corporation", "MedicalOrganization"):
                    has_org = True
            sa = obj.get("sameAs")
            for s in (sa if isinstance(sa, list) else [sa] if sa else []):
                sameas.add(s)
    linked = sorted({t for t in SAMEAS_TARGETS if any(t in s for s in sameas)})
    # geo-schema weighting (compressed): org 35, sameAs coverage 40, any JSON-LD 15, multiple types 10
    score = round(35 * (1 if has_org else 0) + 40 * min(1, len(linked) / 5)
                  + 15 * (1 if blocks else 0) + 10 * min(1, len(types) / 3))
    return {
        "score": score, "reachable": True, "jsonld_blocks": len(blocks),
        "has_organization": has_org, "types": sorted(types),
        "sameas_count": len(sameas), "sameas_linked": linked,
        "sameas_missing": [t for t in SAMEAS_TARGETS if t not in linked],
    }


def site_audit(cfg: AppConfig) -> dict:
    base = "https://" + cfg.brand.domain.rstrip("/")
    print(f"[audit] auditing {base} (crawlers, llms.txt, schema)…")
    crawler = _crawler_audit(base)
    llmstxt = _llmstxt_audit(base)
    schema = _schema_audit(base)
    overall = round(0.5 * crawler["score"] + 0.3 * schema["score"] + 0.2 * llmstxt["score"])
    out = {
        "domain": base,
        "fetched_at": datetime.now().isoformat(timespec="seconds"),
        "readiness_score": overall,
        "crawler": crawler,
        "llmstxt": llmstxt,
        "schema": schema,
    }
    os.makedirs(cfg.output_dir, exist_ok=True)
    with open(os.path.join(cfg.output_dir, "site_audit.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"[audit] readiness={overall}/100  crawler={crawler['score']}  "
          f"schema={schema['score']}  llms.txt={llmstxt['score']}  "
          f"(Tier-1 crawlers allowed: {crawler['tier1_allowed']})")
    return out
