"""Page-level citability — how quotable RISA's own pages are to an answer engine.

Ports the geo-citability rubric into a deterministic, network-only scorer (no
LLM, no cost): fetch the brand's homepage, follow a few same-domain links, and
score each page 0-100 on five sub-signals an AI weighs when deciding to quote a
passage:

    answer-first      0.30   a direct, declarative lead (not a marketing tease)
    self-containment  0.25   passages that stand alone (low pronoun-opener rate)
    structure         0.20   headings + lists the model can lift cleanly
    statistics        0.15   hard numbers (%, $, figures) per 1k words
    specificity       0.10   named entities / proper nouns (stand-in for unique)

Writes output/citability.json. Pure stdlib (urllib + re).
"""
from __future__ import annotations

import json
import os
import re
import urllib.request
from datetime import datetime
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

from .config import AppConfig

_UA = "Mozilla/5.0 (compatible; RISA-GEO-Citability/1.0)"
_MAX_PAGES = 6


def _fetch(url: str, timeout: int = 12):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": _UA})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            ctype = r.headers.get("Content-Type", "")
            if "html" not in ctype and ctype:
                return None, None
            return r.status, r.read().decode("utf-8", "replace")
    except Exception:
        return None, None


class _Extractor(HTMLParser):
    """Pull visible text, headings, list items, and same-domain links."""

    SKIP = {"script", "style", "noscript", "svg", "head", "nav", "footer"}

    def __init__(self):
        super().__init__()
        self.text: list[str] = []
        self.h2 = 0
        self.h3 = 0
        self.li = 0
        self.links: list[str] = []
        self.title = ""
        self._skip = 0
        self._tag = ""

    def handle_starttag(self, tag, attrs):
        self._tag = tag
        if tag in self.SKIP:
            self._skip += 1
        if tag == "h2":
            self.h2 += 1
        elif tag == "h3":
            self.h3 += 1
        elif tag == "li":
            self.li += 1
        elif tag == "a":
            for k, v in attrs:
                if k == "href" and v:
                    self.links.append(v)

    def handle_endtag(self, tag):
        if tag in self.SKIP and self._skip:
            self._skip -= 1

    def handle_data(self, data):
        if self._skip:
            return
        s = data.strip()
        if not s:
            return
        if self._tag == "title" and not self.title:
            self.title = s
        self.text.append(s)


_PRONOUN_OPENERS = ("it ", "this ", "that ", "they ", "these ", "those ", "he ", "she ", "we ", "our ", "its ")
_STAT = re.compile(r"(\$\s?\d[\d,.]*|\d[\d,.]*\s?%|\b\d{2,}\b|\b\d+\.\d+\b)")
_PROPER = re.compile(r"\b[A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*\b")


def _score_page(url: str, html: str) -> dict | None:
    p = _Extractor()
    try:
        p.feed(html)
    except Exception:
        return None
    blob = " ".join(p.text)
    words = blob.split()
    n_words = len(words)
    if n_words < 120:
        return None  # thin / non-content page — don't score it

    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", blob) if len(s.strip()) > 24]
    lead = " ".join(words[:60]).lower()

    # answer-first: lead is declarative + on-topic, not a pronoun/CTA tease
    answer = 100.0
    if lead.startswith(_PRONOUN_OPENERS):
        answer -= 35
    if not _STAT.search(" ".join(words[:90])) and "is " not in lead and "are " not in lead:
        answer -= 25
    if any(w in lead for w in ("welcome", "sign up", "get started", "book a demo", "contact us")):
        answer -= 25
    answer = max(0.0, answer)

    # self-containment: share of sentences that DON'T open with a bare pronoun
    if sentences:
        bad = sum(1 for s in sentences if s.lower().startswith(_PRONOUN_OPENERS))
        self_contained = 100 * (1 - bad / len(sentences))
    else:
        self_contained = 40.0

    # structure: headings + lists relative to length
    per_k = 1000 / max(n_words, 1)
    headings = (p.h2 + p.h3) * per_k
    lists = p.li * per_k
    structure = min(100.0, 55 * min(1.0, headings / 6) + 45 * min(1.0, lists / 10))

    # statistics density
    stats_n = len(_STAT.findall(blob))
    statistics = min(100.0, 100 * min(1.0, (stats_n * per_k) / 8))

    # specificity: distinct proper-noun phrases (entity richness)
    proper = len(set(_PROPER.findall(blob)))
    specificity = min(100.0, 100 * min(1.0, (proper * per_k) / 12))

    score = round(
        0.30 * answer + 0.25 * self_contained + 0.20 * structure
        + 0.15 * statistics + 0.10 * specificity
    )
    return {
        "url": url,
        "title": (p.title or url)[:90],
        "words": n_words,
        "score": score,
        "subscores": {
            "answer_first": round(answer),
            "self_contained": round(self_contained),
            "structure": round(structure),
            "statistics": round(statistics),
            "specificity": round(specificity),
        },
        "stats_found": stats_n,
        "headings": p.h2 + p.h3,
    }


def _discover(base: str, html: str) -> list[str]:
    """Homepage + a few same-domain content links."""
    host = urlparse(base).netloc
    p = _Extractor()
    try:
        p.feed(html)
    except Exception:
        pass
    seen, urls = set(), [base]
    skip_frag = ("#", "mailto:", "tel:", ".pdf", ".png", ".jpg", ".svg", "/privacy", "/terms", "/cookie")
    for href in p.links:
        u = urljoin(base, href.split("#")[0])
        if urlparse(u).netloc != host or u in seen or u == base:
            continue
        if any(s in u.lower() for s in skip_frag):
            continue
        seen.add(u)
        urls.append(u)
        if len(urls) >= _MAX_PAGES:
            break
    return urls


def citability(cfg: AppConfig) -> dict:
    base = "https://" + cfg.brand.domain.rstrip("/")
    print(f"[citability] scoring owned pages under {base}…")
    status, html = _fetch(base)
    pages: list[dict] = []
    if status == 200 and html:
        for url in _discover(base, html):
            st, body = _fetch(url) if url != base else (status, html)
            if st == 200 and body:
                sc = _score_page(url, body)
                if sc:
                    pages.append(sc)
    pages.sort(key=lambda x: x["score"], reverse=True)
    score = round(sum(p["score"] for p in pages) / len(pages)) if pages else 0

    out = {
        "domain": base,
        "fetched_at": datetime.now().isoformat(timespec="seconds"),
        "score": score,
        "pages_scored": len(pages),
        "rubric": {
            "answer_first": 0.30, "self_contained": 0.25, "structure": 0.20,
            "statistics": 0.15, "specificity": 0.10,
        },
        "pages": pages,
        "note": "deterministic (no-LLM) page citability — uniqueness uses entity richness as a stand-in",
    }
    os.makedirs(cfg.output_dir, exist_ok=True)
    with open(os.path.join(cfg.output_dir, "citability.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"[citability] mean score {score}/100 across {len(pages)} pages")
    return out
