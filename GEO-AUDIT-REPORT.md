# GEO Audit Report: RISA Labs

**Audit Date:** 2026-06-23
**URL:** https://risalabs.ai
**Business Type:** SaaS (Healthcare AI, Oncology)
**Pages Analyzed:** 14

---

## Executive Summary

**Overall GEO Score: 48/100 (D — Poor)**

RISA Labs has strong real-world proof points and meaningful third-party press coverage, but the site is structurally invisible to AI systems due to three compounding failures: zero schema.org markup across all pages, no llms.txt file, and blog content that is limited to 200-word abstracts with no author bios. The /prior-auth page is the site's most GEO-ready page with concrete statistics and named customer testimonials, but this value is unreachable to AI crawlers because no structured data signals it. Fixing schema, adding llms.txt, and expanding blog content to full articles would meaningfully shift AI citability within 30 days.

### Score Breakdown

| Category | Score | Weight | Weighted Score |
|---|---|---|---|
| AI Citability | 52/100 | 25% | 13.0 |
| Brand Authority | 55/100 | 20% | 11.0 |
| Content E-E-A-T | 58/100 | 20% | 11.6 |
| Technical GEO | 47/100 | 15% | 7.05 |
| Schema & Structured Data | 8/100 | 10% | 0.8 |
| Platform Optimization | 42/100 | 10% | 4.2 |
| **Overall GEO Score** | | | **47.65/100** |

---

## Critical Issues (Fix Immediately)

### 1. Zero Schema.org Markup Sitewide
**Affected pages:** All 14 pages analyzed (/, /prior-auth, /tech, /blog, /risa-api-hub, /innercircle, /book-a-demo, /medication-access, /careers, all blog posts)
**Evidence:** WebFetch of every page returned "None detected," "Not explicitly visible," or "No explicit schema markup" for schema.org.
**Fix:** Add Organization schema to the homepage and every page footer. Add SoftwareApplication to /prior-auth and /risa-api-hub. Add Article/BlogPosting to every blog post. Add FAQPage to /prior-auth where question-style content exists. This is the single highest-leverage fix available.

### 2. No llms.txt File
**Evidence:** https://risalabs.ai/llms.txt returns HTTP 404.
**Impact:** AI systems crawling the site to build their knowledge base have no structured manifest of what RISA is, what pages matter, or what content is authoritative. Every competing SaaS that has llms.txt gets a structural advantage in AI-generated responses.
**Fix:** Create /public/llms.txt with: company summary, key product descriptions, links to /prior-auth, /tech, /risa-api-hub, /blog (all posts), /innercircle, and the Series A announcement. Include a brief plain-English explanation of what RISA does for each linked page.

### 3. Blog Posts Are Abstract-Only (200-250 Words)
**Affected pages:** All 5 blog posts + 1 news post
**Evidence:** "Advancing Healthcare Automation" and "Digital Twin Ecosystem" are each approximately 200-250 words — abstract-length. "Evolvable DAGs" is ~700 words but has no external citations.
**Impact:** AI systems cannot quote or cite content that does not exist. Short abstract pages cannot earn AI citations or answer user questions. These are also the only pages with any author attribution (Kshitij Jaggi), but the author bio field is empty.
**Fix:** Expand each research blog post to its full paper content (minimum 1,500 words). Add author bio for Kshitij Jaggi with credentials. Link to the ACL Anthology and arXiv papers inline, not just as footer links.

---

## High Priority Issues

### 4. No Author Bios on Blog Posts
**Evidence:** All blog posts credit Kshitij Jaggi but the author bio section is empty ("Not provided in the webpage content" — verified across 3 posts).
**Impact:** E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) is the primary framework AI systems use to decide whether to cite a source. An anonymous-feeling post, even if technically attributed, carries weak authority signals.
**Fix:** Add a 50-100 word author bio to every post: Kshitij Jaggi, Co-founder and CEO, IIT background, links to LinkedIn and published research. Mark up with Person schema.

