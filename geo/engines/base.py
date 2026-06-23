"""Engine abstraction + the standard answer record every engine returns."""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any


@dataclass
class AnswerResult:
    """One answer from one engine for one prompt — the unit Stage 2 analyzes."""
    engine: str                       # "claude", "perplexity", ...
    model: str                        # exact model/version queried
    prompt: str
    text: str                         # the answer, plain text
    cited_urls: list[str] = field(default_factory=list)    # links the answer cited
    searched_urls: list[str] = field(default_factory=list)  # links the engine surfaced
    error: str | None = None
    meta: dict[str, Any] = field(default_factory=dict)      # tokens, etc.

    def to_dict(self) -> dict:
        return asdict(self)


class Engine:
    """Subclass and implement `answer`. `name` must be stable/unique."""
    name: str = "base"

    def __init__(self, cfg):
        self.cfg = cfg

    @property
    def available(self) -> bool:
        """Whether this engine can actually run (key present, etc.)."""
        return True

    def answer(self, prompt: str) -> AnswerResult:  # pragma: no cover - abstract
        raise NotImplementedError
