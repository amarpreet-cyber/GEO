// Typed shapes for the pipeline output contracts (output/*).

export type Rollup = {
  prompts: number;
  mention_rate: number;
  visibility_score: number;
  avg_position: number | null;
};

export type Summary = {
  brand: string;
  generated_engines: string[];
  prompts_count: number;
  visibility_score: number;
  mention_rate: number;
  average_position: number | null;
  share_of_voice: Record<string, number>;
  brand_share_of_voice: number;
  sentiment_distribution: Record<string, number>;
  citations: { by_class: Record<string, number>; top_domains: { domain: string; citations: number; class: string }[] };
  top_competitors: string[];
  by_topic: Record<string, Rollup>;
  by_persona: Record<string, Rollup>;
  by_engine: Record<string, Rollup>;
  by_intent: Record<string, Rollup>;
  _demo?: boolean;
};

// prompt_analysis.csv rows arrive as strings; parse at use-site.
export type PromptRow = {
  prompt: string;
  engine: string;
  model: string;
  persona: string;
  topic: string;
  intent: string;
  brand_mentioned: string;
  brand_mentions: string;
  brand_position: string;
  brand_sentiment: string;
  brand_sentiment_label: string;
  competitors_present: string; // JSON array string
  n_citations: string;
  cited_domains: string; // JSON array string
  answer_summary: string;
  response: string;
};

export type CompetitorRow = { competitor: string; present: string; presence_rate: string; category: string; side: string };
export type CitationRow = { domain: string; class: string; citations: string };
export type ActionRow = { prompt: string; persona: string; topic: string; action: string };
export type HistoryRun = {
  ts: string;
  engines: string[];
  prompts_count: number;
  visibility_score: number;
  mention_rate: number;
  average_position: number | null;
  brand_share_of_voice: number;
  geo_score?: number;
};

export type SiteAudit = {
  domain: string;
  fetched_at: string;
  readiness_score: number;
  crawler: {
    score: number; robots_exists: boolean; blanket_block: boolean;
    tier1_allowed: string; tier2_allowed: string;
    bots: { name: string; tier: number; allowed: boolean }[];
  };
  llmstxt: { score: number; present: boolean; sections?: number; chars?: number; note?: string };
  schema: {
    score: number; reachable: boolean; jsonld_blocks?: number; has_organization?: boolean;
    types?: string[]; sameas_count?: number; sameas_linked?: string[]; sameas_missing?: string[]; note?: string;
  };
};

// geo_score.json — composite from geo/compose.py.
export type ScoreComponent = {
  key: string; label: string; value: number; weight: number;
  contribution: number; measured: boolean; note: string;
};
export type Issue = { severity: "error" | "warning" | "notice"; title: string; fix: string; module: string };
export type ScoreDoc = {
  generated_at: string;
  geo_score: number;
  grade: string;
  subscores: { visibility?: number; share_of_voice?: number; citability: number; brand: number; eeat: number; technical: number; schema: number; platform: number };
  components?: ScoreComponent[];
  weights?: Record<string, number>;
  issues?: Issue[];
  any_estimated?: boolean;
};

// brand_presence.json — off-site entity scan from geo/brand_presence.py.
export type BrandPresenceDoc = {
  domain: string; fetched_at: string; score: number; platform_score: number;
  wikipedia: { present: boolean; title?: string; url?: string };
  wikidata: { present: boolean; id?: string };
  platforms: { key: string; label: string; weight: number; present: boolean; signal: string }[];
  competitors: { name: string; wikipedia: boolean; wikidata: boolean; entity_score: number }[];
  note: string;
};

// eeat.json — content E-E-A-T scan from geo/eeat.py.
export type EeatDoc = {
  domain: string; fetched_at: string; score: number | null;
  pillars: { experience?: number; expertise?: number; authoritativeness?: number; trust?: number };
  pages: { url: string; title: string; score: number; pillars: Record<string, number>; note: string }[];
  note: string;
};

// site-audit.json — full GEO audit produced by /geo-audit skill.
export type AuditIssue = {
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  detail: string;
  fix: string;
};
export type AuditPage = { url: string; title: string; issues: number; citability_score: number };
export type AuditScore = { score: number; weight: number; label: string };
export type SiteAuditReport = {
  generated_at: string;
  url: string;
  business_type: string;
  pages_analyzed: number;
  geo_score: number;
  grade: string;
  scores: {
    citability: AuditScore; brand: AuditScore; eeat: AuditScore;
    technical: AuditScore; schema: AuditScore; platform: AuditScore;
  };
  issues: AuditIssue[];
  quick_wins: string[];
  pages: AuditPage[];
  strengths: string[];
  summary: string;
};

// citability.json — page-level scoring from geo/citability.py.
export type CitabilityPage = {
  url: string; title: string; words: number; score: number;
  subscores: { answer_first: number; self_contained: number; structure: number; statistics: number; specificity: number };
  stats_found: number; headings: number;
};
export type CitabilityDoc = {
  domain: string; fetched_at: string; score: number; pages_scored: number;
  rubric: Record<string, number>; pages: CitabilityPage[]; note: string;
};

// competitor_profiles.json — from geo/competitor_profile.py.
export type CompetitorProfile = {
  name: string;
  domain: string;
  logo_url: string;
  favicon: string;
  description: string;
  reachable: boolean;
  citability: number;
  has_llmstxt: boolean;
  has_org_schema: boolean;
  geo_signals: { llmstxt: boolean; org_schema: boolean; citability: number };
};
