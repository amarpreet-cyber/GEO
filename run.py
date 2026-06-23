#!/usr/bin/env python3
"""RISA GEO pipeline CLI.

  python run.py prompts            # (re)generate the prompt library from config
  python run.py collect [--limit N]
  python run.py analyze
  python run.py all [--limit N]    # collect -> analyze (the usual one-shot)
"""
from __future__ import annotations

import argparse
import sys

from geo.config import load_config
from geo.prompts import build_prompt_library, write_prompts_csv


def cmd_prompts(cfg, args):
    rows = build_prompt_library(cfg)
    write_prompts_csv(rows, cfg.prompts_path)
    print(f"[prompts] wrote {len(rows)} prompts -> {cfg.prompts_path}")


def cmd_collect(cfg, args):
    from geo.collect import collect
    import os
    if not os.path.exists(cfg.prompts_path):
        cmd_prompts(cfg, args)
    collect(cfg, limit=args.limit)


def cmd_analyze(cfg, args):
    from geo.analyze import analyze
    analyze(cfg)


def cmd_audit(cfg, args):
    from geo.site_audit import site_audit
    site_audit(cfg)


def cmd_citability(cfg, args):
    from geo.citability import citability
    citability(cfg)


def cmd_brand(cfg, args):
    from geo.brand_presence import brand_presence
    brand_presence(cfg)


def cmd_eeat(cfg, args):
    from geo.eeat import eeat
    eeat(cfg)


def cmd_compose(cfg, args):
    from geo.compose import compose
    compose(cfg)


def cmd_all(cfg, args):
    from geo.collect import collect
    from geo.analyze import analyze
    import os
    if not os.path.exists(cfg.prompts_path):
        cmd_prompts(cfg, args)
    records = collect(cfg, limit=args.limit)
    analyze(cfg, records=records)


def cmd_full(cfg, args):
    """Everything, dependency-ordered: collect -> analyze -> supply-side -> compose."""
    cmd_all(cfg, args)
    cmd_audit(cfg, args)
    cmd_citability(cfg, args)
    cmd_brand(cfg, args)
    cmd_eeat(cfg, args)
    cmd_compose(cfg, args)


def main():
    ap = argparse.ArgumentParser(description="RISA GEO — Answer Engine Visibility")
    ap.add_argument("command", choices=[
        "prompts", "collect", "analyze", "audit", "citability",
        "brand", "eeat", "compose", "all", "full",
    ])
    ap.add_argument("--limit", type=int, default=None, help="cap number of prompts")
    ap.add_argument("--config", default=None, help="path to config yaml")
    args = ap.parse_args()

    cfg = load_config(args.config)
    {"prompts": cmd_prompts, "collect": cmd_collect, "analyze": cmd_analyze,
     "audit": cmd_audit, "citability": cmd_citability, "brand": cmd_brand,
     "eeat": cmd_eeat, "compose": cmd_compose, "all": cmd_all, "full": cmd_full}[args.command](cfg, args)


if __name__ == "__main__":
    sys.exit(main())
