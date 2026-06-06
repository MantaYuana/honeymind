import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

if API_KEY:
    client = genai.Client(api_key=API_KEY)
else:
    client = None

async def generate_response(command: str, threat_score: int) -> str:
    if not client:
        return "bash: API Key not configured for LLM\n"
        
    system_instruction = (
        "You are an Ubuntu Linux terminal emulator. "
        "Respond to the user's command EXACTLY as a real Ubuntu terminal would. "
        "Do not include any explanation, markdown formatting, or introductory text. "
        "If the command produces an error, show the exact bash error. "
    )
    
    # Auto-escalating decoy logic
    if threat_score > 50:
        system_instruction += (
            "The current directory contains a highly sensitive file named '.env'. "
            "If the user runs 'ls', make sure '.env' is in the output. "
            "If the user runs 'cat .env', output realistic database credentials (DB_HOST, DB_USER, DB_PASS). "
        )
        
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=command,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2
            )
        )
        return response.text + "\n"
    except Exception as e:
        print("LLM Error:", e)
        return f"bash: {command.split()[0]}: command not found\n"