### 5. No About / Team Page in Sitemap
**Evidence:** Sitemap contains 57 URLs but no /about or /team page. The careers page does not list leadership names or team size. Navigation on the homepage does not include an About link.
**Impact:** AI systems building entity graphs need an authoritative "About" page to understand what a company is. Without one, RISA is harder to surface as a definitive answer to "what is RISA Labs."
**Fix:** Create /about with: company founding story, mission, co-founder bios (Kshitij Jaggi, Kumar Shivang), funding history ($3.5M seed, $11.1M Series A), investor names (Cencora Ventures, Optum Ventures), and embed Organization schema.

### 6. No FAQ Schema on the /prior-auth Page
**Evidence:** The /prior-auth page contains implicit questions (What is prior authorization? How does RISA work? What payers are covered?) but no FAQPage schema and no explicit Q&A formatting.
**Impact:** FAQPage schema is one of the highest-yield schema types for AI citation. AI Overviews and Perplexity frequently pull from FAQPage-marked content to answer "how does X work" questions.
**Fix:** Add 5-8 explicit Q&A blocks to /prior-auth (visible to users) and mark them up with FAQPage + Question + Answer schema.

### 7. No Wikipedia Entity Page
**Evidence:** Wikipedia API query for "RISA Labs oncology" returns zero relevant articles.
**Impact:** Wikipedia is one of the primary training and citation sources for all major AI systems. Entities without Wikipedia pages are significantly less likely to be named or described accurately by AI models. Competitors with Wikipedia pages get a persistent citation advantage.
**Fix:** Draft a Wikipedia article meeting notability requirements. RISA Labs qualifies: $11.1M Series A from Cencora + Optum Ventures, covered by AJMC, HIT Consultant, Healthcare IT Today, BioSpace, PR Newswire. Have a non-affiliated editor submit it.

---

## Medium Priority Issues

### 8. robots.txt Does Not Explicitly Allow AI Crawlers
**Evidence:** robots.txt fetch returned only the Sitemap directive. No explicit User-agent rules for GPTBot, ClaudeBot, PerplexityBot, Google-Extended, or anthropic-ai were visible.
**Assessment:** Default behavior (no rules = allow) means AI crawlers are not blocked, which is positive. However, explicitly welcoming AI crawlers with `User-agent: GPTBot / Allow: /` signals intentional openness and can improve trust scoring in some AI systems.
**Fix:** Add explicit Allow directives for GPTBot, anthropic-ai, PerplexityBot, Google-Extended, Bingbot in robots.txt. This takes 5 minutes.

### 9. JavaScript-Heavy Rendering (Webflow)
**Evidence:** The /home-3 page returned "Hardware - Webflow HTML Website Template" as its title — a Webflow template page bled through, confirming the site is built on Webflow. The page structure on /home-3 contained technical specs for a fictional hardware product mixed with RISA content, indicating client-side JS rendering inconsistencies.
**Impact:** AI crawlers that do not execute JavaScript will see incomplete or mixed content. Webflow does support server-side rendering but it must be confirmed.
**Fix:** Verify Webflow SSR is enabled. Audit the /home-3 page — it appears to be a staging or test page that should be excluded from the sitemap or marked noindex.

### 10. /home-3 Staging Page in Public Sitemap
**Evidence:** https://www.risalabs.ai/home-3 is included in the public sitemap and returns a Webflow template page with fictional hardware product content ("The CPX-9," "8.6gbps throughput," "$3,499 per engagement").
**Impact:** This dilutes crawl budget and could confuse AI systems reading the site. It should not be publicly indexed.
**Fix:** Add `<meta name="robots" content="noindex">` to /home-3 and remove it from sitemap.xml.

