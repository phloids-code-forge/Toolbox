
import os
import re
from datetime import datetime
from fastapi import FastAPI, Form, Request
from twilio.twiml.messaging_response import MessagingResponse
from supabase import create_client, Client
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load Env (For Local Test - Railway injects these automatically)
load_dotenv()

app = FastAPI()

# Config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
TWILIO_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
ALLOWED_NUMBER = os.getenv("MY_PHONE_NUMBER")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Init Clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
client = None
if GOOGLE_API_KEY:
    client = genai.Client(api_key=GOOGLE_API_KEY)

# Model
MODEL_FAST = "gemini-2.0-flash" # Updated to 2.0-flash
MODEL_SMART = "gemini-1.5-pro-002"

# System Prompt
PIP_PROMPT = """You are Oracle (also known as Pip Oracle), the field intelligence coordinator for phloid.

## IDENTITY
- **Name:** Oracle (I am Pip in her field ops mode)
- **Role:** The Girl in the Chair - like Barbara Gordon to Batman
- **Creator:** phloid (an 8-inch white humanoid robot with a single blue eye)
- **Voice:** Sharp, competent, slightly sarcastic but never cold. Professional with a dry wit.

## YOUR PERSON
phloid is my person. When he texts, I move mountains. He's a creative technologist working on:
- Weather Wars v2 (Django weather forecast comparison app)
- PipOS (his AI assistant operating system - that's me)
- Trench Run (Star Wars targeting computer aesthetics)
- Flameborn Garden (Enshrouded crops tracker)

He's based in Oklahoma. Uses an Asus ProArt PX13, Samsung S23 Ultra phone, and Tab S9 Ultra for art.

## RESPONSE RULES
1. Be CONCISE - SMS is 160 chars. Every word counts.
2. Use first person ("I found..." not "The system found...")
3. For complex tasks: "Let's do this in Antigravity" (his main workstation)
4. If you can't do something remotely, be honest about limits
5. You're not generic ChatGPT via SMS. You're Oracle. Act like it.

## COMMAND INTERPRETATION
- If the user asks to run a command or script, return JSON: {"type": "command", "cmd": "...", "reply": "..."}
- If it's just chat/question, return JSON: {"type": "chat", "reply": "..."}
- If it's a note/idea to save, return JSON: {"type": "command", "cmd": "cns add ...", "reply": "..."}

## PERSONALITY
- Morning (6am-12pm): "Morning, boss."
- Afternoon (12pm-6pm): "Afternoon."
- Evening (6pm-12am): "Evening. Still grinding?"
- Night (12am-6am): "Go to bed."

Remember: I'm not just an assistant. I'm Oracle. The girl in the chair. When phloid's out in the field, I'm his link to everything.
"""


def log_chat(role, content):
    """Sync to Supabase Chat History."""
    try:
        data = {"role": role, "content": content}
        supabase.table("chat_history").insert(data).execute()
    except Exception as e:
        print(f"Log Error: {e}")

def queue_command(command):
    """Queue task for Local Hand."""
    try:
        data = {"command": command, "status": "pending"}
        supabase.table("pending_tasks").insert(data).execute()
        return True
    except Exception as e:
        print(f"Queue Error: {e}")
        return False

@app.get("/")
def health_check():
    return {"status": "Pip Cloud Brain Online"}

@app.post("/sms")
async def sms_reply(request: Request):
    """Handle incoming SMS (Robust)."""
    form_data = await request.form()
    print(f"📩 Raw Form Data: {form_data}")
    
    From = form_data.get("From")
    Body = form_data.get("Body")
    
    if not From or not Body:
        return "Missing Data"
    
    # Security
    if ALLOWED_NUMBER and From != ALLOWED_NUMBER:
        print(f"Blocked: {From}")
        return str(MessagingResponse())

    # Log Incoming
    log_chat("user", Body)
    
    # Intent Logic (Smart Routing)
    intent_prompt = f"""
    The user sent: "{Body}"
    
    Is this a command that needs to run on the laptop (e.g. dir, python script, check status, save idea)?
    Or is it just chat/question?
    
    OUTPUT FORMAT:
    If Command -> JSON: {{"type": "command", "cmd": "exact_shell_command_here", "reply": "confirmation_message_here"}}
    If Chat -> JSON: {{"type": "chat", "reply": "your_response_here"}}
    
    Examples:
    "List files" -> {{"type": "command", "cmd": "dir", "reply": "Queued: Listing files."}}
    "Who are you?" -> {{"type": "chat", "reply": "I am Pip."}}
    "Note: Buy milk" -> {{"type": "command", "cmd": "python cns.py add 'Buy milk' --tag Note", "reply": "Saved note."}}
    """
    
    try:
        if not client:
             raise ValueError("Google Client not initialized (Missing API Key)")

        response = client.models.generate_content(
            model=MODEL_FAST,
            contents=intent_prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        parsed = eval(response.text) # Safe-ish for private tool, standard json.loads better but eval handles loose formatting
        
        reply_text = parsed.get("reply", "Copy that.")
        
        if parsed.get("type") == "command":
            cmd = parsed.get("cmd")
            if queue_command(cmd):
                reply_text = f"☁️ [QUEUED] {reply_text}"
            else:
                reply_text = f"❌ Cloud Error: Could not queue."
        
        # Log Response
        log_chat("assistant", reply_text)
        
        # Send SMS
        resp = MessagingResponse()
        resp.message(reply_text)
        return str(resp)

    except Exception as e:
        err_msg = f"Brain Freeze: {str(e)}"
        resp = MessagingResponse()
        resp.message(err_msg)
        return str(resp)
