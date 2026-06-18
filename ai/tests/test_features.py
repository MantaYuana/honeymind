from datetime import datetime, timedelta
from features import extract_features, features_to_vector, FEATURE_ORDER

def _cmds(names, weights, step_s=2):
    t0 = datetime(2026, 6, 17, 12, 0, 0)
    return [
        {"command": n, "threat_value": w, "timestamp": t0 + timedelta(seconds=i * step_s)}
        for i, (n, w) in enumerate(zip(names, weights))
    ]

def test_command_count():
    feat = extract_features(_cmds(["ls", "pwd"], [1, 1]))
    assert feat["command_count"] == 2

def test_malicious_ratio_counts_weight_over_5():
    feat = extract_features(_cmds(["ls", "nmap", "nc"], [1, 15, 15]))
    assert feat["malicious_ratio"] == 2 / 3

def test_unique_ratio():
    feat = extract_features(_cmds(["ls", "ls", "pwd"], [1, 1, 1]))
    assert feat["unique_ratio"] == 2 / 3

def test_avg_interval_seconds():
    feat = extract_features(_cmds(["ls", "pwd", "id"], [1, 1, 1], step_s=4))
    assert feat["avg_interval_s"] == 4.0

def test_empty_session_is_all_zero():
    feat = extract_features([])
    assert feat["command_count"] == 0
    assert feat["entropy"] == 0.0

def test_vector_order_matches_feature_order():
    feat = extract_features(_cmds(["ls"], [1]))
    vec = features_to_vector(feat)
    assert len(vec) == len(FEATURE_ORDER)
    assert vec[0] == feat["command_count"]
