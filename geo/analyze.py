"""Stage 2 — analysis. responses.json -> summary_metrics.json + normalized CSVs."""
from __future__ import annotations

import json
import os
from collections import Counter

import pandas as pd
from tqdm import tqdm

from . import metrics as M
from .config import AppConfig
from .extract import Enricher


def _stub_enrich(brand_mentioned: bool) -> dict:
    """Neutral enrichment used when the LLM enrichment is disabled/unavailable."""
    return {
        "brand_present": brand_mentioned,
        "brand_sentiment_score": 0.5,
        "brand_sentiment_label": "neutral" if brand_mentioned else "absent",
        "brand_sentiment_reasoning": "",
        "answer_summary": "",
        "emerging_topics": [],
        "recommended_actions": [],
        "competitor_sentiments": [],
    }


def _load_responses(cfg: AppConfig) -> list[dict]:
    with open(os.path.join(cfg.output_dir, "responses.json"), "r", encoding="utf-8") as f:
        return json.load(f)


def analyze(cfg: AppConfig, records: list[dict] | None = None) -> dict:
    rows = records if records is not None else _load_responses(cfg)
    rows = [r for r in rows if not r.get("error")]  # drop failed answers
    os.makedirs(cfg.normalized_dir, exist_ok=True)

    use_enrich = cfg.enrich and bool(os.getenv("ANTHROPIC_API_KEY"))
    enricher = Enricher(cfg) if use_enrich else None
    if not use_enrich:
        print("[analyze] enrichment OFF (no key or ENRICH=0) — deterministic metrics only")

    # 1. deterministic signals + enrichment, per response
    for r in tqdm(rows, desc="Analyzing answers", unit="ans"):
        text = r.get("response", "") or ""
        hits = M.entity_hits(text, cfg)
        r["_hits"] = hits
        r["_brand_position"] = M.brand_position(hits, cfg.brand.name)
        comps_present = list(hits["competitors"].keys())
        if enricher:
            enr = enricher.enrich(r["prompt"], text, hits["brand"]["mentioned"], comps_present)
        else:
            enr = _stub_enrich(hits["brand"]["mentioned"])
        r["_enrich"] = enr
        if cfg.rate_limit_sleep:
            import time
            time.sleep(cfg.rate_limit_sleep)

    # 2. aggregate metrics
    sov = M.share_of_voice(rows, cfg)
    citations = M.citation_summary(rows, cfg)
    leaderboard = M.competitor_leaderboard(rows, cfg)
    sentiment_counts = Counter(
        (r["_enrich"].get("brand_sentiment_label") or "absent") for r in rows
    )

    summary = {
        "brand": cfg.brand.name,
        "generated_engines": sorted({r["engine"] for r in rows}),
        "prompts_count": len(rows),
        "visibility_score": M.visibility_score(rows),
        "mention_rate": M.mention_rate(rows),
        "average_position": M.avg_position(rows),
        "share_of_voice": sov,
        "brand_share_of_voice": sov.get(cfg.brand.name, 0.0),
        "sentiment_distribution": dict(sentiment_counts),
        "citations": citations,
        "top_competitors": [c["competitor"] for c in leaderboard[:5]],
        "by_topic": M.rollup(rows, "topic"),
        "by_persona": M.rollup(rows, "persona"),
        "by_engine": M.rollup(rows, "engine"),
        "by_intent": M.rollup(rows, "intent"),
    }
    _write_json(os.path.join(cfg.output_dir, "summary_metrics.json"), summary)

    # 3. normalized CSVs ----------------------------------------------------
    self_write_prompt_analysis(cfg, rows)
    _write_csv(os.path.join(cfg.normalized_dir, "competitor_analysis.csv"), leaderboard)
    _write_csv(
        os.path.join(cfg.normalized_dir, "share_of_voice.csv"),
        [{"entity": k, "share": v, "is_brand": k == cfg.brand.name} for k, v in sov.items()],
    )
    _write_csv(os.path.join(cfg.normalized_dir, "citations.csv"), citations["top_domains"])

    # Full citation URLs — preserves the actual URLs so the UI can show clickable links.
    _write_citation_urls(cfg, rows)

    actions = []
    emerging = []
    for r in rows:
        for a in r["_enrich"].get("recommended_actions", []) or []:
            actions.append({"prompt": r["prompt"], "persona": r["persona"],
                            "topic": r["topic"], "action": a})
        for t in r["_enrich"].get("emerging_topics", []) or []:
            emerging.append({"prompt": r["prompt"], "topic": t})
    _write_csv(os.path.join(cfg.normalized_dir, "recommended_actions.csv"), actions)
    _write_csv(os.path.join(cfg.normalized_dir, "emerging_topics.csv"), emerging)

    for seg in ("topic", "persona", "engine", "intent"):
        rollup_rows = [{"segment": k, **v} for k, v in summary[f"by_{seg}"].items()]
        _write_csv(os.path.join(cfg.normalized_dir, f"rollup_{seg}.csv"), rollup_rows)

    # 4. extensive (per-prompt narrative)
    extensive = [{
        "prompt": r["prompt"],
        "engine": r["engine"],
        "persona": r["persona"],
        "topic": r["topic"],
        "brand_mentioned": r["_hits"]["brand"]["mentioned"],
        "brand_position": r["_brand_position"],
        "summary": r["_enrich"].get("answer_summary", ""),
        "sentiment_label": r["_enrich"].get("brand_sentiment_label"),
        "sentiment_reasoning": r["_enrich"].get("brand_sentiment_reasoning", ""),
        "recommended_actions": r["_enrich"].get("recommended_actions", []),
    } for r in rows]
    _write_json(os.path.join(cfg.output_dir, "extensive_analysis.json"), extensive)

    _snapshot_history(cfg, summary)

    print(f"[analyze] visibility={summary['visibility_score']}  "
          f"mention_rate={summary['mention_rate']}%  "
          f"brand_SoV={round(summary['brand_share_of_voice']*100,1)}%  "
          f"-> {cfg.output_dir}")
    return summary


