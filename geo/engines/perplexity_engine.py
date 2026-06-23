"""Perplexity as an answer engine — OpenAI-compatible chat completions.

Perplexity is citation-native: every answer returns the sources it used, which
is exactly what we measure visibility in. Stdlib-only; key-gated on
PERPLEXITY_API_KEY.
"""
from __future__ import annotations

import json
import os
import urllib.request

from .base import Engine, AnswerResult

_SYSTEM = (
    "Answer the user's question directly as a consumer AI assistant. Name specific real "
    "companies/products when asked about tools or vendors. Ground claims in your sources."
)


class PerplexityEngine(Engine):
    name = "perplexity"

    def __init__(self, cfg):
        super().__init__(cfg)
        self.model = os.getenv("PERPLEXITY_MODEL", "sonar-pro")
        self.key = os.getenv("PERPLEXITY_API_KEY", "")

    @property
    def available(self) -> bool:
        return bool(self.key)

    def answer(self, prompt: str) -> AnswerResult:
        if not self.available:
            return AnswerResult(self.name, self.model, prompt, "", error="PERPLEXITY_API_KEY not set")
        payload = {
            "model": self.model,
            "messages": [{"role": "system", "content": _SYSTEM}, {"role": "user", "content": prompt}],
        }
        req = urllib.request.Request(
            "https://api.perplexity.ai/chat/completions",
            data=json.dumps(payload).encode(),
            headers={"Authorization": f"Bearer {self.key}", "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                data = json.loads(r.read().decode("utf-8", "replace"))
        except Exception as e:  # noqa: BLE001
            return AnswerResult(self.name, self.model, prompt, "", error=f"{type(e).__name__}: {e}")

        text = ""
        try:
            text = data["choices"][0]["message"]["content"]
        except Exception:  # noqa: BLE001
            pass
        cited = data.get("citations") or data.get("search_results") or []
        cited = [c if isinstance(c, str) else c.get("url", "") for c in cited]
        return AnswerResult(self.name, self.model, prompt, (text or "").strip(),
                            cited_urls=_dedupe(cited), searched_urls=_dedupe(cited),
                            meta={"web_search": True})


def _dedupe(seq):
    seen, out = set(), []
    for x in seq:
        if x and x not in seen:
            seen.add(x); out.append(x)
    return out
