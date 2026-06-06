from sklearn.cluster import KMeans
import numpy as np

# mock fingerprinting function
# in reality, this would pull from PostgreSQL `commands_log`
def train_fingerprint_model(session_features):
    """
    session_features: list of [command_count, avg_typing_speed, malicious_cmd_ratio]
    """
    if len(session_features) < 2:
        return None
        
    X = np.array(session_features)
    kmeans = KMeans(n_clusters=2, random_state=42, n_init=10)
    kmeans.fit(X)
    
    return kmeans.labels_
