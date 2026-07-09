"""Competitor profiles — logo, description, and page citability.

Runs after the analyze stage. For every entity found in the share-of-voice data
(discovered competitors) plus every pre-configured competitor, produces:
  - logo_url  : Clearbit logo URL (no API key, just a URL)
  - favicon   : Google favicon fallback
  - domain    : resolved domain
  - description : 1-sentence description (Claude Haiku, optional)
  - citability  : page citability score (deterministic, no LLM)
  - site_checks : llms.txt + Organization schema presence

Writes output/competitor_profiles.json.
"""
from __future__ import annotations

import json
import os
import re
import urllib.request
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

from .config import AppConfig

_UA = "Mozilla/5.0 (compatible; RISA-GEO/1.0)"

# Known domain map — updated as more competitors appear.
KNOWN_DOMAINS: dict[str, str] = {
    "Cohere Health":        "coherehealth.com",
    "Flatiron Health":      "flatiron.com",
    "Availity":             "availity.com",
    "Waystar":              "waystar.com",
    "Myndshft":             "myndshft.com",
    "Rhyme":                "rhyme.com",
    "CoverMyMeds":          "covermymeds.com",
    "Humata Health":        "humatahealth.com",
    "AKASA":                "akasa.com",
    "ImagineSoftware":      "imaginesoftware.com",
    "Ascertain":            "ascertain.io",
    "Infinitus Systems":    "infinitusai.com",
    "SmarterDx":            "smarterdx.com",
    "RevSyn AI":            "revsynai.com",
    "Plenful":              "plenful.com",
    "Olive AI":             "oliveai.com",
    "Medallion":            "medallion.co",
    "Tegria":               "tegria.com",
    "Verata Health":        "veratahealth.com",
    "Xsolis":               "xsolis.com",
    "Valer":                "valer.ai",
    "Inovalon":             "inovalon.com",
    "Experian Health":      "experianhealth.com",
    "Novu":                 "novu.co",
    "RISA Labs":            "risalabs.ai",
}


def _resolve_domain(name: str, configured_domain: str = "") -> str:
    if configured_domain:
        return configured_domain.replace("https://", "").replace("http://", "").rstrip("/")
    if name in KNOWN_DOMAINS:
        return KNOWN_DOMAINS[name]
    # Heuristic: strip spaces, lowercase, append .com
    slug = re.sub(r"[^a-z0-9]", "", name.lower())
    return f"{slug}.com"


def logo_url(domain: str) -> str:
    """Clearbit logo URL — returns a clean square logo. No API key needed."""
    return f"https://logo.clearbit.com/{domain}"


def favicon_url(domain: str) -> str:
    return f"https://www.google.com/s2/favicons?domain={domain}&sz=64"


def _fetch(url: str, timeout: int = 10) -> tuple[int | None, str | None]:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": _UA})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            ctype = r.headers.get("Content-Type", "")
            if "html" not in ctype and ctype:
                return None, None
            return r.status, r.read(12000).decode("utf-8", "replace")
    except Exception:
        return None, None


class _TextExtractor(HTMLParser):
    SKIP = {"script", "style", "noscript", "svg", "head"}

    def __init__(self):
        super().__init__()
        self.parts: list[str] = []
        self._depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self._depth += 1

    def handle_endtag(self, tag):
        if tag in self.SKIP and self._depth:
            self._depth -= 1

    def handle_data(self, data):
        if not self._depth:
            t = data.strip()
            if t:
                self.parts.append(t)


def _extract_text(html: str) -> str:
    p = _TextExtractor()
    try:
        p.feed(html)
    except Exception:
        pass
    return " ".join(p.parts)[:4000]


def _citability_score(html: str) -> int:
    """Quick citability heuristic (0-100) — same rubric as citability.py."""
    text = _extract_text(html)
    words = len(text.split())
    if words < 50:
        return 0

    # answer-first: starts with a declarative sentence (not a question or marketing word)
    first = text[:200].lower()
    answer_first = 70 if not re.search(r'^(welcome|we are|we\'re|introducing|discover|unlock|transform|revolutionize)', first) else 30

    # statistics: numbers per 1k words
    stat_count = len(re.findall(r'\b\d+[\d,.]*[%$kKmMbB]?\b', text))
    stats = min(100, int((stat_count / max(words, 1)) * 1000 * 10))

    # structure: heading count in HTML
    h_count = len(re.findall(r'<h[1-4]', html, re.IGNORECASE))
    structure = min(100, h_count * 8)

    # self-contained: low pronoun openers
    pronoun_starts = len(re.findall(r'\b(we|our|us|you|your)\b', text[:1000], re.IGNORECASE))
    self_contained = max(0, 100 - pronoun_starts * 5)

    score = int(answer_first * 0.30 + self_contained * 0.25 + structure * 0.20 + stats * 0.15 + 70 * 0.10)
    return min(100, max(0, score))


