"""OpenAI (ChatGPT) as an answer engine — Responses API + web_search tool.

Stdlib-only (urllib) so it adds no dependency. Key-gated on OPENAI_API_KEY;
when the key is absent the engine reports unavailable and collect.py skips it.
"""
from __future__ import annotations

import json
import os
import urllib.request

from .base import Engine, AnswerResult

_SYSTEM = (
    "You are a helpful assistant answering a user's question as a consumer AI assistant would. "
    "Give a direct answer and name specific real companies/products when asked about tools or vendors. "
    "Use the web and ground claims in sources."
)


class OpenAIEngine(Engine):
    name = "openai"

    def __init__(self, cfg):
        super().__init__(cfg)
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o")
        self.key = os.getenv("OPENAI_API_KEY", "")

    @property
    def available(self) -> bool:
        return bool(self.key)

    def answer(self, prompt: str) -> AnswerResult:
        if not self.available:
            return AnswerResult(self.name, self.model, prompt, "", error="OPENAI_API_KEY not set")
        payload = {
            "model": self.model,
            "instructions": _SYSTEM,
            "input": prompt,
            "tools": [{"type": "web_search"}],
        }
        req = urllib.request.Request(
            "https://api.openai.com/v1/responses",
            data=json.dumps(payload).encode(),
            headers={"Authorization": f"Bearer {self.key}", "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                data = json.loads(r.read().decode("utf-8", "replace"))
        except Exception as e:  # noqa: BLE001
            return AnswerResult(self.name, self.model, prompt, "", error=f"{type(e).__name__}: {e}")

        text_parts, cited = [], []
        for item in data.get("output", []):
            for c in item.get("content", []) if isinstance(item.get("content"), list) else []:
                if c.get("type") in ("output_text", "text"):
                    text_parts.append(c.get("text", ""))
                    for ann in c.get("annotations", []) or []:
                        if ann.get("url"):
                            cited.append(ann["url"])
        text = data.get("output_text") or "\n".join(p for p in text_parts if p).strip()
        return AnswerResult(self.name, self.model, prompt, text.strip(),
                            cited_urls=_dedupe(cited), searched_urls=_dedupe(cited),
                            meta={"web_search": True})


def _dedupe(seq):
    seen, out = set(), []
    for x in seq:
        if x and x not in seen:
            seen.add(x); out.append(x)
    return out
