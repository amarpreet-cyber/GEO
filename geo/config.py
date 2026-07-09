"""Configuration: merges config/risa.yaml (brand/domain model) with .env (runtime)."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any

import yaml
from dotenv import load_dotenv

load_dotenv()


# ---- env helpers ----------------------------------------------------------
def _s(key: str, default: str) -> str:
    v = os.getenv(key)
    return v if v not in (None, "") else default


def _i(key: str, default: int) -> int:
    v = os.getenv(key)
    return int(v) if v not in (None, "") else default


def _f(key: str, default: float) -> float:
    v = os.getenv(key)
    return float(v) if v not in (None, "") else default


def _b(key: str, default: bool) -> bool:
    v = os.getenv(key)
    if v in (None, ""):
        return default
    return str(v).strip().lower() in ("1", "true", "yes", "y", "on")


def _list(key: str, default: list[str]) -> list[str]:
    v = os.getenv(key)
    if v in (None, ""):
        return default
    return [s.strip() for s in v.split(",") if s.strip()]


@dataclass
class Brand:
    name: str
    aliases: list[str]
    domain: str
    owned_domains: list[str]
    positioning: str
    proof_metrics: dict[str, str]
    trust_anchors: list[str]


@dataclass
class Competitor:
    name: str
    category: str
    side: str
    aliases: list[str] = field(default_factory=list)
    domain: str = ""

    def all_names(self) -> list[str]:
        return [self.name, *self.aliases]


@dataclass
class Persona:
    id: str
    title: str
    pain: str
    queries: list[str]


@dataclass
class AppConfig:
    brand: Brand
    competitors: list[Competitor]
    topics: list[str]
    personas: list[Persona]
    citation_social: list[str]
    # runtime
    engines: list[str]
    collection_model: str
    extraction_model: str
    responses_per_prompt: int
    enrich: bool
    use_web_search: bool
    web_search_max_uses: int
    collection_max_tokens: int
    rate_limit_sleep: float
    prompts_path: str
    output_dir: str
    keyword_meta: list = field(default_factory=list)  # injected from app-config.json

    # convenience -----------------------------------------------------------
    @property
    def normalized_dir(self) -> str:
        return os.path.join(self.output_dir, "normalized")

    def competitor_by_name(self) -> dict[str, Competitor]:
        """canonical-name (lowercased alias) -> Competitor, for fast lookup."""
        idx: dict[str, Competitor] = {}
        for c in self.competitors:
            for n in c.all_names():
                idx[n.strip().lower()] = c
        return idx


def load_config(config_path: str | None = None) -> AppConfig:
    config_path = config_path or _s("CONFIG_PATH", "./config/risa.yaml")
    with open(config_path, "r", encoding="utf-8") as f:
        raw: dict[str, Any] = yaml.safe_load(f)

    b = raw["brand"]
    brand = Brand(
        name=b["name"],
        aliases=b.get("aliases", [b["name"]]),
        domain=b.get("domain", ""),
        owned_domains=b.get("owned_domains", []),
        positioning=b.get("positioning", "").strip(),
        proof_metrics=b.get("proof_metrics", {}),
        trust_anchors=b.get("trust_anchors", []),
    )
    competitors = [
        Competitor(
            name=c["name"], category=c.get("category", ""),
            side=c.get("side", ""), aliases=c.get("aliases", []),
        )
        for c in raw.get("competitors", [])
    ]
    personas = [
        Persona(id=p["id"], title=p["title"], pain=p.get("pain", ""),
                queries=p.get("queries", []))
        for p in raw.get("personas", [])
    ]
    citation_social = (raw.get("citation_classes", {}) or {}).get("social", [])

    return AppConfig(
        brand=brand,
        competitors=competitors,
        topics=raw.get("topics", []),
        personas=personas,
        citation_social=citation_social,
        engines=_list("ENGINES", ["claude"]),
        collection_model=_s("COLLECTION_MODEL", "claude-sonnet-4-6"),
        extraction_model=_s("EXTRACTION_MODEL", "claude-haiku-4-5"),
        responses_per_prompt=_i("RESPONSES_PER_PROMPT", 1),
        enrich=_b("ENRICH", True),
        use_web_search=_b("USE_WEB_SEARCH", True),
        web_search_max_uses=_i("WEB_SEARCH_MAX_USES", 5),
        collection_max_tokens=_i("COLLECTION_MAX_TOKENS", 4000),
        rate_limit_sleep=_f("RATE_LIMIT_SLEEP", 0.0),
        prompts_path=_s("PROMPTS_PATH", "./prompts/risa_prompts.csv"),
        output_dir=_s("OUTPUT_DIR", "./output"),
    )
