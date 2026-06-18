import os
from detection import ThreatHunter

def _benign_feat(i):
    return {"command_count": 5, "malicious_ratio": 0.0, "avg_interval_s": 3.0,
            "unique_ratio": 1.0, "entropy": 2.0, "max_threat": 1.0 + i * 0.01}

def _hostile_feat(i):
    return {"command_count": 7, "malicious_ratio": 0.8, "avg_interval_s": 0.5,
            "unique_ratio": 1.0, "entropy": 2.5, "max_threat": 15.0 - i * 0.01}

def _training_set():
    return [_benign_feat(i) for i in range(20)] + [_hostile_feat(i) for i in range(20)]

def test_predict_returns_expected_keys():
    h = ThreatHunter(); h.train(_training_set())
    pred = h.predict(_benign_feat(0))
    assert set(pred) == {"archetype", "anomaly_score", "is_anomaly"}
    assert isinstance(pred["archetype"], str)

def test_hostile_and_benign_get_different_archetypes():
    h = ThreatHunter(); h.train(_training_set())
    benign_label = h.predict(_benign_feat(0))["archetype"]
    hostile_label = h.predict(_hostile_feat(0))["archetype"]
    assert benign_label != hostile_label

def test_extreme_outlier_flagged_anomalous():
    h = ThreatHunter(); h.train(_training_set())
    weird = {"command_count": 500, "malicious_ratio": 1.0, "avg_interval_s": 0.0,
             "unique_ratio": 0.01, "entropy": 0.0, "max_threat": 15.0}
    assert h.predict(weird)["is_anomaly"] is True

def test_save_and_load_roundtrip(tmp_path):
    h = ThreatHunter(); h.train(_training_set())
    p = os.path.join(tmp_path, "m.joblib")
    h.save(p)
    h2 = ThreatHunter.load(p)
    assert h2.predict(_benign_feat(0))["archetype"] == h.predict(_benign_feat(0))["archetype"]
