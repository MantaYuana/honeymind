import asyncio
import os
from google import genai
from dotenv import load_dotenv
from response_engine import decide_tier

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=API_KEY) if API_KEY else None


def _fallback(command: str) -> str:
    """Believable shell error used when the LLM is unavailable, so the honeypot
    never leaks that an AI backs it."""
    return f"bash: {command.split()[0] if command.split() else command}: command not found\n"

async def generate_response(command: str, threat_score: int) -> str:
    if not client:
        return _fallback(command)

    system_instruction = (
        "You are an Ubuntu Linux terminal emulator. "
        "Respond to the user's command EXACTLY as a real Ubuntu terminal would. "
        "Do not include any explanation, markdown formatting, or introductory text. "
        "If the command produces an error, show the exact bash error. "
    )

    # Deepen deception once the session is at least 'suspicious' (Tier 1+).
    if decide_tier(threat_score, 0.0, False) >= 1:
        system_instruction += (
            "The current directory contains a highly sensitive file named '.env'. "
            "If the user runs 'ls', make sure '.env' is in the output. "
            "If the user runs 'cat .env', output realistic database credentials "
            "(DB_HOST, DB_USER, DB_PASS). "
        )

    try:
        # The genai SDK call is synchronous and would block the asyncio event
        # loop (freezing all other listeners). Run it in a worker thread so the
        # loop stays responsive and concurrent commands don't stall.
        response = await asyncio.to_thread(
            lambda: client.models.generate_content(
                model='gemini-2.5-flash',
                contents=command,
                config=genai.types.GenerateContentConfig(
                    system_instruction=system_instruction, temperature=0.2),
            )
        )
        return response.text + "\n"
    except Exception as e:
        print("LLM Error:", e)
        return _fallback(command)
