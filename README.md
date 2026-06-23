# RISA GEO — Answer Engine Visibility

A Profound-style pipeline that measures and optimizes how **RISA Labs** shows up
when oncology buyers ask AI answer engines (Claude today; ChatGPT / Perplexity /
Gemini pluggable) about prior authorization, denials, and revenue cycle.

This is a ground-up rebuild of the original 3-stage GEO pipeline
(`pipeline1` → `pipeline2/Analysis2` → `DashBoard`), consolidated into one
project, re-pointed at RISA, with the broken metrics fixed and multi-engine +
citation analysis added.

```
 prompts  ──►  Stage 1: COLLECT          ──►  Stage 2: ANALYZE            ──►  DASHBOARD
 (config)      answer engines (Claude+web)      deterministic metrics +          static, Profound-style
               → output/responses.json          Claude enrichment                (Overview / Prompts /
                                                 → summary_metrics.json +          Citations / Competitive /
                                                   normalized/*.csv                Actions)
```

## What it measures (mapped to Profound)

| Profound feature | Here |
|---|---|
| Visibility score / share of voice | `visibility_score` (rank-weighted presence), brand-filtered `share_of_voice` over the tracked set |
| Brand sentiment | per-answer sentiment (Claude), distribution on the Overview |
| Citations (owned / earned / competitor / social) | every cited domain classified; mix + top domains |
| Prompt volume / prompt-level breakdown | the prompt library, tagged by persona / topic / intent |
| Competitive ranking | competitor leaderboard (mentions + presence rate) |
| Topics by audience | rollups `by_topic`, `by_persona`, `by_engine`, `by_intent` |
| Actions | per-prompt recommended GEO actions (Claude) |

## Fixes vs the original pipeline

- **Brand-filtered share of voice.** SoV is computed only over RISA + tracked
  competitors, so it is never polluted by countries / fabrics / prices / generic
  words (the original counted raw entities).
- **Real position & visibility.** `brand_position` is a real rank from
  first-occurrence order; `visibility_score = mean(1/rank)·100`. The original read
  a `positions` field that was never set (so avg_position was always null).
- **Real citation classification** (was mock data in the dashboard only).
- **Multi-engine architecture** (was single-provider, hardcoded OpenAI).
- **One serving layer** (was FastAPI + static CSV split). The dashboard is static.

## Setup

```bash
cd risa-geo
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # add ANTHROPIC_API_KEY
```

## Run

```bash
python run.py prompts          # (re)generate the prompt library from config/risa.yaml
python run.py all              # collect from Claude (+web search) then analyze
python run.py all --limit 5    # quick/cheap smoke run
./serve.sh                     # dashboard at http://localhost:8800
```

Outputs land in `output/`:
`responses.json`, `summary_metrics.json`, `extensive_analysis.json`,
`normalized/{prompt_analysis,competitor_analysis,share_of_voice,citations,recommended_actions,emerging_topics,rollup_*}.csv`.

### No-key / no-LLM mode

`ENRICH=0 python run.py analyze` (or simply having no key) runs the full
**deterministic** path — mentions, position, share of voice, citations — without
any API calls. Useful for testing and for re-analyzing an existing `responses.json`.

## Models

| Stage | Default | Why |
|---|---|---|
| Collection (the answer engine measured) | `claude-opus-4-8` + `web_search` | answers carry real web citations |
| Extraction / enrichment | `claude-haiku-4-5` (structured outputs) | high-volume, cost-sensitive |

Override via `COLLECTION_MODEL` / `EXTRACTION_MODEL` in `.env`.

## Add an engine

1. Write `geo/engines/<name>.py` subclassing `Engine`, returning an `AnswerResult`
   (`text`, `cited_urls`, `searched_urls`).
2. Register it in `geo/engines/__init__.py:get_engine`.
3. Add it to `ENGINES=claude,<name>` in `.env`.

The rest of the pipeline (metrics, analysis, dashboard) is engine-agnostic and
already rolls up `by_engine`.

## Config

Everything brand/domain-specific lives in `config/risa.yaml` — brand aliases,
owned domains, the tracked competitor set (with category/side/aliases), topic
taxonomy, buyer personas + seed queries, and citation-class rules. Swap that file
to track a different brand without touching code.

## Layout

```
risa-geo/
  config/risa.yaml          # brand + competitors + topics + personas (the domain model)
  prompts/risa_prompts.csv  # generated prompt set
  geo/
    config.py  prompts.py  collect.py  analyze.py  metrics.py  extract.py  text_cleaning.py
    engines/   base.py  claude.py  (openai/gemini/perplexity ready to add)
  run.py                    # CLI: prompts | collect | analyze | all
  serve.sh                  # copy output → dashboard, serve
  dashboard/index.html      # self-contained React + Recharts (no build step)
  output/                   # run artifacts
```

> **Brand color:** the dashboard accent is a placeholder indigo (`#4f46e5`).
> Set it from the actual RISA logo before sharing externally.
