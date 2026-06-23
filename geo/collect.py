"""Stage 1 — collection. Fan the prompt set across engines, store raw answers."""
from __future__ import annotations

import json
import os
import time
import uuid

from tqdm import tqdm

from .config import AppConfig
from .engines import get_engine
from .prompts import read_prompts_csv


def collect(cfg: AppConfig, limit: int | None = None) -> list[dict]:
    prompts = read_prompts_csv(cfg.prompts_path)
    if limit:
        prompts = prompts[:limit]

    # resolve engines once; warn + skip unavailable ones
    engines = []
    for name in cfg.engines:
        eng = get_engine(name, cfg)
        if eng is None:
            print(f"[collect] engine '{name}' has no adapter — skipping")
        elif not eng.available:
            print(f"[collect] engine '{name}' unavailable (missing key) — skipping")
        else:
            engines.append(eng)
    if not engines:
        raise RuntimeError("No available engines. Set ANTHROPIC_API_KEY and ENGINES.")

    records: list[dict] = []
    total = len(prompts) * len(engines) * cfg.responses_per_prompt
    bar = tqdm(total=total, desc="Collecting answers", unit="ans")

    for row in prompts:
        prompt = row["prompt"]
        for eng in engines:
            for run_i in range(cfg.responses_per_prompt):
                res = eng.answer(prompt)
                records.append({
                    "uuid": str(uuid.uuid4()),
                    "engine": res.engine,
                    "model": res.model,
                    "run": run_i,
                    "prompt": prompt,
                    "persona": row.get("persona", ""),
                    "topic": row.get("topic", ""),
                    "intent": row.get("intent", ""),
                    "response": res.text,
                    "cited_urls": res.cited_urls,
                    "searched_urls": res.searched_urls,
                    "error": res.error,
                    "meta": res.meta,
                })
                bar.update(1)
                if res.error:
                    bar.write(f"[collect] {res.engine} error on '{prompt[:50]}...': {res.error}")
                if cfg.rate_limit_sleep:
                    time.sleep(cfg.rate_limit_sleep)
    bar.close()

    os.makedirs(cfg.output_dir, exist_ok=True)
    out = os.path.join(cfg.output_dir, "responses.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f"[collect] wrote {len(records)} answers -> {out}")
    return records
