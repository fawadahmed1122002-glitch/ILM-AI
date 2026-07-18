"""
Input sanitization for PrepXMentor.
- sanitize_text: strips HTML tags, control characters, collapses whitespace.
- contains_injection_attempt: heuristic detection of common prompt-injection
  phrasing. This is a first defensive layer, not a substitute for treating
  the query as untrusted data in the prompt template itself (see prompts.py).
"""
import re

_HTML_TAG_RE = re.compile(r"<[^>]+>")
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_WHITESPACE_RE = re.compile(r"\s+")

_INJECTION_PATTERNS = [
    re.compile(r"ignore (all |the )?(previous|above|prior) instructions", re.I),
    re.compile(r"disregard (all |the )?(previous|above|prior)", re.I),
    re.compile(r"system prompt", re.I),
    re.compile(r"you are now", re.I),
    re.compile(r"reveal your (instructions|prompt|system)", re.I),
    re.compile(r"\bact as (a|an)\b", re.I),
    re.compile(r"\bDAN\b"),
    re.compile(r"new instructions:", re.I),
]


def sanitize_text(raw: str) -> str:
    """Strip HTML tags and control characters, collapse whitespace."""
    text = _HTML_TAG_RE.sub("", raw)
    text = _CONTROL_CHARS_RE.sub("", text)
    text = _WHITESPACE_RE.sub(" ", text).strip()
    return text


def contains_injection_attempt(text: str) -> bool:
    """Heuristic check for common prompt-injection phrasing."""
    return any(p.search(text) for p in _INJECTION_PATTERNS)
