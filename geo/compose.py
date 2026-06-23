"""Composite GEO score — the one number that fans the whole product.

Fans in every supply-side + authority signal the pipeline measures and folds
them into a single 0-100 GEO score with an explainable per-category breakdown
and a unified, severity-ranked issues[] list (collected from every audit
module). Adopts the canonical geo-audit weighting:

    GEO = Citability*0.25 + BrandAuthority*0.20 + EEAT*0.20
        + Technical*0.15  + Schema*0.10        + Platform*0.10

Dimensions with a dedicated module (citability.py, site_audit.py) are measured
exactly. Dimensions whose dedicated module has not run yet (brand_presence,
eeat) fall back to a deterministic proxy computed from the citation registry +
entity signals, and are flagged `measured: false` so the UI can say so honestly.

Reads: summary_metrics.json, site_audit.json, normalized/citations.csv, and
(optional) citability.json / eeat.json / brand_presence.json.
Writes: output/geo_score.json  + appends the composite to history/index.json.
Pure stdlib. No network, no LLM — safe to run any time after analyze + audit.
"""
from __future__ import annotations

import csv
import json
import os
from datetime import datetime

from .config import AppConfig

WEIGHTS = {
    "citability": 0.25,
    "brand": 0.20,
    "eeat": 0.20,
    "technical": 0.15,
    "schema": 0.10,
    "platform": 0.10,
}
LABELS = {
    "citability": "Citability",
    "brand": "Brand authority",
    "eeat": "E-E-A-T",
    "technical": "Technical",
    "schema": "Schema / entity",
    "platform": "Platform coverage",
}


