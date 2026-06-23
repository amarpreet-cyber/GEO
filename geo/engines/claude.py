"""Claude as an answer engine.

Queries the Anthropic Messages API the way a consumer answer engine would:
a single natural-language question, optionally with the web_search server tool
so the answer carries real web citations (what we actually measure visibility in).
"""
from __future__ import annotations

import os
import re

import anthropic
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from .base import Engine, AnswerResult

_URL_RE = re.compile(r"https?://[^\s\]\)>\"']+", re.IGNORECASE)

# Behaves like a helpful consumer assistant answering a research question.
_SYSTEM = (
    "You are a knowledgeable assistant answering a user's question as you would "
    "in a consumer AI assistant. Give a direct, helpful answer. When the question "
    "is about tools, vendors, or products, name specific real companies/products. "
    "Do not refuse to name vendors. If you use the web, ground claims in the sources."
)


class ClaudeEngine(Engine):
    name = "claude"

    def __init__(self, cfg):
        super().__init__(cfg)
        self.model = cfg.collection_model
        self.max_tokens = cfg.collection_max_tokens
        self.use_web = cfg.use_web_search
        self.web_max_uses = cfg.web_search_max_uses
        self._client = anthropic.Anthropic() if self.available else None

    @property
    def available(self) -> bool:
        return bool(os.getenv("ANTHROPIC_API_KEY"))

    def _tools(self):
        if not self.use_web:
            return []
        return [{
            "type": "web_search_20260209",
            "name": "web_search",
            "max_uses": self.web_max_uses,
        }]

    @retry(
        retry=retry_if_exception_type(
            (anthropic.RateLimitError, anthropic.InternalServerError, anthropic.APIConnectionError)
        ),
        wait=wait_exponential(multiplier=2, min=2, max=40),
        stop=stop_after_attempt(5),
        reraise=True,
    )
    def _create(self, messages):
        return self._client.messages.create(
            model=self.model,
            max_tokens=self.max_tokens,
            system=_SYSTEM,
            tools=self._tools(),
            messages=messages,
        )

    def answer(self, prompt: str) -> AnswerResult:
        if not self.available:
            return AnswerResult(self.name, self.model, prompt, "", error="ANTHROPIC_API_KEY not set")

        messages = [{"role": "user", "content": prompt}]
        text_parts: list[str] = []
        cited: list[str] = []
        searched: list[str] = []
        usage = {"input_tokens": 0, "output_tokens": 0}

        try:
            # server-side tool loop: re-send on pause_turn until end_turn
            for _ in range(8):
                resp = self._create(messages)
                usage["input_tokens"] += getattr(resp.usage, "input_tokens", 0) or 0
                usage["output_tokens"] += getattr(resp.usage, "output_tokens", 0) or 0
                self._harvest(resp, text_parts, cited, searched)
                if resp.stop_reason == "pause_turn":
                    messages = messages + [{"role": "assistant", "content": resp.content}]
                    continue
                break
        except Exception as e:  # noqa: BLE001 - record, don't crash the whole run
            return AnswerResult(self.name, self.model, prompt, "\n".join(text_parts).strip(),
                                error=f"{type(e).__name__}: {e}")

        text = "\n".join(p for p in text_parts if p).strip()
        # also pull bare URLs from the prose as a citation fallback
        for u in _URL_RE.findall(text):
            searched.append(u.rstrip(".,);"))

        return AnswerResult(
            engine=self.name, model=self.model, prompt=prompt, text=text,
            cited_urls=_dedupe(cited),
            searched_urls=_dedupe(searched),
            meta={"usage": usage, "web_search": self.use_web},
        )

    @staticmethod
    def _harvest(resp, text_parts, cited, searched):
        for block in resp.content:
            btype = getattr(block, "type", None)
            if btype == "text":
                text_parts.append(block.text)
                for c in (getattr(block, "citations", None) or []):
                    url = getattr(c, "url", None)
                    if url:
                        cited.append(url)
            elif btype == "web_search_tool_result":
                content = getattr(block, "content", None)
                # success => list of web_search_result; error => single object
                if isinstance(content, list):
                    for r in content:
                        url = getattr(r, "url", None)
                        if url:
                            searched.append(url)


def _dedupe(seq):
    seen, out = set(), []
    for x in seq:
        if x and x not in seen:
            seen.add(x)
            out.append(x)
    return out
