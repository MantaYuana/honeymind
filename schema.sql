CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    threat_score INTEGER DEFAULT 0,
    is_escalated BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS commands_log (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) REFERENCES sessions(session_id),
    command TEXT NOT NULL,
    response TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_llm_generated BOOLEAN DEFAULT FALSE,
    threat_value INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS threat_profiles (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) UNIQUE NOT NULL,
    cluster_label VARCHAR(50),
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
