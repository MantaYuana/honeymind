import asyncio
import json
import redis.asyncio as redis
from fastapi import FastAPI
from llm_engine import generate_response
from threat_scorer import calculate_score

app = FastAPI()
redis_client = redis.Redis(host='127.0.0.1', port=6379, db=0)

async def process_ai_request(message):
    data = json.loads(message["data"].decode('utf-8'))
    session_id = data.get("session_id")
    command = data.get("command")
    response_channel = data.get("response_channel")
    
    # Update threat score
    score = calculate_score(session_id, command)
    
    # Generate response via LLM
    response_text = await generate_response(command, score)
    
    # Send response back
    payload = json.dumps({"response": response_text})
    await redis_client.publish(response_channel, payload)

async def redis_listener():
    pubsub = redis_client.pubsub()
    await pubsub.subscribe('channel:ai_request')
    print("Listening for AI requests...")
    
    async for message in pubsub.listen():
        if message['type'] == 'message':
            asyncio.create_task(process_ai_request(message))

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(redis_listener())

@app.get("/")
def read_root():
    return {"status": "AI Layer is running"}
