"""Build the RISA prompt library (the 'prompt set' we track visibility across).

A prompt = a natural-language question a buyer would type into an answer engine.
Each is tagged with persona + topic + intent so the dashboard can roll up
visibility by audience, by theme, and by funnel stage.

intent:
  discovery  - "what/which/how" — buyer doesn't know vendors yet (most valuable)
  comparison - "best / alternatives / vs" — buyer is shortlisting
  brand      - names RISA directly — measures branded answer quality
"""
from __future__ import annotations

import csv
from .config import AppConfig

# Curated prompts beyond the persona seed queries, for topic + intent breadth.
# (prompt, persona_id, topic, intent)
EXTRA_PROMPTS: list[tuple[str, str, str, str]] = [
    # --- discovery, topic-led ---
    ("What software automates prior authorization for oncology practices?", "cio", "oncology prior authorization", "discovery"),
    ("How can a cancer center get to touchless prior authorization?", "ceo", "touchless prior auth", "discovery"),
    ("How do oncology practices secure prior auth before the date of service?", "cro", "date-of-service authorization", "discovery"),
    ("What causes prior authorization denials in chemotherapy and how do you prevent them?", "cmo", "denial management and appeals", "discovery"),
    ("How do oncology groups keep prior auth submissions aligned with changing payer policies?", "cro", "payer policy alignment", "discovery"),
    ("How do practices improve first-pass claim approval rates in medical oncology?", "cro", "first-pass / first-submission approval", "discovery"),
    ("What is auth-to-cash and how do oncology practices close the gap?", "cfo", "auth-to-cash", "discovery"),
    ("How can oncology practices verify eligibility and benefits faster before treatment?", "cro", "eligibility and benefits verification", "discovery"),
    ("How do you manage buy-and-bill and infusion drug reimbursement in oncology?", "cfo", "buy-and-bill / infusion drug economics", "discovery"),
    ("How should a health system govern and monitor AI used in revenue cycle?", "cio", "AI operationalization and governance in healthcare", "discovery"),

    # --- comparison / shortlist ---
    ("Best AI prior authorization vendors for community oncology in 2026", "ceo", "prior authorization automation", "comparison"),
    ("Top AI tools to reduce prior authorization denials in oncology", "cro", "denial management and appeals", "comparison"),
    ("Best revenue cycle AI platforms for oncology practices", "cro", "revenue cycle leakage / revenue integrity", "comparison"),
    ("AI prior authorization software that integrates with Flatiron and Epic", "cio", "AI operationalization and governance in healthcare", "comparison"),
    ("Cohere Health vs Humata Health vs other prior authorization AI for oncology", "cio", "prior authorization automation", "comparison"),
    ("Alternatives to manual prior authorization teams in oncology", "cfo", "FTE reduction in oncology operations", "comparison"),
    ("Which prior authorization AI works best for infusion and chemotherapy drugs?", "cmo", "oncology prior authorization", "comparison"),

    # --- brand-aware (answer quality + correctness when RISA is named) ---
    ("What is RISA Labs and what does it do for oncology practices?", "ceo", "prior authorization automation", "brand"),
    ("Is RISA Labs a good fit for community oncology prior authorization?", "cro", "oncology prior authorization", "brand"),
    ("How does RISA Labs reduce prior authorization staffing costs?", "cfo", "FTE reduction in oncology operations", "brand"),
    ("Does RISA Labs integrate with oncology EHRs and payer portals?", "cio", "AI operationalization and governance in healthcare", "brand"),
    ("RISA Labs vs Ascertain vs Humata Health for oncology prior authorization", "cio", "prior authorization automation", "brand"),
]


def build_prompt_library(cfg: AppConfig) -> list[dict]:
    rows: list[dict] = []
    seen: set[str] = set()

    def add(prompt: str, persona: str, topic: str, intent: str):
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

    # 1. persona seed queries (discovery, in the buyer's voice)
    for p in cfg.personas:
        for q in p.queries:
            add(q, p.id, "", "discovery")
    # 2. curated topic/comparison/brand expansion
    for prompt, persona, topic, intent in EXTRA_PROMPTS:
        add(prompt, persona, topic, intent)

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