def _read_json(path: str):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _read_citations(path: str):
    rows = []
    try:
        with open(path, "r", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
    except Exception:
        return rows
    return rows


def _grade(v: float) -> str:
    # mirrors web/lib/derive.ts gradeFor (dashboard thresholds)
    return "A" if v >= 60 else "B" if v >= 40 else "C" if v >= 20 else "D" if v >= 10 else "F"


def _clamp(v: float) -> float:
    return max(0.0, min(100.0, v))


def compose(cfg: AppConfig) -> dict:
    out_dir = cfg.output_dir
    summary = _read_json(os.path.join(out_dir, "summary_metrics.json")) or {}
    audit = _read_json(os.path.join(out_dir, "site_audit.json")) or {}
    citab = _read_json(os.path.join(out_dir, "citability.json"))
    eeat = _read_json(os.path.join(out_dir, "eeat.json"))
    presence = _read_json(os.path.join(out_dir, "brand_presence.json"))
    cites = _read_citations(os.path.join(out_dir, "normalized", "citations.csv"))

    crawler = audit.get("crawler", {}) or {}
    schema = audit.get("schema", {}) or {}
    llmstxt = audit.get("llmstxt", {}) or {}

    # ---- citation-registry rollups (authority substrate) -------------------
    by_class: dict[str, int] = {}
    domains_by_class: dict[str, set] = {}
    for r in cites:
        k = (r.get("class") or "earned").strip()
        n = int(float(r.get("citations") or 0))
        by_class[k] = by_class.get(k, 0) + n
        domains_by_class.setdefault(k, set()).add(r.get("domain"))
    total_cites = sum(by_class.values()) or 1
    owned = by_class.get("owned", 0)
    earned = by_class.get("earned", 0)
    social = by_class.get("social", 0)
    owned_earned_share = 100 * (owned + earned) / total_cites
    distinct_domains = len({r.get("domain") for r in cites if r.get("domain")})
    distinct_earned = len(domains_by_class.get("earned", set()))
    sameas_linked = len(schema.get("sameas_linked", []) or [])

    # ---- six sub-scores ----------------------------------------------------
    components: list[dict] = []

    # 1) Citability — measured if citability.py has run
    if citab and citab.get("pages"):
        cit_val = float(citab.get("score", 0))
        cit_measured, cit_note = True, f"mean of {len(citab['pages'])} owned pages"
    else:
        # proxy: authority share is a weak stand-in until page scoring runs
        cit_val = _clamp(0.6 * owned_earned_share)
        cit_measured, cit_note = False, "estimate — run `python run.py citability` for page-level scores"
    components.append(_c("citability", cit_val, cit_measured, cit_note))

    # 2) Brand authority — proxy from owned/earned citations + sameAs profiles
    if presence and presence.get("score") is not None:
        brand_val = float(presence["score"])
        brand_measured, brand_note = True, "off-site presence scan"
    else:
        brand_val = _clamp(
            0.45 * owned_earned_share
            + 0.30 * 100 * min(1.0, sameas_linked / 8)
            + 0.25 * 100 * min(1.0, owned / 5)
        )
        brand_measured, brand_note = False, "estimate from citations + sameAs — run `brand` for the off-site scan"
    components.append(_c("brand", brand_val, brand_measured, brand_note))

    # 3) E-E-A-T — proxy from entity trust + earned authority breadth
    if eeat and eeat.get("score") is not None:
        eeat_val = float(eeat["score"])
        eeat_measured, eeat_note = True, "content E-E-A-T scan"
    else:
        eeat_val = _clamp(
            25 * (1 if schema.get("has_organization") else 0)
            + 25 * min(1.0, distinct_earned / 20)
            + 25 * min(1.0, owned / 5)
            + 25 * min(1.0, sameas_linked / 4)
        )
        eeat_measured, eeat_note = False, "estimate from entity + citation signals — run `eeat` for content scoring"
    components.append(_c("eeat", eeat_val, eeat_measured, eeat_note))

    # 4) Technical — crawler access (0.7) + llms.txt (0.3) — measured
    tech_val = _clamp(0.7 * crawler.get("score", 0) + 0.3 * llmstxt.get("score", 0))
    components.append(_c("technical", tech_val, bool(audit), "crawler access + llms.txt"))

    # 5) Schema / entity — measured
    schema_val = float(schema.get("score", 0))
    components.append(_c("schema", schema_val, bool(audit), "homepage JSON-LD + sameAs"))

    # 6) Platform coverage — web-surface breadth from real citation data
    plat_val = _clamp(
        50 * min(1.0, distinct_domains / 40)
        + 30 * min(1.0, social / 3)
        + 20 * min(1.0, sameas_linked / 8)
    )
    components.append(_c("platform", plat_val, True,
                        "web-surface breadth across cited domains + social reach"))

    subscores = {c["key"]: round(c["value"], 1) for c in components}
    geo = round(sum(c["value"] * WEIGHTS[c["key"]] for c in components), 1)
    grade = _grade(geo)

    issues = _collect_issues(audit, citab, components, summary)

    out = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "geo_score": geo,
        "grade": grade,
        "subscores": subscores,
        "components": components,
        "weights": WEIGHTS,
        "issues": issues,
        "any_estimated": any(not c["measured"] for c in components),
    }
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "geo_score.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    _snapshot(out_dir, summary, geo)

    measured = sum(c["measured"] for c in components)
    print(f"[compose] GEO score = {geo}/100  grade {grade}  "
          f"({measured}/6 dimensions measured, {len(issues)} issues)")
    for c in components:
        flag = "" if c["measured"] else "  ~est"
        print(f"          {LABELS[c['key']]:<18} {c['value']:5.1f}  × {WEIGHTS[c['key']]:.2f}{flag}")
    return out


def _c(key: str, value: float, measured: bool, note: str) -> dict:
    return {
        "key": key, "label": LABELS[key], "value": round(float(value), 1),
        "weight": WEIGHTS[key], "contribution": round(float(value) * WEIGHTS[key], 1),
        "measured": bool(measured), "note": note,
    }


