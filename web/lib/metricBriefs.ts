// Single source of truth for the one-line "i" briefs attached to every metric.
// Keep each to one plain sentence — what the number means and how it's computed.
// Referenced via BRIEFS.<key> so wording stays consistent across pages.
export const BRIEFS = {
  // composite / overview
  geo_score: "Composite 0–100 score weighting visibility, citability, brand authority, E-E-A-T and schema readiness.",
  visibility: "Rank-weighted presence across the tracked prompt set — higher means RISA appears earlier and more often in AI answers.",
  mention_rate: "Share of tracked prompts where the AI answer names RISA at all (0–100%).",
  sov: "Share of voice — RISA mentions as a percentage of all brand mentions across the answer set.",
  rank: "RISA's position in the competitive set, ranked by share of voice.",
  positive_answers: "Count of prompts where the AI answer frames RISA positively.",
  invisible: "Prompts where the AI answer never mentions RISA — pure whitespace to capture.",
  grade: "Letter grade derived from the composite GEO score (A ≥90, B ≥75, C ≥60, D ≥40, else F).",

  // prompts
  win_rate: "Share of prompts in view where RISA is mentioned by the AI answer.",
  prompts_won: "Number of prompts where RISA appears in the answer.",
  best_topic: "Topic with the highest average visibility for RISA.",
  weakest_persona: "Buyer persona where RISA is least visible — the biggest content gap.",
  avg_position: "Average ordinal position of the RISA mention within answers (lower is better).",
  cited_domains: "Distinct domains the AI cited as sources for this prompt's answer.",

  // citations / authority
  authority_pct: "Owned + earned citations as a share of all citations — the credibility of what AI cites.",
  owned: "Citations pointing to RISA-controlled domains (risalabs.ai and properties).",
  earned: "Citations to independent third-party authorities (press, journals, directories).",
  competitor_cites: "Citations pointing to competitor-controlled domains.",
  social: "Citations to social or community platforms (LinkedIn, Reddit, YouTube).",
  domains: "Distinct domains cited across the tracked answer set.",
  brand_authority: "Off-site authority signals AI engines use for entity recognition (Wikipedia, Wikidata, LinkedIn, sameAs links).",

  // readiness
  site_readiness: "Overall technical readiness of the site for AI crawlers and answer engines (0–100).",
  crawler_access: "Share of priority AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended…) allowed by robots.txt.",
  schema: "Coverage and validity of Schema.org JSON-LD that helps AI understand the entity (0–100).",
  llms_txt: "Presence and quality of an llms.txt file that guides AI systems through the site (0–100).",
  citability: "How quotable the page content is for AI — answer-first structure, self-containment, stats and specificity (0–100).",
  eeat: "Experience, Expertise, Authoritativeness and Trust signals that affect whether AI cites the source (0–100).",
  issues: "Open technical and content issues found in the audit, grouped by severity.",

  // engines / sentiment
  engines_live: "Answer engines currently queried in the pipeline (Claude, and any configured via ENGINES).",
  sentiment: "How AI answers frame RISA — positive, neutral, negative, or absent.",
} as const;

export type BriefKey = keyof typeof BRIEFS;