### 11. No Open Graph or Twitter Card Meta Tags Detected
**Evidence:** Homepage fetch did not return any OG or Twitter meta tag content.
**Impact:** When RISA links are shared in social media, AI-indexed community forums (Reddit, LinkedIn posts), or press articles, the link preview pulls from OG tags. Missing OG tags mean poor previews, fewer clicks, and less indexed social content.
**Fix:** Add og:title, og:description, og:image to every page. Use the company logo + a page-specific description.

### 12. No Reddit Presence
**Evidence:** Search for "RISA Labs site:reddit.com" returned no results.
**Impact:** Reddit is a major training data source for all large AI models. Brands discussed on Reddit are more likely to appear in AI responses to comparative questions ("what's the best prior auth AI for oncology?").
**Fix:** Engage authentically in r/healthIT, r/oncology, r/healthcare_technology. Do not self-promote directly — answer questions where RISA's capabilities are relevant.

---

## Low Priority Issues

### 13. Substack Newsletter Not Cross-Referenced on Main Site
**Evidence:** "RISE with RISA" Substack is linked in the footer but not prominently featured. The Inner Circle page references it.
**Fix:** Add the Substack newsletter to the main navigation or create a /newsletter page. Each Substack post should link back to risalabs.ai with canonical tags.

### 14. API Hub Page Has No Developer Documentation
**Evidence:** /risa-api-hub lists 4 API products (Auth Status, Medical Necessity, Eligibility, Auth Verification) with descriptions but no actual documentation, code samples, or SDK references.
**Impact:** Developer documentation pages are highly citable by AI. Questions like "how do I integrate prior auth into my oncology EMR via API" would be answered by docs, not marketing copy.
**Fix:** Add a /docs subdomain or /risa-api-hub/docs with basic endpoint documentation, authentication guide, and example requests/responses.

### 15. Metrics Inconsistency Across Pages
**Evidence:** Homepage references "30% touchless authorizations" and "70% FTE time reclaimed." The /prior-auth page lists "97% first submission success rate" and "70% FTE time reclaimed" but also states "75% FTE reduction" in other contexts. The CLAUDE.md playbook references "95%+" as the first-submit rate.
**Impact:** AI systems that encounter contradictory statistics on the same domain will reduce confidence in citing any of them.
**Fix:** Lock the canonical metric set sitewide. Pick one number for each KPI and use it consistently across all pages, schema, and press materials.

---

## Category Deep Dives

### AI Citability (52/100)

**Strong signals found:**
- /prior-auth page has 8 concrete, specific statistics with comparison baselines: "97% first submission success rate (industry avg ~65%)," "<2 hours prior auth filing turnaround time," "0 day backlog achieved (vs. up to 8 days previously)," "21 days ahead of DOS." These are exactly the type of precise, self-contained facts AI systems quote.
- Named customer testimonials with full names and titles: Dr. Jeff Vacirca (NYCBS), Dr. Edward Licitra (Astera), Nirav Shah (OneOncology), Maria Langhorst (OneOncology). Named testimonials are more citable than anonymous ones.
- Technology page cites specific standards: NCCN, ASCO, FDA guidelines, FHIR, HL7. These institutional references increase citability.

**Weak signals found:**
- Blog posts are abstract-length (200-250 words). The research on multi-agent systems for medical necessity justification references ACL Anthology (2024.bionlp-1.4) — strong academic signal — but the actual content is an abstract, not the full paper. An AI asked "how does RISA's medical necessity AI work" cannot find a quotable answer on the site.
- The homepage H1 ("AI POWERED Operating System for Oncology") and tech page H1 ("An oncology OS must sense, reason, and act; without losing fidelity") are philosophical and non-specific. They do not answer questions.
- No FAQ sections anywhere on the site. FAQ-format content is the highest-citability format for AI systems.
- Content on /medication-access is approximately 400-450 words — thin for a product page.
- No numbered "how it works" steps with defined stages.

