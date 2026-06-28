import asyncio
import json
import os
import redis.asyncio as redis
from fastapi import FastAPI
from llm_engine import generate_response
import db
import persistence
from detection import ThreatHunter

app = FastAPI()
redis_client = redis.Redis(host='127.0.0.1', port=6379, db=0)
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "threat_hunter.joblib")

async def _publish(channel, payload):
    await redis_client.publish(channel, json.dumps(payload, default=str))

async def process_ai_request(message):
    data = json.loads(message["data"].decode('utf-8'))
    session_id = data.get("session_id")
    command = data.get("command")
    response_channel = data.get("response_channel")
    print(f"[AI] request session={session_id} cmd={command!r}")
    conn = db.get_connection()
    score = db.get_session_score(conn, session_id)
    conn.close()
    response_text = await generate_response(command, score)
    await redis_client.publish(response_channel, json.dumps({"response": response_text}))

async def ai_request_listener():
    pubsub = redis_client.pubsub()
    await pubsub.subscribe('channel:ai_request')
    print("Listening for AI requests...")
    async for message in pubsub.listen():
        if message['type'] == 'message':
            asyncio.create_task(process_ai_request(message))

async def activity_listener():
    pubsub = redis_client.pubsub()
    await pubsub.subscribe('channel:ssh_activity')
    print("Listening for SSH activity (persistence)...")
    async for message in pubsub.listen():
        if message['type'] == 'message':
            data = json.loads(message["data"].decode('utf-8'))
            conn = db.get_connection()
            try:
                await persistence.handle_activity(conn, data)
            except Exception as e:
                print("Persistence error:", e)
            finally:
                conn.close()

@app.on_event("startup")
async def startup_event():
    persistence.publish = _publish
    if os.path.exists(MODEL_PATH):
        try:
            persistence.hunter = ThreatHunter.load(MODEL_PATH)
            print("Loaded ThreatHunter model.")
        except Exception as e:
            print("Model load failed, running heuristic-only:", e)
    else:
        print("No model found, running heuristic-only.")
    asyncio.create_task(ai_request_listener())
    asyncio.create_task(activity_listener())

@app.get("/")
def read_root():
    return {"status": "AI Layer is running"}
