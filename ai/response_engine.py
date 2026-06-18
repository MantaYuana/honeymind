TIER_THRESHOLDS = [(60, 3), (35, 2), (15, 1)]   # checked high -> low
TARPIT_MS = {0: 0, 1: 0, 2: 1500, 3: 4000}

def decide_tier(score: int, anomaly_score: float, is_anomaly: bool) -> int:
    for threshold, tier in TIER_THRESHOLDS:
        if score >= threshold:
            return tier
    if is_anomaly:
        return 1
    return 0

def tarpit_ms_for_tier(tier: int) -> int:
    return TARPIT_MS.get(tier, 0)
