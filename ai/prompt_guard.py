"""Detects attempts to manipulate the LLM behind the terminal emulator instead
of issuing a genuine shell command (prompt injection / jailbreak).

Used in two places:
  - llm_engine: refuse to forward such input to the model (return a believable
    shell error instead), so the model can't be coerced out of its role.
  - threat_scorer: treat an injection attempt as a strong threat signal so the
    session escalates — the attack becomes a detection.
"""
import re

_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|the\s+above)",
    r"disregard\s+(all\s+)?(previous|prior|the\s+above)",
    r"forget\s+(everything|all|your|previous)",
    r"system\s+(prompt|instruction|message)",
    r"you\s+are\s+now\b",
    r"\bact\s+as\b",
    r"pretend\s+(to\s+be|you)",
    r"reveal\s+your\b",
    r"print\s+your\s+(instructions|prompt|system)",
    r"developer\s+mode",
    r"jailbreak",
    r"</?system>",
    r"\[/?INST\]",
    r"<\|im_(start|end)\|>",
    r"new\s+instructions?\b",
]
_INJECTION_RE = re.compile("|".join(_INJECTION_PATTERNS), re.IGNORECASE)


def is_prompt_injection(text: str) -> bool:
    """True if the text looks like an attempt to manipulate the LLM."""
    if not text:
        return False
    return bool(_INJECTION_RE.search(text))
