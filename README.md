# RISA GEO — Answer Engine Visibility

Track how **RISA Labs** shows up when oncology buyers ask AI answer engines (Claude, Perplexity, ChatGPT, Gemini) about prior authorization, revenue cycle, and competing products. Measure share of voice, rank against competitors, and generate a branded weekly report.

---

> **Architecture note (2026):** the pipeline is now a **single TypeScript codebase** inside the Next.js app (`web/lib/pipeline/`). There is no Python subprocess — `/api/runs` runs every stage in-process, so the whole thing deploys to Vercel as one app. The original Python pipeline (`geo/`, `run.py`) is kept as a reference implementation but is no longer on the critical path.

## What it does

- **Setup wizard** — pick keywords to track (e.g. "Prior Authorization", "Revenue Cycle Management") and competitors to watch (Cohere Health, Myndshft, Flatiron Health, etc.)
- **Pipeline** — generates 200–350 prompts from your keywords, runs them through **Claude + GPT-4o + Gemini** (each with web search) simultaneously, extracts where RISA appears vs competitors
- **Dashboard** — Keywords (visibility per keyword, short-tail/long-tail discovery), Competitors (SoV leaderboard, blind spots, per-competitor GEO scores with logos), Prompts (every tracked question), Readiness (citability, schema, llms.txt, E-E-A-T)
- **Report** — branded PDF-printable report with GEO score, keyword breakdown, competitive landscape, action items
- **Scheduling** — weekly/monthly automatic runs via Vercel Cron; results stored in Firestore

