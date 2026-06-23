"""Content E-E-A-T — Experience, Expertise, Authoritativeness, Trust.

Ports geo-content into the pipeline: fetch a few key owned pages and score each
with a structured Claude call (the cheap extraction model) on the four E-E-A-T
pillars Google + AI engines weigh before trusting a source. Aggregates to one
0-100 score with per-pillar means and per-page detail.

Reuses citability's fetch/extract for the page text. Writes output/eeat.json.
Falls back to a null score (so compose.py uses its estimate) if no key / all calls fail.
"""
from __future__ import annotations

import json
import os
from datetime import datetime

from .config import AppConfig
from .citability import _Extractor, _discover, _fetch

_MAX_PAGES = 4

_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "experience": {"type": "integer", "description": "0-100: first-hand proof — real deployments, named customers, concrete outcomes."},
        "expertise": {"type": "integer", "description": "0-100: demonstrated domain depth, specifics, credentials."},
        "authoritativeness": {"type": "integer", "description": "0-100: signals of recognition — citations, named partners, press."},
        "trust": {"type": "integer", "description": "0-100: transparency, security/compliance claims, clear ownership, no overreach."},
        "note": {"type": "string", "description": "<=1 sentence on the biggest E-E-A-T gap on this page."},
    },
    "required": ["experience", "expertise", "authoritativeness", "trust", "note"],
}

_SYSTEM = (
    "You are an E-E-A-T analyst scoring a web page for how much an AI answer engine should trust it as a source. "
    "Score each pillar 0-100 from the page text only. Be strict: marketing fluff is not expertise; "
    "claims without specifics are not experience. Return JSON only."
)


def _page_text(url: str, html: str) -> str:
    p = _Extractor()
    try:
        p.feed(html)
    except Exception:
        return ""
    return " ".join(p.text)[:6000]


def eeat(cfg: AppConfig) -> dict:
    base = "https://" + cfg.brand.domain.rstrip("/")
    print(f"[eeat] scoring content E-E-A-T under {base}…")
    out = {
        "domain": base, "fetched_at": datetime.now().isoformat(timespec="seconds"),
        "score": None, "pillars": {}, "pages": [],
        "note": "content E-E-A-T scan (extraction model, structured output)",
    }

    if not os.getenv("ANTHROPIC_API_KEY"):
        out["note"] = "no ANTHROPIC_API_KEY — E-E-A-T left to compose.py estimate"
        _write(cfg, out)
        print("[eeat] skipped (no key) — compose.py will estimate")
        return out

    status, html = _fetch(base)
    urls = _discover(base, html) if (status == 200 and html) else []
    urls = urls[:_MAX_PAGES]

    try:
        import anthropic
        client = anthropic.Anthropic()
    except Exception as e:  # noqa: BLE001
        out["note"] = f"anthropic unavailable: {e}"
        _write(cfg, out)
        return out

    pillars = {"experience": [], "expertise": [], "authoritativeness": [], "trust": []}
    for url in urls:
        st, body = _fetch(url) if url != base else (status, html)
        text = _page_text(url, body) if (st == 200 and body) else ""
        if len(text) < 200:
            continue
        try:
            resp = client.messages.create(
                model=cfg.extraction_model, max_tokens=600, system=_SYSTEM,
                messages=[{"role": "user", "content": json.dumps({"url": url, "page_text": text}, ensure_ascii=False)}],
                output_config={"format": {"type": "json_schema", "schema": _SCHEMA}},
            )
            txt = next((b.text for b in resp.content if getattr(b, "type", None) == "text"), "")
            d = json.loads(txt)
        except Exception as e:  # noqa: BLE001
            print(f"[eeat] scoring failed for {url}: {type(e).__name__}")
            continue
        score = round((d["experience"] + d["expertise"] + d["authoritativeness"] + d["trust"]) / 4)
        out["pages"].append({"url": url, "title": url.replace(base, "") or "/",
                             "score": score, "pillars": {k: d[k] for k in pillars}, "note": d.get("note", "")})
        for k in pillars:
            pillars[k].append(d[k])

    if any(pillars["experience"]):
        out["pillars"] = {k: round(sum(v) / len(v)) for k, v in pillars.items() if v}
        out["score"] = round(sum(out["pillars"].values()) / len(out["pillars"]))
    out["pages"].sort(key=lambda x: x["score"], reverse=True)
    _write(cfg, out)
    if out["score"] is not None:
        print(f"[eeat] E-E-A-T {out['score']}/100 across {len(out['pages'])} pages — {out['pillars']}")
    else:
        print("[eeat] no pages scored — compose.py will estimate")
    return out


def _write(cfg: AppConfig, out: dict) -> None:
    os.makedirs(cfg.output_dir, exist_ok=True)
    with open(os.path.join(cfg.output_dir, "eeat.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
