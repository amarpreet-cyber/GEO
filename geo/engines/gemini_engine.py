"""Gemini (Google AI) as an answer engine — generateContent + google_search.

Mirrors what surfaces in Google's AI Overviews / AI Mode. Stdlib-only;
key-gated on GEMINI_API_KEY (or GOOGLE_API_KEY).
"""
from __future__ import annotations

import json
import os
import urllib.request

from .base import Engine, AnswerResult

_SYSTEM = (
    "Answer the user's question directly as a consumer AI assistant. Name specific real "
    "companies/products when asked about tools or vendors. Use Google Search to ground claims."
)


class GeminiEngine(Engine):
    name = "gemini"

    def __init__(self, cfg):
        super().__init__(cfg)
        self.model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        self.key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""

    @property
    def available(self) -> bool:
        return bool(self.key)

    def answer(self, prompt: str) -> AnswerResult:
        if not self.available:
            return AnswerResult(self.name, self.model, prompt, "", error="GEMINI_API_KEY not set")
        url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
               f"{self.model}:generateContent?key={self.key}")
        payload = {
            "system_instruction": {"parts": [{"text": _SYSTEM}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "tools": [{"google_search": {}}],
        }
        req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                     headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                data = json.loads(r.read().decode("utf-8", "replace"))
        except Exception as e:  # noqa: BLE001
            return AnswerResult(self.name, self.model, prompt, "", error=f"{type(e).__name__}: {e}")

        text_parts, cited = [], []
        for cand in data.get("candidates", []):
            for part in cand.get("content", {}).get("parts", []):
                if part.get("text"):
                    text_parts.append(part["text"])
            meta = cand.get("groundingMetadata", {})
            for chunk in meta.get("groundingChunks", []) or []:
                uri = (chunk.get("web") or {}).get("uri")
                if uri:
                    cited.append(uri)
        text = "\n".join(p for p in text_parts if p).strip()
        return AnswerResult(self.name, self.model, prompt, text,
                            cited_urls=_dedupe(cited), searched_urls=_dedupe(cited),
                            meta={"web_search": True})


def _dedupe(seq):
    seen, out = set(), []
    for x in seq:
        if x and x not in seen:
            seen.add(x); out.append(x)
    return out
