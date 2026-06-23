"""Stage 2 enrichment — one structured Claude call per answer.

Deterministic signals (mentions, position, share of voice, citations) come from
metrics.py for free. This module adds the qualitative layer Profound surfaces:
brand sentiment, a one-line read of the answer, emerging topics, and the
"how would RISA win this prompt" recommended actions.
"""
from __future__ import annotations

import json

import anthropic
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "brand_present": {"type": "boolean"},
        "brand_sentiment_score": {
            "type": "number",
            "description": "0..1, how favorably the answer positions the brand. 0.5 if not mentioned.",
        },
        "brand_sentiment_label": {"type": "string", "enum": ["negative", "neutral", "positive", "absent"]},
        "brand_sentiment_reasoning": {"type": "string"},
        "answer_summary": {"type": "string", "description": "<=2 sentences: what this answer says re: the topic and who it favors."},
        "emerging_topics": {"type": "array", "items": {"type": "string"}},
        "recommended_actions": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Concrete GEO actions so the brand would be cited/recommended for THIS prompt.",
        },
        "competitor_sentiments": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "name": {"type": "string"},
                    "label": {"type": "string", "enum": ["negative", "neutral", "positive"]},
                },
                "required": ["name", "label"],
            },
        },
    },
    "required": [
        "brand_present", "brand_sentiment_score", "brand_sentiment_label",
        "brand_sentiment_reasoning", "answer_summary", "emerging_topics",
        "recommended_actions", "competitor_sentiments",
    ],
}


class Enricher:
    def __init__(self, cfg):
        self.cfg = cfg
        self.model = cfg.extraction_model
        self.brand = cfg.brand.name
        self._client = anthropic.Anthropic()

    @retry(
        retry=retry_if_exception_type(
            (anthropic.RateLimitError, anthropic.InternalServerError, anthropic.APIConnectionError)
        ),
        wait=wait_exponential(multiplier=2, min=2, max=40),
        stop=stop_after_attempt(5),
        reraise=True,
    )
    def _call(self, system: str, user: str) -> dict:
        resp = self._client.messages.create(
            model=self.model,
            max_tokens=1200,
            system=system,
            messages=[{"role": "user", "content": user}],
            output_config={"format": {"type": "json_schema", "schema": _SCHEMA}},
        )
        text = next((b.text for b in resp.content if getattr(b, "type", None) == "text"), "")
        return json.loads(text)

    def enrich(self, prompt: str, answer: str, brand_mentioned: bool,
               competitors_present: list[str]) -> dict:
        system = (
            f"You are a GEO (generative engine optimization) analyst for the brand '{self.brand}'.\n"
            "You are given a user QUESTION and an AI assistant's ANSWER. Assess how the answer "
            "positions the target brand and competitors, and recommend how the brand could earn "
            "a citation or recommendation for this exact question. Return JSON only.\n"
            "Scoring: 1.0 = answer strongly recommends the brand; 0.7-0.9 favorable mention; "
            "0.4-0.6 neutral/listed; 0.1-0.3 unfavorable; 0.0 explicitly negative. "
            "If the brand is absent, brand_sentiment_label='absent' and score=0.5."
        )
        user = json.dumps({
            "brand": self.brand,
            "question": prompt,
            "answer": answer,
            "brand_mentioned_detected": brand_mentioned,
            "competitors_detected_in_answer": competitors_present,
        }, ensure_ascii=False)
        try:
            return self._call(system, user)
        except Exception as e:  # noqa: BLE001
            return {
                "brand_present": brand_mentioned,
                "brand_sentiment_score": 0.5,
                "brand_sentiment_label": "absent" if not brand_mentioned else "neutral",
                "brand_sentiment_reasoning": f"enrichment failed: {type(e).__name__}: {e}",
                "answer_summary": "",
                "emerging_topics": [],
                "recommended_actions": [],
                "competitor_sentiments": [],
            }
