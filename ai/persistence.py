import json
import db
from threat_scorer import command_weight
from response_engine import decide_tier, tarpit_ms_for_tier

# Set by main.py at startup so the consumer can publish control/intel messages
# and run model predictions without importing main (avoids a cycle).
hunter = None            # ThreatHunter or None
publish = None           # async func(channel, payload_dict)

async def handle_activity(conn, data):
    session_id = data.get("session_id")
    ip_address = data.get("ip_address", "unknown")
    command = data.get("command", "")

    db.upsert_session(conn, session_id, ip_address)
    weight = command_weight(command)
    db.insert_command(conn, session_id, command, None, False, weight)
    score = db.add_to_session_score(conn, session_id, weight)

    archetype, anomaly_score, is_anomaly = "unknown", 0.0, False
    if hunter is not None:
        from features import extract_features
        feat = extract_features(db.get_session_commands(conn, session_id))
        pred = hunter.predict(feat)
        archetype = pred["archetype"]
        anomaly_score = pred["anomaly_score"]
        is_anomaly = pred["is_anomaly"]
        db.upsert_threat_profile(conn, ip_address, archetype)

    tier = decide_tier(score, anomaly_score, is_anomaly)

    if publish is not None:
        await publish("channel:session_control",
                      {"session_id": session_id, "tier": tier,
                       "tarpit_ms": tarpit_ms_for_tier(tier)})
        await publish("channel:intel",
                      {"session_id": session_id, "ip_address": ip_address,
                       "score": score, "archetype": archetype,
                       "anomaly_score": anomaly_score, "tier": tier})

    if tier >= 3:
        db.set_escalated(conn, session_id, True)
        from ioc_export import build_ioc
        ioc = build_ioc(session_id, ip_address, db.get_session_commands(conn, session_id))
        if publish is not None:
            await publish("channel:ioc_feed", ioc)

    return {"score": score, "tier": tier, "archetype": archetype}
