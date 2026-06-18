import joblib
import numpy as np
from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from features import features_to_vector

# Map a cluster to a human label by its mean malicious_ratio (index 1 in FEATURE_ORDER).
_ARCHETYPE_BY_RANK = ["benign", "suspicious", "aggressive"]

class ThreatHunter:
    def __init__(self, n_clusters=2):
        self.n_clusters = n_clusters
        self.scaler = None
        self.kmeans = None
        self.iso = None
        self.cluster_labels = {}   # cluster_id -> archetype string

    def train(self, feature_dicts):
        X = np.array([features_to_vector(f) for f in feature_dicts], dtype=float)
        self.scaler = StandardScaler().fit(X)
        Xs = self.scaler.transform(X)

        self.kmeans = KMeans(n_clusters=self.n_clusters, random_state=42, n_init=10).fit(Xs)
        self.iso = IsolationForest(random_state=42, contamination=0.1).fit(Xs)

        # Rank clusters by mean malicious_ratio (raw feature index 1) -> assign labels.
        order = sorted(
            range(self.n_clusters),
            key=lambda c: X[self.kmeans.labels_ == c][:, 1].mean() if (self.kmeans.labels_ == c).any() else 0.0,
        )
        for rank, cluster_id in enumerate(order):
            self.cluster_labels[cluster_id] = _ARCHETYPE_BY_RANK[min(rank, len(_ARCHETYPE_BY_RANK) - 1)]

    def predict(self, feat):
        vec = np.array([features_to_vector(feat)], dtype=float)
        vs = self.scaler.transform(vec)
        cluster_id = int(self.kmeans.predict(vs)[0])
        raw = float(self.iso.decision_function(vs)[0])     # higher = more normal
        is_anomaly = bool(self.iso.predict(vs)[0] == -1)
        return {
            "archetype": self.cluster_labels.get(cluster_id, "unknown"),
            "anomaly_score": -raw,                          # higher = more anomalous
            "is_anomaly": is_anomaly,
        }

    def save(self, path):
        joblib.dump({
            "n_clusters": self.n_clusters, "scaler": self.scaler,
            "kmeans": self.kmeans, "iso": self.iso, "cluster_labels": self.cluster_labels,
        }, path)

    @classmethod
    def load(cls, path):
        d = joblib.load(path)
        h = cls(n_clusters=d["n_clusters"])
        h.scaler, h.kmeans, h.iso, h.cluster_labels = d["scaler"], d["kmeans"], d["iso"], d["cluster_labels"]
        return h
