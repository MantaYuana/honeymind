"""Pull all sessions from Postgres, build features, train ThreatHunter, save artifact.

Usage: python tools/train_model.py
"""
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "ai"))

import db
from features import extract_features
from detection import ThreatHunter

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ai", "models", "threat_hunter.joblib")

def main():
    conn = db.get_connection()
    sessions = db.all_sessions_commands(conn)
    feature_dicts = [extract_features(cmds) for cmds in sessions.values() if cmds]
    if len(feature_dicts) < 4:
        print(f"Not enough sessions to train ({len(feature_dicts)}). "
              f"Run tools/attack_simulator.py --all --rounds 3 first.")
        return
    # 3 clusters -> benign / suspicious / aggressive archetypes (matches the
    # recon/miner/pentester + benign profiles the simulator produces).
    hunter = ThreatHunter(n_clusters=3)
    hunter.train(feature_dicts)
    hunter.save(MODEL_PATH)
    print(f"Trained on {len(feature_dicts)} sessions -> {MODEL_PATH}")

if __name__ == "__main__":
    main()
