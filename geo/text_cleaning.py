"""Lightweight text helpers shared across extraction."""
from __future__ import annotations

import re
from urllib.parse import urlparse

_WORD = re.compile(r"[A-Za-z0-9]")


def _ok_boundary(text: str, start: int, end: int) -> bool:
    """True if the match isn't glued to surrounding alphanumerics/underscore."""
    if start > 0 and (text[start - 1].isalnum() or text[start - 1] == "_"):
        return False
    if end < len(text) and (text[end].isalnum() or text[end] == "_"):
        return False
    return True


def alias_spans(text: str, alias: str) -> list[tuple[int, int]]:
    """Boundary-aware, case-insensitive match spans of `alias` in `text`."""
    if not text or not alias:
        return []
    pattern = re.escape(alias.strip())
    spans = []
    for m in re.finditer(pattern, text, flags=re.IGNORECASE):
        if _ok_boundary(text, m.start(), m.end()):
            spans.append((m.start(), m.end()))
    return spans


def merge_spans(spans: list[tuple[int, int]]) -> list[tuple[int, int]]:
    """Merge overlapping/touching spans so overlapping aliases count once.

    e.g. 'RISA Labs' (0,9) + 'RISA' (0,4) + 'Risa Labs' (0,9) -> one span.
    """
    if not spans:
        return []
    spans = sorted(spans)
    out = [spans[0]]
    for s, e in spans[1:]:
        ls, le = out[-1]
        if s <= le:  # overlap or touch
            out[-1] = (ls, max(le, e))
        else:
            out.append((s, e))
    return out


def count_entity(text: str, aliases: list[str]) -> tuple[int, int | None]:
    """Distinct (de-overlapped) occurrences of an entity across its aliases.

    Returns (count, first_start_index_or_None).
    """
    spans: list[tuple[int, int]] = []
    for a in aliases:
        spans.extend(alias_spans(text, a))
    merged = merge_spans(spans)
    return len(merged), (merged[0][0] if merged else None)


def domain_of(url: str) -> str:
    try:
        net = urlparse(url if "://" in url else "http://" + url).netloc.lower()
        return net[4:] if net.startswith("www.") else net
    except Exception:
        return ""


def domain_root(domain: str) -> str:
    """e.g. 'coherehealth.com' -> 'coherehealth' (the registrable label-ish)."""
    parts = domain.split(".")
    return parts[-2] if len(parts) >= 2 else (parts[0] if parts else "")