def _snapshot_history(cfg: AppConfig, summary: dict) -> None:
    """Append this run's headline metrics to output/history/index.json for trends."""
    from datetime import datetime
    hist_dir = os.path.join(cfg.output_dir, "history")
    os.makedirs(hist_dir, exist_ok=True)
    idx_path = os.path.join(hist_dir, "index.json")
    runs = []
    if os.path.exists(idx_path):
        try:
            runs = json.load(open(idx_path))
        except Exception:
            runs = []
    runs.append({
        "ts": datetime.now().isoformat(timespec="seconds"),
        "engines": summary["generated_engines"],
        "prompts_count": summary["prompts_count"],
        "visibility_score": summary["visibility_score"],
        "mention_rate": summary["mention_rate"],
        "average_position": summary["average_position"],
        "brand_share_of_voice": round(summary["brand_share_of_voice"] * 100, 2),
    })
    _write_json(idx_path, runs)


def self_write_prompt_analysis(cfg: AppConfig, rows: list[dict]) -> None:
    out = []
    for r in rows:
        enr = r["_enrich"]
        hits = r["_hits"]
        cited_domains = sorted({
            M.classify_citation(u, cfg)[0]
            for u in (r.get("cited_urls") or r.get("searched_urls") or [])
            if M.classify_citation(u, cfg)[0]
        })
        out.append({
            "prompt": r["prompt"],
            "engine": r["engine"],
            "model": r["model"],
            "persona": r["persona"],
            "topic": r["topic"],
            "intent": r["intent"],
            "brand_mentioned": hits["brand"]["mentioned"],
            "brand_mentions": hits["brand"]["count"],
            "brand_position": r["_brand_position"],
            "brand_sentiment": enr.get("brand_sentiment_score"),
            "brand_sentiment_label": enr.get("brand_sentiment_label"),
            "competitors_present": json.dumps(list(hits["competitors"].keys())),
            "n_citations": len(r.get("cited_urls") or r.get("searched_urls") or []),
            "cited_domains": json.dumps(cited_domains),
            "answer_summary": enr.get("answer_summary", ""),
            "response": r.get("response", ""),
        })
    _write_csv(os.path.join(cfg.normalized_dir, "prompt_analysis.csv"), out)
    # convenience copy at top level (dashboard reads this)
    _write_csv(os.path.join(cfg.output_dir, "prompt_analysis.csv"), out)


def _write_json(path: str, obj) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def _write_csv(path: str, rows: list[dict]) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    pd.DataFrame(rows).to_csv(path, index=False)


def _url_title(url: str) -> str:
    """Best-effort readable title from a URL path — no network call."""
    from urllib.parse import urlparse
    path = urlparse(url).path.rstrip("/")
    slug = path.split("/")[-1] if "/" in path else path
    # strip extension
    slug = slug.rsplit(".", 1)[0] if "." in slug else slug
    # kebab / underscore to spaces, title-case
    title = slug.replace("-", " ").replace("_", " ").strip().title()
    return title or url


def _write_citation_urls(cfg: AppConfig, rows: list[dict]) -> None:
    """Write normalized/citation_urls.csv — one row per URL citation.

    Columns: url, domain, klass, title, prompt, engine, persona, topic
    Preserves full URLs so the UI can show clickable citation links.
    """
    seen: set[str] = set()
    out: list[dict] = []
    for r in rows:
        urls = r.get("cited_urls") or r.get("searched_urls") or []
        for u in urls:
            dom, klass = M.classify_citation(u, cfg)
            if not dom:
                continue
            key = u + "|||" + r["prompt"]
            if key in seen:
                continue
            seen.add(key)
            out.append({
                "url": u,
                "domain": dom,
                "class": klass,
                "title": _url_title(u),
                "prompt": r.get("prompt", ""),
                "engine": r.get("engine", ""),
                "persona": r.get("persona", ""),
                "topic": r.get("topic", ""),
            })
    _write_csv(os.path.join(cfg.normalized_dir, "citation_urls.csv"), out)
    print(f"[analyze] wrote {len(out)} citation URLs")
