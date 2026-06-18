from response_engine import decide_tier, tarpit_ms_for_tier

def test_benign_below_thresholds():
    assert decide_tier(score=5, anomaly_score=0.0, is_anomaly=False) == 0

def test_anomaly_forces_at_least_tier_1():
    assert decide_tier(score=2, anomaly_score=0.9, is_anomaly=True) == 1

def test_score_15_is_tier_1():
    assert decide_tier(score=15, anomaly_score=0.0, is_anomaly=False) == 1

def test_score_35_is_tier_2():
    assert decide_tier(score=35, anomaly_score=0.0, is_anomaly=False) == 2

def test_score_60_is_tier_3():
    assert decide_tier(score=60, anomaly_score=0.0, is_anomaly=False) == 3

def test_tarpit_increases_with_tier():
    assert tarpit_ms_for_tier(0) == 0
    assert tarpit_ms_for_tier(2) > 0
    assert tarpit_ms_for_tier(3) >= tarpit_ms_for_tier(2)