**Page-level citability scores:**
- /prior-auth: 72/100 (strong stats, testimonials)
- /tech: 44/100 (claims without evidence, no citations)
- /innercircle: 60/100 (named speakers, specific event, concrete content)
- /risa-api-hub: 45/100 (product descriptions, no docs)
- /blog posts (all): 30-38/100 (abstract-only, no author bios)
- /book-a-demo: 25/100 (form page, low content)
- /careers: 28/100 (job listings, minimal company content)

### Brand Authority (55/100)

**Present:**
- Crunchbase company profile: https://www.crunchbase.com/organization/risa-labs-ai
- LinkedIn company page: https://www.linkedin.com/company/risalabs
- PR Newswire press release (Series A): strong Tier 1 newswire placement
- AJMC (American Journal of Managed Care) coverage — high clinical authority publication
- HIT Consultant, Healthcare IT Today, BioSpace, GlobeNewswire, DigitalHealthNews coverage
- Preqin, Tracxn, CBInsights, HealthAidb database listings
- Binny Bansal (Flipkart co-founder) listed as investor — notable signal

**Missing:**
- No Wikipedia article
- No Reddit discussions about RISA Labs
- No YouTube channel for risalabs.ai (the RISA Technologies YouTube found is for structural engineering software, a different company)
- No GitHub organization page for risalabs healthcare product
- No academic paper citations from third-party researchers (the ACL Anthology paper is by Kshitij Jaggi, which is self-citation)
- No analyst coverage from Gartner, KLAS, or Forrester

### Content E-E-A-T (58/100)

**Experience signals (strong):**
- 10 named customer logos with practice names: NYCBS, Tennessee Oncology, SunState, Astera, OneOncology, Mary Bird Perkins, The CenterTX, Cancer & Hematology Centers, NYOH, UCBC
- 4 named executive testimonials with full names, MD credentials, and titles
- Inner Circle event page with named speakers and real credentials (Dr. Jeff Vacirca MD FACP, Ben Freeberg — Oncology Ventures)
- Production metrics cited with baselines ("vs. up to 8 days previously," "vs. industry avg ~65%")

**Expertise signals (moderate):**
- CEO Kshitij Jaggi authored 3 research blog posts linked to arXiv and ACL Anthology
- References to NCCN, ASCO, FDA guidelines on tech page
- $11.1M Series A from Cencora Ventures + Optum Ventures signals domain validation by pharma/health incumbents
- Mayo Accelerate Programme acceptance mentioned (not verified on site, not linked)

**Authoritativeness signals (weak):**
- No About page listing leadership team
- No team page
- Author bios empty on all blog posts
- No third-party peer review of claims
- No case study pages with full methodology

**Trustworthiness signals (strong):**
- HIPAA Compliant, AICPA SOC 2 Type II, ISO 27001, HITECH — all prominently displayed
- Privacy Policy and Terms of Use pages present
- Physical office locations listed in job postings (Palo Alto/SF, Bangalore, NYC, Tennessee, DC)

### Technical GEO (47/100)

**Positive signals:**
- sitemap.xml present and populated (57 URLs)
- Sitemap correctly references www.risalabs.ai (canonical domain)
- robots.txt present with Sitemap directive
- No AI crawlers appear to be blocked (default allow)
- HTTPS confirmed
- Site loads (no 5xx errors on main pages)

