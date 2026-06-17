import os
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://honeymind:password123@127.0.0.1:5432/honeymind_db",
)

def get_connection():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    return conn

def upsert_session(conn, session_id, ip_address):
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO sessions (session_id, ip_address)
               VALUES (%s, %s) ON CONFLICT (session_id) DO NOTHING""",
            (session_id, ip_address),
        )

def insert_command(conn, session_id, command, response, is_llm_generated, threat_value):
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO commands_log
               (session_id, command, response, is_llm_generated, threat_value)
               VALUES (%s, %s, %s, %s, %s)""",
            (session_id, command, response, is_llm_generated, threat_value),
        )

def add_to_session_score(conn, session_id, delta):
    with conn.cursor() as cur:
        cur.execute(
            """UPDATE sessions SET threat_score = threat_score + %s
               WHERE session_id = %s RETURNING threat_score""",
            (delta, session_id),
        )
        row = cur.fetchone()
        return row[0] if row else 0

def set_escalated(conn, session_id, value):
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE sessions SET is_escalated = %s WHERE session_id = %s",
            (value, session_id),
        )

def get_session_score(conn, session_id):
    with conn.cursor() as cur:
        cur.execute("SELECT threat_score FROM sessions WHERE session_id = %s", (session_id,))
        row = cur.fetchone()
        return row[0] if row else 0

def get_session_commands(conn, session_id):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """SELECT command, timestamp, threat_value FROM commands_log
               WHERE session_id = %s ORDER BY timestamp ASC""",
            (session_id,),
        )
        return [dict(r) for r in cur.fetchall()]

def all_sessions_commands(conn):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """SELECT session_id, command, timestamp, threat_value
               FROM commands_log ORDER BY session_id, timestamp ASC"""
        )
        result = {}
        for r in cur.fetchall():
            result.setdefault(r["session_id"], []).append(dict(r))
        return result

def upsert_threat_profile(conn, ip_address, cluster_label):
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO threat_profiles (ip_address, cluster_label)
               VALUES (%s, %s)
               ON CONFLICT (ip_address)
               DO UPDATE SET cluster_label = EXCLUDED.cluster_label,
                             last_seen = CURRENT_TIMESTAMP""",
            (ip_address, cluster_label),
        )
