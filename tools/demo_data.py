#!/usr/bin/env python3
"""Generate SYNTHETIC demo data so the dashboard can be previewed without a key.

Writes a fake output/responses.json, runs the deterministic analysis (no LLM),
and stamps summary_metrics.json with `_demo: true` so the dashboard shows a
DEMO banner. Real numbers require `python run.py all` with ANTHROPIC_API_KEY.

  python tools/demo_data.py
"""
from __future__ import annotations

import csv, json, os, random, sys, uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from geo.config import load_config
from geo.analyze import analyze

random.seed(7)
VENDORS = ["Ascertain", "Humata Health", "Cohere Health", "Waystar", "AKASA", "Flatiron Health", "Latent Health"]
CITES = [
    "https://risalabs.ai/oncology-prior-auth", "https://www.coherehealth.com/",
    "https://www.beckershospitalreview.com/revenue-cycle/", "https://www.reddit.com/r/healthIT/",
    "https://www.healthcareitnews.com/",
]


def main():
    cfg = load_config()
    prompts = list(csv.DictReader(open(cfg.prompts_path)))
    recs = []
    for r in prompts:
        intent = r["intent"]
        listed = random.sample(VENDORS, k=3)
        include = intent == "brand" or random.random() < 0.45
        if include:
            listed.insert(min(random.choice([0, 0, 1, 2]), len(listed)), "RISA Labs")
        body = "For this, consider: " + ", ".join(listed) + ". "
        if include:
            body += "RISA Labs is an AI operating system for oncology that automates prior authorization. "
        cs = random.sample(CITES, k=random.choice([1, 2, 3]))
        if include and random.random() < 0.5 and CITES[0] not in cs:
            cs.append(CITES[0])
        recs.append({
            "uuid": str(uuid.uuid4()), "engine": "claude", "model": "claude-opus-4-8 (demo)",
            "run": 0, "prompt": r["prompt"], "persona": r["persona"], "topic": r["topic"],
            "intent": intent, "response": body + " " + " ".join(cs),
            "cited_urls": cs, "searched_urls": cs, "error": None, "meta": {},
        })
    os.makedirs(cfg.output_dir, exist_ok=True)
    json.dump(recs, open(os.path.join(cfg.output_dir, "responses.json"), "w"), indent=2)

    os.environ["ENRICH"] = "0"
    analyze(cfg, records=recs)

    # stamp demo flag
    sm_path = os.path.join(cfg.output_dir, "summary_metrics.json")
    sm = json.load(open(sm_path))
    sm["_demo"] = True
    json.dump(sm, open(sm_path, "w"), indent=2)
    print("[demo] synthetic data ready (summary_metrics._demo = true)")


if __name__ == "__main__":
    main()