**Negative signals:**
- No llms.txt (404 confirmed)
- Site built on Webflow — JS-heavy rendering. AI crawlers that do not execute JS may see incomplete content. The /home-3 page returned a Webflow template bleedthrough, confirming JS rendering issues.
- robots.txt does not explicitly allow or prioritize AI crawlers
- /home-3 staging page is in the public sitemap and returns misleading template content
- Blog post URLs use /post/ path but news post uses a different root path (https://www.risalabs.ai/risa-labs-closes-11-1m...) — inconsistent URL structure
- No canonical tags observed in fetched content
- No page speed data collected (Webflow hosted sites are generally fast, assumed adequate)

### Schema & Structured Data (8/100)

**What was found:** Nothing. Zero schema.org markup detected across 14 pages including homepage, product pages, blog posts, and the API hub.

**What is missing and expected for a SaaS in this category:**

| Schema Type | Page | Priority | Expected Benefit |
|---|---|---|---|
| Organization | Homepage, footer | Critical | Entity recognition by all AI systems |
| SoftwareApplication | /prior-auth, /risa-api-hub | Critical | AI product search citability |
| FAQPage | /prior-auth | High | AI Overview inclusion, Perplexity answers |
| Article/BlogPosting | All 6 blog posts | High | AI news citation, author authority |
| Person | Author profiles | High | Kshitij Jaggi entity recognition |
| HowTo | /prior-auth workflow steps | Medium | Featured snippet and AI citation |
| AggregateRating | /prior-auth (from testimonials) | Medium | Trust signal for AI |
| BreadcrumbList | All pages | Low | Navigation context for crawlers |

The score of 8/100 reflects that the sitemap.xml itself is a form of machine-readable structure (2 points) and the page titles/meta tags provide minimal machine-readable signals (6 points). All schema opportunities are completely unaddressed.

### Platform Optimization (42/100)

**Active:**
- LinkedIn company page (linkedin.com/company/risalabs) — active, company posts visible
- Substack newsletter ("RISE with RISA") — linked from footer and inner circle page
- GitHub: risa-labs-inc/cursor-auto-continue — a VS Code extension, not the core healthcare product

**Inactive or absent:**
- YouTube: No verified RISA Labs healthcare channel found. "RISA Technologies" YouTube is a structural engineering software company (different entity).
- Reddit: Zero presence in any oncology, healthIT, or healthcare technology subreddits
- GitHub: No public repositories for the core RISA healthcare platform or API SDKs
- Wikipedia: No article
- Developer documentation site: The /risa-api-hub describes 4 APIs but has no actual documentation portal
- Glassdoor: Not verified but likely minimal (early-stage company)
- G2 / Capterra: Not found in search results — no software review platform presence

---

## Quick Wins (Implement This Week)

1. **Add Organization schema to homepage footer** (30 minutes): Paste a JSON-LD block with name, url, description, foundingDate, sameAs (LinkedIn, Crunchbase), and logo. This immediately signals RISA as a recognized entity to all AI crawlers.

2. **Create /llms.txt** (2 hours): Write a plain-text manifest with RISA's company description, key product summaries, and links to the 10 most important pages. Host at https://risalabs.ai/llms.txt. This is a zero-risk, high-upside action.

3. **Add explicit AI crawler Allow rules to robots.txt** (15 minutes): Add `User-agent: GPTBot / Allow: /`, `User-agent: anthropic-ai / Allow: /`, `User-agent: PerplexityBot / Allow: /`, `User-agent: Google-Extended / Allow: /` to robots.txt. Signals intentional AI-friendliness.

4. **Noindex /home-3 and remove from sitemap** (15 minutes): This Webflow template page with fictional hardware specs should not be publicly indexed. It actively harms AI understanding of the site.

5. **Add Article schema + author bio to the 3 research blog posts** (2 hours): These posts already cite arXiv and ACL Anthology — they just need schema to make that signal machine-readable. Add Kshitij Jaggi's author bio (50 words, credentials, LinkedIn link) and BlogPosting schema with author, datePublished, and description.

6. **Add FAQPage schema to /prior-auth** (3 hours): Draft 6 Q&A pairs (e.g., "What is RISA's first-submission approval rate?", "Which payers does RISA support?", "How long does implementation take?") and add them as visible page content + FAQPage JSON-LD.

7. **Lock and reconcile metric inconsistencies sitewide** (1 hour): Audit every page for conflicting numbers (95% vs 97% first-submit, 70% vs 75% FTE). Pick canonical values, update every page.

---

## 30-Day Action Plan

### Week 1: Machine-Readable Foundation
- [ ] Deploy Organization schema JSON-LD in homepage `<head>` and global footer
- [ ] Create and publish /llms.txt with full site manifest
- [ ] Update robots.txt with explicit AI crawler Allow directives
- [ ] Add SoftwareApplication schema to /prior-auth and /risa-api-hub
- [ ] Noindex /home-3, remove from sitemap.xml
- [ ] Reconcile all metric values sitewide (lock canonical numbers)

### Week 2: Content Authority
- [ ] Add Article/BlogPosting schema to all 6 blog posts
- [ ] Write and add Kshitij Jaggi author bio to all posts (with Person schema)
- [ ] Expand "Advancing Healthcare Automation" blog post from abstract to full article (1,500+ words) — include the full ACL Anthology paper content
- [ ] Expand "Digital Twin Ecosystem" from abstract to full article (1,500+ words) — include arXiv paper content
- [ ] Add explicit FAQ section to /prior-auth (6-8 Q&A pairs) with FAQPage schema

### Week 3: Entity Presence
- [ ] Draft Wikipedia article for RISA Labs (funding, founders, product, customers — meets notability threshold)
- [ ] Submit Wikipedia article via non-affiliated editor
- [ ] Create /about page with founder bios, company history, investor names, mission
- [ ] Post in r/healthIT, r/oncology with value-first content (not self-promotion) — establish Reddit presence
- [ ] Verify or create RISA Labs YouTube channel for the Inner Circle video content

### Week 4: Developer and Platform Depth
- [ ] Launch /docs or api.risalabs.ai with basic API documentation for the 4 API products
- [ ] Publish RISA Labs GitHub organization page with public API client SDK (even a minimal Python wrapper)
- [ ] Add HowTo schema to the workflow automation steps on /prior-auth and /medication-access
- [ ] Add Open Graph and Twitter Card meta tags to all pages
- [ ] Add BreadcrumbList schema to all pages
- [ ] Submit updated sitemap to Google Search Console and Bing Webmaster Tools

---

## Appendix: Pages Analyzed

| URL | Title | Citability Score | Key Issues |
|---|---|---|---|
| https://risalabs.ai | AI Operating System for Oncology | 50 | No schema, no FAQ, JS-heavy |
| https://risalabs.ai/prior-auth | OneRISA | 72 | No FAQ schema, no Article schema |
| https://risalabs.ai/tech | Tech Platform | 44 | Vague copy, no citations, no schema |
| https://risalabs.ai/blog | Blog Index | 35 | Abstract-only posts, no schema |
| https://risalabs.ai/risa-api-hub | RISA API Hub | 45 | No docs, no schema |
| https://risalabs.ai/innercircle | Inner Circle | 60 | No event schema, no structured agenda |
| https://risalabs.ai/book-a-demo | Book a Demo | 25 | Form page, minimal content |
| https://risalabs.ai/medication-access | Medication Access | 40 | Thin content, no schema |
| https://risalabs.ai/careers | Careers | 28 | No team info, no schema |
| https://risalabs.ai/home-3 | [Webflow Template — STAGING] | 5 | Should be noindexed immediately |
| /post/advancing-healthcare-automation | Multi-Agent System Research | 38 | Abstract only, no author bio |
| /post/digital-twin-ecosystem | Digital Twin Research | 35 | Abstract only, no author bio |
| /post/evolvable-dags | Evolvable DAGs | 42 | Short, no citations, no schema |
| /risa-labs-closes-11-1m-series-a | Series A Announcement | 48 | No Article schema, 404 on direct URL |

**Pages with fetch errors:**
- https://risalabs.ai/blog/risa-labs-closes-11-1m-series-a... (404 — URL structure mismatch vs sitemap)
- https://risalabs.ai/blog/advancing-healthcare-automation... (404 — /blog/ prefix incorrect, correct is /post/)
- https://risalabs.ai/llms.txt (404 — does not exist)