def _check_llmstxt(domain: str) -> bool:
    _, html = _fetch(f"https://{domain}/llms.txt", timeout=6)
    return html is not None and len(html.strip()) > 20


def _check_org_schema(html: str) -> bool:
    return bool(re.search(r'"@type"\s*:\s*"(Organization|MedicalOrganization)', html, re.IGNORECASE))


def _describe(name: str, domain: str, text: str, cfg: AppConfig) -> str:
    """1-sentence description via Claude Haiku. Returns fallback on any error."""
    if not text or not cfg.enrich:
        return ""
    try:
        import anthropic
        client = anthropic.Anthropic()
        msg = client.messages.create(
            model=cfg.extraction_model,
            max_tokens=80,
            messages=[{
                "role": "user",
                "content": (
                    f"In one concise sentence, what does {name} ({domain}) do in healthcare? "
                    f"Be specific about their product. Website text: {text[:2000]}"
                ),
            }],
        )
        return msg.content[0].text.strip().rstrip(".")
    except Exception:
        return ""


def profile_one(name: str, configured_domain: str, cfg: AppConfig) -> dict:
    domain = _resolve_domain(name, configured_domain)
    base_url = f"https://{domain}"

    status, html = _fetch(base_url)
    html = html or ""

    text = _extract_text(html)
    cit = _citability_score(html) if html else 0
    has_llms = _check_llmstxt(domain)
    has_schema = _check_org_schema(html)

    description = _describe(name, domain, text, cfg)

    return {
        "name": name,
        "domain": domain,
        "logo_url": logo_url(domain),
        "favicon": favicon_url(domain),
        "description": description,
        "reachable": status == 200,
        "citability": cit,
        "has_llmstxt": has_llms,
        "has_org_schema": has_schema,
        "geo_signals": {
            "llmstxt": has_llms,
            "org_schema": has_schema,
            "citability": cit,
        },
    }


def run_competitor_profiles(cfg: AppConfig) -> list[dict]:
    """Profile all competitors in cfg + any in share_of_voice. Writes competitor_profiles.json."""
    sov_path = os.path.join(cfg.output_dir, "normalized", "share_of_voice.csv")
    discovered_names: set[str] = set()
    if os.path.exists(sov_path):
        import csv
        with open(sov_path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                if row.get("entity") and row.get("is_brand", "").lower() != "true":
                    discovered_names.add(row["entity"])

    # Domain map from configured competitors (setup wizard)
    config_domain_map = {c.name: c.domain for c in cfg.competitors}

    # Union of configured + discovered
    all_names: list[str] = []
    seen: set[str] = set()
    for c in cfg.competitors:
        if c.name not in seen:
            all_names.append(c.name)
            seen.add(c.name)
    for n in discovered_names:
        if n not in seen and n.lower() != cfg.brand.name.lower():
            all_names.append(n)
            seen.add(n)

    profiles: list[dict] = []
    for name in all_names:
        print(f"[competitor_profile] profiling {name}...")
        try:
            p = profile_one(name, config_domain_map.get(name, ""), cfg)
            profiles.append(p)
        except Exception as e:
            print(f"[competitor_profile] {name} failed: {e}")
            profiles.append({
                "name": name, "domain": _resolve_domain(name, config_domain_map.get(name, "")),
                "logo_url": logo_url(_resolve_domain(name)), "favicon": favicon_url(_resolve_domain(name)),
                "description": "", "reachable": False, "citability": 0,
                "has_llmstxt": False, "has_org_schema": False,
                "geo_signals": {"llmstxt": False, "org_schema": False, "citability": 0},
            })

    out = os.path.join(cfg.output_dir, "competitor_profiles.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(profiles, f, indent=2)
    print(f"[competitor_profile] wrote {len(profiles)} profiles -> {out}")
    return profiles
