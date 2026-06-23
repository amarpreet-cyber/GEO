"""Pluggable answer-engine layer.

Add a new engine (Perplexity, Gemini, OpenAI, ...) by writing an adapter that
subclasses `Engine` and returns an `AnswerResult`, then registering it in
`get_engine`. The rest of the pipeline is engine-agnostic.
"""
from __future__ import annotations

from .base import Engine, AnswerResult


def get_engine(name: str, cfg) -> Engine | None:
    name = name.strip().lower()
    if name in ("claude", "anthropic"):
        from .claude import ClaudeEngine
        return ClaudeEngine(cfg)
    if name in ("openai", "chatgpt", "gpt"):
        from .openai_engine import OpenAIEngine
        return OpenAIEngine(cfg)
    if name in ("gemini", "google"):
        from .gemini_engine import GeminiEngine
        return GeminiEngine(cfg)
    if name in ("perplexity", "pplx"):
        from .perplexity_engine import PerplexityEngine
        return PerplexityEngine(cfg)
    return None


__all__ = ["Engine", "AnswerResult", "get_engine"]