def _collect_issues(audit: dict, citab, components, summary) -> list[dict]:
    """Unified, severity-ranked issues from every audit signal + the composite."""
    out: list[dict] = []
    schema = (audit.get("schema") or {})
    llmstxt = (audit.get("llmstxt") or {})
    crawler = (audit.get("crawler") or {})

    if audit and not llmstxt.get("present"):
        out.append(_i("error", "No llms.txt published",
                      "Publish /llms.txt with sections + links. <1 hour; few competitors have one.", "llms.txt"))
    if audit and not schema.get("has_organization"):
        out.append(_i("error", "No Organization schema on the homepage",
                      "Add Organization (or MedicalOrganization) JSON-LD so AI resolves RISA as one trusted entity.", "schema"))
    miss = schema.get("sameas_missing") or []
    if audit and len(miss) >= 4:
        out.append(_i("warning", f"sameAs profiles missing ({len(schema.get('sameas_linked') or [])}/8 linked)",
                      "Add sameAs links (LinkedIn, Crunchbase, Wikipedia, YouTube) to the Organization block.", "schema"))
    if crawler and crawler.get("blanket_block"):
        out.append(_i("error", "robots.txt blanket-blocks crawlers",
                      "Remove the `Disallow: /` for `*`; it gates everything downstream.", "crawlers"))

    vis = float(summary.get("visibility_score") or 0)
    if vis < 20:
        out.append(_i("warning", f"Low answer-engine visibility ({vis:.1f}/100)",
                      "Win the unmentioned discovery/comparison prompts in Opportunities; build citable owned pages.", "visibility"))
    sent = summary.get("sentiment_distribution") or {}
    absent = sent.get("absent", 0)
    if absent:
        out.append(_i("notice", f"RISA absent on {absent} prompts",
                      "These are the supply gap — see Prompts › Opportunities for the ranked worklist.", "visibility"))

    if citab and citab.get("pages"):
        weak = [p for p in citab["pages"] if p.get("score", 100) < 50]
        if weak:
            out.append(_i("warning", f"{len(weak)} owned page(s) below citable threshold",
                          "Rewrite with answer-first paragraphs, self-contained passages, and hard stats.", "citability"))
    else:
        out.append(_i("notice", "Page-level citability not scored yet",
                      "Run `python run.py citability` to score risalabs.ai pages on how quotable they are.", "citability"))

    for c in components:
        if not c["measured"]:
            out.append(_i("notice", f"{c['label']} is estimated",
                          c["note"], c["key"]))

    order = {"error": 0, "warning": 1, "notice": 2}
    out.sort(key=lambda x: order.get(x["severity"], 9))
    return out


def _i(severity: str, title: str, fix: str, module: str) -> dict:
    return {"severity": severity, "title": title, "fix": fix, "module": module}


def _snapshot(out_dir: str, summary: dict, geo: float) -> None:
    """Append the composite onto the latest history row (or create one)."""
    hist_path = os.path.join(out_dir, "history", "index.json")
    try:
        with open(hist_path, "r", encoding="utf-8") as f:
            hist = json.load(f)
    except Exception:
        hist = []
    if hist and isinstance(hist[-1], dict):
        hist[-1]["geo_score"] = geo
    else:
        hist.append({
            "ts": datetime.now().isoformat(timespec="seconds"),
            "engines": summary.get("generated_engines", []),
            "prompts_count": summary.get("prompts_count", 0),
            "visibility_score": summary.get("visibility_score", 0),
            "mention_rate": summary.get("mention_rate", 0),
            "average_position": summary.get("average_position"),
            "brand_share_of_voice": round(100 * (summary.get("brand_share_of_voice") or 0), 2),
            "geo_score": geo,
        })
    os.makedirs(os.path.dirname(hist_path), exist_ok=True)
    with open(hist_path, "w", encoding="utf-8") as f:
        json.dump(hist, f, ensure_ascii=False, indent=2)
