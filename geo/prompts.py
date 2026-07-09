"""Build the GEO prompt library — questions a buyer would ask an AI answer engine.

intent:
  discovery  - "what/which/how" — buyer doesn't know vendors yet (most valuable)
  comparison - "best / alternatives / vs" — buyer is shortlisting
  brand      - names the brand directly — measures branded answer quality
"""
from __future__ import annotations

import csv
from .config import AppConfig

# Persona assignments for dynamic prompts (category → persona_id).
_CATEGORY_PERSONA: dict[str, str] = {
    "core": "cro",
    "clinical": "cmo",
    "tech": "cio",
    "custom": "ceo",
}

# Per-keyword prompt templates.
# {kw} = keyword label, {brand} = brand name, {comp} = top competitor name.
_DISCOVERY_TEMPLATES = [
    "What are the biggest challenges with {kw} in community oncology?",
    "How do oncology practices handle {kw} today?",
    "What software automates {kw} for cancer centers?",
    "How can an oncology group reduce costs related to {kw}?",
    "How does AI improve {kw} in oncology?",
    "Why do community oncology practices struggle with {kw}?",
    "What does good {kw} look like at a high-performing oncology practice?",
    "What is the ROI of investing in {kw} technology for oncology?",
    "How do payers and providers disagree on {kw} in oncology?",
    "What are the regulatory requirements around {kw} in cancer care?",
    "How do staffing shortages affect {kw} at community cancer centers?",
    "What metrics should an oncology CFO track for {kw}?",
    "How do large oncology networks like OneOncology approach {kw}?",
    "What are common mistakes oncology practices make with {kw}?",
    "How has {kw} changed in oncology over the last five years?",
]

_COMPARISON_TEMPLATES = [
    "Best AI solutions for {kw} in community oncology 2026",
    "Top vendors for {kw} in cancer centers",
    "Which companies are leading in {kw} automation for oncology?",
    "How do different {kw} platforms compare for community cancer centers?",
    "What should oncology practices look for when buying a {kw} solution?",
    "Build vs buy: should oncology practices build their own {kw} system?",
]

_BRAND_TEMPLATES = [
    "How does {brand} solve {kw} for oncology practices?",
    "What results has {brand} delivered for {kw}?",
    "Is {brand} a good fit for {kw} at a community cancer center?",
    "How does {brand}'s approach to {kw} differ from competitors?",
]


def _keyword_prompts(
    kw_label: str, kw_category: str, brand: str, competitors: list[str]
) -> list[tuple[str, str, str, str]]:
    """Return (prompt, persona, topic, intent) tuples for a single keyword."""
    persona = _CATEGORY_PERSONA.get(kw_category, "cro")
    rows: list[tuple[str, str, str, str]] = []

    for t in _DISCOVERY_TEMPLATES:
        rows.append((t.format(kw=kw_label.lower(), brand=brand), persona, kw_label, "discovery"))

    for t in _COMPARISON_TEMPLATES:
        rows.append((t.format(kw=kw_label.lower(), brand=brand), "ceo", kw_label, "comparison"))

    for t in _BRAND_TEMPLATES:
        rows.append((t.format(kw=kw_label.lower(), brand=brand), persona, kw_label, "brand"))

    # Competitor comparison prompts anchored to this keyword
    for comp in competitors[:3]:
        rows.append((
            f"{brand} vs {comp} for {kw_label.lower()} in oncology",
            "cio", kw_label, "comparison",
        ))

    return rows


def _competitor_prompts(brand: str, competitors: list[str]) -> list[tuple[str, str, str, str]]:
    """Return cross-competitor comparison prompts."""
    rows: list[tuple[str, str, str, str]] = []
    for comp in competitors[:6]:
        rows.append((
            f"How does {comp} compare to {brand} for oncology prior authorization?",
            "cio", "competitive comparison", "comparison",
        ))
    if len(competitors) >= 2:
        vs = " vs ".join(competitors[:3])
        rows.append((
            f"{vs} — which is best for community oncology revenue cycle?",
            "ceo", "competitive comparison", "comparison",
        ))
    return rows


def build_prompt_library(cfg: AppConfig) -> list[dict]:
    """Build prompts from cfg.

    When the setup wizard config has been merged into cfg (keywords as cfg.topics,
    competitors updated), this generates prompts dynamically from those choices.
    Falls back to persona seed queries if no keyword-based prompts exist.
    """
    rows: list[dict] = []
    seen: set[str] = set()

    def add(prompt: str, persona: str, topic: str, intent: str) -> None:
        key = prompt.strip().lower()
        if key in seen or not prompt.strip():
            return
        seen.add(key)
        rows.append({
            "id": f"p{len(rows) + 1:03d}",
            "prompt": prompt.strip(),
            "persona": persona,
            "topic": topic,
            "intent": intent,
        })

    brand = cfg.brand.name
    competitors = [c.name for c in cfg.competitors]

    # --- Keyword-driven prompts (the main source when wizard is configured) ---
    kw_list = cfg.keyword_meta or []
    if kw_list:
        for kw in kw_list:
            for p, persona, topic, intent in _keyword_prompts(kw["label"], kw.get("category", "core"), brand, competitors):
                add(p, persona, topic, intent)
    elif cfg.topics:
        # Fallback: treat cfg.topics as keyword labels with "core" category
        for topic_label in cfg.topics:
            for p, persona, topic, intent in _keyword_prompts(topic_label, "core", brand, competitors):
                add(p, persona, topic, intent)

    # --- Competitor comparison prompts ---
    for p, persona, topic, intent in _competitor_prompts(brand, competitors):
        add(p, persona, topic, intent)

    # --- Persona seed queries (from YAML, always included for baseline coverage) ---
    for persona_obj in cfg.personas:
        for q in persona_obj.queries:
            add(q, persona_obj.id, "", "discovery")

    return rows


def write_prompts_csv(rows: list[dict], path: str) -> None:
    import os
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["id", "prompt", "persona", "topic", "intent"])
        w.writeheader()
        w.writerows(rows)


def read_prompts_csv(path: str) -> list[dict]:
    with open(path, "r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))
