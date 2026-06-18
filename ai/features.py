import math
from collections import Counter

FEATURE_ORDER = ["command_count", "malicious_ratio", "avg_interval_s",
                 "unique_ratio", "entropy", "max_threat"]

def _entropy(commands):
    if not commands:
        return 0.0
    bases = [c.split(' ')[0] for c in commands]
    counts = Counter(bases)
    total = len(bases)
    return -sum((n / total) * math.log2(n / total) for n in counts.values())

def extract_features(commands: list) -> dict:
    n = len(commands)
    if n == 0:
        return {k: 0.0 for k in FEATURE_ORDER}

    cmd_strings = [c["command"] for c in commands]
    weights = [c.get("threat_value", 0) for c in commands]
    malicious = sum(1 for w in weights if w >= 5)

    intervals = []
    ts = [c.get("timestamp") for c in commands if c.get("timestamp") is not None]
    for a, b in zip(ts, ts[1:]):
        intervals.append((b - a).total_seconds())
    avg_interval = sum(intervals) / len(intervals) if intervals else 0.0

    return {
        "command_count": float(n),
        "malicious_ratio": malicious / n,
        "avg_interval_s": avg_interval,
        "unique_ratio": len(set(cmd_strings)) / n,
        "entropy": _entropy(cmd_strings),
        "max_threat": float(max(weights)) if weights else 0.0,
    }

def features_to_vector(feat: dict) -> list:
    return [float(feat[k]) for k in FEATURE_ORDER]
