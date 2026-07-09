#!/usr/bin/env python3
"""RISA GEO pipeline CLI.

  python run.py prompts            # (re)generate the prompt library from config
  python run.py collect [--limit N]
  python run.py analyze
  python run.py all [--limit N]    # collect -> analyze (the usual one-shot)
  python run.py full               # everything, dependency-ordered
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

from geo.config import load_config, Competitor
from geo.prompts import build_prompt_library, write_prompts_csv


# Run ID injected by the Next.js API so Firestore doc is consistent.
# Falls back to a timestamp so CLI invocations also get a run doc.
def _run_id() -> str:
    if rid := os.getenv("GEO_RUN_ID"):
        return rid
    return f"run_{int(time.time())}"


def cmd_prompts(cfg, args, store=None):
    rows = build_prompt_library(cfg)
    write_prompts_csv(rows, cfg.prompts_path)
    print(f"[prompts] wrote {len(rows)} prompts -> {cfg.prompts_path}")


def cmd_collect(cfg, args, store=None):
    from geo.collect import collect
    if not os.path.exists(cfg.prompts_path):
        cmd_prompts(cfg, args)
    collect(cfg, limit=args.limit)
    if store:
        store.flush_after_stage(args._run_id, cfg.output_dir, "collect")


def cmd_analyze(cfg, args, store=None):
    from geo.analyze import analyze
    analyze(cfg)
    if store:
        store.flush_after_stage(args._run_id, cfg.output_dir, "analyze")


def cmd_audit(cfg, args, store=None):
    from geo.site_audit import site_audit
    site_audit(cfg)
    if store:
        store.flush_after_stage(args._run_id, cfg.output_dir, "audit")


def cmd_citability(cfg, args, store=None):
    from geo.citability import citability
    citability(cfg)
    if store:
        store.flush_after_stage(args._run_id, cfg.output_dir, "citability")


def cmd_brand(cfg, args, store=None):
    from geo.brand_presence import brand_presence
    brand_presence(cfg)
    if store:
        store.flush_after_stage(args._run_id, cfg.output_dir, "brand")


def cmd_eeat(cfg, args, store=None):
    from geo.eeat import eeat
    eeat(cfg)
    if store:
        store.flush_after_stage(args._run_id, cfg.output_dir, "eeat")


def cmd_compose(cfg, args, store=None):
    from geo.compose import compose
    compose(cfg)
    if store:
        store.flush_after_stage(args._run_id, cfg.output_dir, "compose")


def cmd_comp_profile(cfg, args, store=None):
    from geo.competitor_profile import run_competitor_profiles
    run_competitor_profiles(cfg)
    if store:
        store.flush_after_stage(args._run_id, cfg.output_dir, "comp-profile")


def cmd_all(cfg, args, store=None):
    from geo.collect import collect
    from geo.analyze import analyze
    if not os.path.exists(cfg.prompts_path):
        cmd_prompts(cfg, args)
    records = collect(cfg, limit=args.limit)
    analyze(cfg, records=records)
    if store:
        store.flush_after_stage(args._run_id, cfg.output_dir, "all")


def cmd_full(cfg, args, store=None):
    """Everything, dependency-ordered: prompts -> collect -> analyze -> supply-side -> compose -> profiles."""
    cmd_prompts(cfg, args)  # always regenerate from current config (keywords may have changed)
    cmd_all(cfg, args, store)
    cmd_audit(cfg, args, store)
    cmd_citability(cfg, args, store)
    cmd_brand(cfg, args, store)
    cmd_eeat(cfg, args, store)
    cmd_compose(cfg, args, store)
    cmd_comp_profile(cfg, args, store)


def main():
    ap = argparse.ArgumentParser(description="RISA GEO — Answer Engine Visibility")
    ap.add_argument("command", choices=[
        "prompts", "collect", "analyze", "audit", "citability",
        "brand", "eeat", "compose", "all", "full", "comp-profile",
    ])
    ap.add_argument("--limit", type=int, default=None, help="cap number of prompts")
    ap.add_argument("--config", default=None, help="path to config yaml")
    args = ap.parse_args()
    args._run_id = _run_id()

    cfg = load_config(args.config)
    _apply_app_config(cfg)

    # Boot Firestore store (no-op if not configured)
    from geo.firestore import GeoStore
    store = GeoStore()
    if store.enabled:
        store.create_run(args._run_id, args.command)

    dispatch = {
        "prompts": cmd_prompts, "collect": cmd_collect, "analyze": cmd_analyze,
        "audit": cmd_audit, "citability": cmd_citability, "brand": cmd_brand,
        "eeat": cmd_eeat, "compose": cmd_compose, "all": cmd_all, "full": cmd_full,
        "comp-profile": cmd_comp_profile,
    }

    try:
        dispatch[args.command](cfg, args, store if store.enabled else None)
        if store.enabled:
            store.complete_run(args._run_id)
    except Exception as exc:
        if store.enabled:
            store.fail_run(args._run_id, str(exc))
        raise


def _apply_app_config(cfg) -> None:
    """Merge setup-wizard config (web/data/app-config.json) into cfg in place.

    This lets the wizard drive which keywords and competitors the pipeline tracks,
    without touching the YAML.
    """
    # Look relative to this file: risa-geo/web/data/app-config.json
    base = os.path.dirname(os.path.abspath(__file__))
    paths = [
        os.path.join(base, "web", "data", "app-config.json"),
        os.path.join(base, "data", "app-config.json"),  # fallback if run from different cwd
    ]
    app_cfg: dict | None = None
    for p in paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    app_cfg = json.load(f)
                print(f"[config] loaded setup config from {p}")
                break
            except Exception as e:
                print(f"[config] failed to read {p}: {e}")

    if not app_cfg:
        return

    # Override brand
    b = app_cfg.get("brand") or {}
    if b.get("name"):
        cfg.brand.name = b["name"]
    if b.get("domain"):
        cfg.brand.domain = b["domain"]
    if b.get("aliases"):
        cfg.brand.aliases = b["aliases"]

    # Override competitors
    comp_list = app_cfg.get("competitors") or []
    if comp_list:
        cfg.competitors = [
            Competitor(
                name=c["name"],
                category=c.get("category", ""),
                side=c.get("side", "adjacent"),
                aliases=[],
            )
            for c in comp_list
        ]

    # Inject keyword metadata so prompts.py can use it
    kw_list = app_cfg.get("keywords") or []
    if kw_list:
        cfg.topics = [kw["label"] for kw in kw_list]
        cfg.keyword_meta = kw_list


if __name__ == "__main__":
    sys.exit(main())
