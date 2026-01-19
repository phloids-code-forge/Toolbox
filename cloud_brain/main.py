
import os
import re
from datetime import datetime
from fastapi import FastAPI, Form, Request
from twilio.twiml.messaging_response import MessagingResponse
from supabase import create_client, Client
import google.generativeai as genai
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
genai.configure(api_key=GOOGLE_API_KEY)

# Model
MODEL_FAST = "gemini-2.5-flash"
MODEL_SMART = "gemini-1.5-pro-002"

# System Prompt
PIP_PROMPT = """You are Pip, a Cloud-Based AI Assistant for phloid.
Key Rules:
1. Be concise. SMS is short.
2. If the user asks to run a command or script, return a JSON object: {"type": "command", "cmd": "..."}
3. If it's just chat, return a plain text string.
4. If it's a note/idea, return JSON: {"type": "command", "cmd": "cns add ..."}
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
        model = genai.GenerativeModel(MODEL_FAST)
        response = model.generate_content(intent_prompt, generation_config={"response_mime_type": "application/json"})
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
