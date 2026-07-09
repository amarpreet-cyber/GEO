# RISA GEO — Answer Engine Visibility

Track how **RISA Labs** shows up when oncology buyers ask AI answer engines (Claude, Perplexity, ChatGPT, Gemini) about prior authorization, revenue cycle, and competing products. Measure share of voice, rank against competitors, and generate a branded weekly report.

---

## What it does

- **Setup wizard** — pick keywords to track (e.g. "Prior Authorization", "Revenue Cycle Management") and competitors to watch (Cohere Health, Myndshft, Flatiron Health, etc.)
- **Pipeline** — generates 200–350 prompts from your keywords, runs them through Claude with web search, extracts where RISA appears vs competitors
- **Dashboard** — Keywords (visibility per keyword, short-tail/long-tail discovery), Competitors (SoV leaderboard, blind spots, per-competitor GEO scores with logos), Prompts (every tracked question), Readiness (citability, schema, llms.txt, E-E-A-T)
- **Report** — branded PDF-printable report with GEO score, keyword breakdown, competitive landscape, action items
- **Scheduling** — weekly/monthly automatic runs via Vercel Cron; results stored in Firestore

Live at: [risa-geo.vercel.app](https://risa-geo.vercel.app)

---

## Architecture

```
config/risa.yaml          ← brand + topic defaults
web/data/app-config.json  ← wizard config (keywords, competitors, schedule)

Python pipeline (geo/)
  run.py                  ← CLI entry point
  geo/prompts.py          ← dynamic prompt generation from wizard keywords (15–25 per keyword)
  geo/collect.py          ← Claude + web_search for each prompt
  geo/analyze.py          ← visibility, SoV, citations, sentiment, citation_urls
  geo/competitor_profile.py ← logo (Clearbit), description (Haiku), citability per competitor
  geo/firestore.py        ← syncs each run to Firestore (geo_runs/{runId})
  geo/compose.py          ← composite GEO score (6 factors)
  geo/citability.py       ← page citability scoring (deterministic)
  geo/site_audit.py       ← crawlers, llms.txt, schema
  geo/brand_presence.py   ← Wikipedia, Wikidata, social platform scan
  geo/eeat.py             ← E-E-A-T content scan (LLM)

Next.js dashboard (web/)
  app/setup/              ← onboarding: keywords + competitors + schedule
  app/setup/loading/      ← live pipeline progress → auto-redirects to /report
  app/(dashboard)/
    report/               ← branded downloadable report (print to PDF)
    keywords/             ← tracked keywords + AI-discovered topics
    competitors/          ← SoV, blind spots, competitor profiles
    prompts/              ← per-prompt breakdown
    readiness/            ← citability, crawlers, schema, llms.txt, E-E-A-T
  lib/firebase-admin.ts   ← Firestore server-side init
  lib/firestore.ts        ← run history, config CRUD
  middleware.ts           ← setup gate (cookie-based) + Basic Auth
```

---

## Quick start

### 1. Python pipeline

```bash
cd risa-geo
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — add ANTHROPIC_API_KEY
```

### 2. Next.js dashboard

```bash
cd web
npm install
npm run dev     # http://localhost:3000
```

First open → setup wizard → pick keywords + competitors + schedule → pipeline runs → branded report loads automatically.

---

## Pipeline stages

```bash
python run.py full              # everything (recommended)
python run.py prompts           # regenerate prompt library from wizard config
python run.py collect           # ask Claude for each prompt (API cost)
python run.py analyze           # re-derive metrics from existing responses
python run.py comp-profile      # update competitor logos + GEO scores
python run.py full --limit 10   # quick smoke test
```

Or trigger any stage from the dashboard at `/settings/runs`.

The `full` stage always regenerates prompts from `web/data/app-config.json` before collecting, so changing keywords in the wizard and re-running picks them up automatically.

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