Live at: [risa-geo.vercel.app](https://risa-geo.vercel.app)

---

## Architecture

```
config/risa.yaml          ← brand + topic defaults
web/data/app-config.json  ← wizard config (keywords, competitors, schedule)

TypeScript pipeline (web/lib/pipeline/) — runs in-process, no subprocess
  run.ts                  ← orchestrator (stage dispatch, mirrors run.py)
  config.ts               ← merges config/risa.yaml + web/data/app-config.json + .env
  prompts.ts              ← dynamic prompt generation from wizard keywords (15–25 per keyword)
  engines/{claude,openai,gemini}.ts ← Claude web_search + GPT-4o Responses + Gemini google_search
  collect.ts              ← fans every prompt across all engines (bounded concurrency)
  enrich.ts               ← structured-output sentiment/action extraction (Haiku)
  analyze.ts              ← visibility, SoV, citations, sentiment, citation_urls
  siteAudit.ts            ← crawlers, llms.txt, schema/sameAs
  citability.ts           ← page citability scoring (deterministic)
  brandPresence.ts        ← Wikipedia, Wikidata, social platform scan
  eeat.ts                 ← E-E-A-T content scan (LLM)
  compose.ts              ← composite GEO score (demand 40% + supply 60%, per the GEO paper)
  competitorProfile.ts    ← logo (Clearbit), description (Haiku), citability per competitor
  ../firestore-sync.ts    ← mirrors each run into Firestore (geo_runs/{runId})
  scripts/run-pipeline.ts ← local CLI: `npm run pipeline full`

Next.js dashboard (web/)
  app/api/runs/route.ts   ← POST triggers runStage() in-process; GET returns job status
  app/setup/              ← onboarding: keywords + competitors + schedule
  app/setup/loading/      ← live pipeline progress → auto-redirects to /report
  app/(dashboard)/
    report/               ← branded downloadable report (print to PDF)
    keywords/             ← tracked keywords + AI-discovered topics
    competitors/          ← SoV, blind spots, competitor profiles
    prompts/              ← per-prompt breakdown
    readiness/            ← citability, crawlers, schema, llms.txt, E-E-A-T
  lib/data.ts             ← server-only readers over web/data/output/*
  lib/firebase-admin.ts   ← Firestore server-side init
  lib/firestore.ts        ← run history, config CRUD (React-cached readers)
  middleware.ts           ← setup gate (cookie-based)

Reference only (no longer on the critical path)
  geo/*.py, run.py        ← original Python pipeline the TS above was ported from
```

---

## Quick start

Everything is one Next.js app now — no Python needed.

```bash
cd risa-geo
cp .env.example .env          # add ANTHROPIC_API_KEY (+ OPENAI_API_KEY, GEMINI_API_KEY for multi-engine)
cd web
npm install
npm run dev                   # http://localhost:3000
```

First open → setup wizard → pick keywords + competitors + schedule → pipeline runs in-process → branded report loads automatically.

The pipeline reads its keys from the repo-root `.env` (loaded via `lib/pipeline/env.ts`); `ENGINES=claude,openai,gemini` turns on all three answer engines.

---

## Pipeline stages

Run any stage from the dashboard (`/settings/runs`), or from the CLI:

```bash
cd web
npm run pipeline full              # everything (recommended)
npm run pipeline prompts           # regenerate prompt library from wizard config
npm run pipeline collect -- --limit 25   # ask all engines for the first 25 prompts (API cost)
npm run pipeline analyze           # re-derive metrics from existing responses
npm run pipeline audit             # crawler / llms.txt / schema audit of the brand site
npm run pipeline citability        # score owned pages for quotability
npm run pipeline brand             # Wikipedia / Wikidata / social presence scan
npm run pipeline eeat              # E-E-A-T content scan (LLM)
npm run pipeline compose           # recompute the composite GEO score
npm run pipeline comp-profile      # update competitor logos + GEO scores
npm run pipeline full -- --limit 10  # quick smoke test
```

Under the hood the CLI and the `/api/runs` route both call the same `runStage()` orchestrator. Output is written to `web/data/output/` (what the dashboard reads) and mirrored to Firestore when configured.

The `full` stage always regenerates prompts from `web/data/app-config.json` before collecting, so changing keywords in the wizard and re-running picks them up automatically.

---

## GEO score (research-paper aligned)

The composite follows the GEO paper (Aggarwal et al., 2024) — visibility is `mean(1/rank)` across all prompt answers. Two layers:

- **Demand (40%)** — `visibility` 30% + `share_of_voice` 10%, from live engine responses.
- **Supply (60%)** — `citability` 20% + `brand_authority` 15% + `eeat` 10% + `technical` 8% + `schema` 4% + `platform` 3%.

A brand with no pipeline run scores ~0 on the demand half (correct — nothing has been measured yet), which surfaces "run the pipeline" as the first action.

---

## Prompt generation

Given 8 keywords × 25 templates = ~200 keyword-driven prompts, plus competitor comparisons and persona seed queries. Example for keyword "Prior Authorization":

- *Discovery:* "What are the biggest challenges with prior authorization in community oncology?"
- *Discovery:* "What software automates prior authorization for cancer centers?"
- *Comparison:* "Best AI solutions for prior authorization in community oncology 2026"
- *Brand:* "How does RISA Labs solve prior authorization for oncology practices?"
- *Competitor:* "RISA Labs vs Cohere Health for prior authorization in oncology"

---

## Firestore (optional — enables run history + scheduling)

Add to `.env` (Python pipeline) and `web/.env.local` (Next.js):

```env
# Option A — path to service account JSON
GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json

# Option B — JSON string (recommended for Vercel)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

FIREBASE_PROJECT_ID=rapids-platform
```

Without these vars the app runs entirely from local `output/` files.

**Firestore schema:**
- `/geo_config/current` — wizard config (brand, keywords, competitors, schedule)
- `/geo_runs/{runId}` — full pipeline output per run
- `/geo_runs/{runId}/prompts/{p000}` — per-prompt data

---

## Deployment

```bash
cd web && npx vercel --prod
```

Set `FIREBASE_SERVICE_ACCOUNT` + `FIREBASE_PROJECT_ID` in Vercel env vars.

The `vercel.json` cron hits `/api/cron` every Monday 9am UTC. If the config has `schedule.enabled = true`, it triggers a full pipeline run.

> Note: the Python pipeline runs **locally**. Vercel serves the dashboard and reads results from Firestore. For fully automated cloud scheduling, deploy the pipeline as a Cloud Run job.

---

## Stack

| Layer | Tech |
|---|---|
| Pipeline | Python 3.12, Anthropic SDK, firebase-admin |
| Dashboard | Next.js 14, Tailwind CSS, Recharts, framer-motion |
| Storage | Firestore (runs + config), local JSON files (fallback) |
| Deployment | Vercel (dashboard + cron) |
| Answer engine | Claude opus-4-8 + web_search (primary); OpenAI / Perplexity / Gemini wired, not live |

---

## Metrics measured

| Metric | How |
|---|---|
| **GEO Score** (0–100) | Composite: citability × brand × E-E-A-T × technical × schema × platform |
| **Visibility score** | mean(1/rank) × 100 across all prompts |
| **Share of voice** | Brand-filtered SoV % vs tracked competitors |
| **Mention rate** | % of prompts where RISA appears |
| **Blind spots** | Prompts where competitors appear but RISA doesn't |
| **Citability** | How quotable RISA's pages are (deterministic, no LLM cost) |
| **E-E-A-T** | Experience / Expertise / Authority / Trust via LLM content scan |

---

*RISA Labs · Growth & Sales Operations*
