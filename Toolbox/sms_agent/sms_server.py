"""
SMS Server v2 - Oracle 2.0
Routes through Pip Core for unified handling.
"""

import os
import sys
import threading
import ctypes
import requests
import mimetypes
from datetime import datetime
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from twilio.rest import Client  # Added for Beacon
from google import genai
from google.genai import types
from pyngrok import ngrok
from dotenv import load_dotenv

# Path Fix for imports
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, PROJECT_ROOT)

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "visual_pipeline", ".env")
load_dotenv(env_path)

# Internal Modules
try:
    from Toolbox import pip_core
    from Toolbox.sms_agent import rich_response
except ImportError as e:
    print(f"⚠️ Import warning: {e}")
    pip_core = None
    rich_response = None

app = Flask(__name__)

# Security & Config
ALLOWED_NUMBER = os.getenv("MY_PHONE_NUMBER")
TWILIO_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER") # Added for Beacon
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Initialize Gemini Client
client = None
if GOOGLE_API_KEY:
    client = genai.Client(api_key=GOOGLE_API_KEY)
else:
    print("⚠️ Warning: GOOGLE_API_KEY not found. AI features will be disabled.")

# Setup Inbox Paths
INBOX_DIR = os.path.join(PROJECT_ROOT, "Inbox")
IMG_INBOX = os.path.join(INBOX_DIR, "Images")
if not os.path.exists(IMG_INBOX): 
    os.makedirs(IMG_INBOX)

# --- HELPER FUNCTIONS ---

def download_media(url, filename):
    """Downloads media from Twilio (handling S3 redirects)."""
    if not TWILIO_SID or not TWILIO_TOKEN: 
        return False
    try:
        session = requests.Session()
        session.auth = (TWILIO_SID, TWILIO_TOKEN)
        resp = session.get(url, allow_redirects=False)
        target_url = resp.headers['Location'] if resp.status_code in [301, 302, 307] else url
        file_resp = requests.get(target_url)
        if file_resp.status_code == 200:
            with open(filename, 'wb') as f:
                f.write(file_resp.content)
            return True
    except Exception as e:
        print(f"❌ Download Error: {e}")
    return False


def transcribe_audio(audio_path):
    """Transcribe audio file using Gemini's audio understanding."""
    if not client: return None
    try:
        # Read audio file
        with open(audio_path, "rb") as f:
            audio_data = f.read()
        
        # Determine mime type
        ext = os.path.splitext(audio_path)[1].lower()
        mime_map = {
            ".mp3": "audio/mp3",
            ".wav": "audio/wav",
            ".m4a": "audio/mp4",
            ".ogg": "audio/ogg",
            ".amr": "audio/amr",
            ".3gp": "audio/3gpp",
        }
        mime_type = mime_map.get(ext, "audio/mp3")
        
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                "Transcribe this audio exactly. Only output the transcription, no commentary.",
                types.Part.from_bytes(data=audio_data, mime_type=mime_type)
            ]
        )
        return response.text.strip()
    except Exception as e:
        print(f"❌ Transcription Error: {e}")
        return None


def analyze_image(image_path):
    """Analyze image using Gemini Vision API."""
    if not client: return None
    try:
        # Read image
        with open(image_path, "rb") as f:
            image_data = f.read()
        
        # Determine mime type
        ext = os.path.splitext(image_path)[1].lower()
        mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp"}
        mime_type = mime_map.get(ext, "image/jpeg")
        
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                "Describe this image concisely. If it contains text, handwriting, or a whiteboard, extract and transcribe all text. If it's a screenshot, describe what app/content is shown.",
                types.Part.from_bytes(data=image_data, mime_type=mime_type)
            ]
        )
        return response.text
    except Exception as e:
        print(f"❌ Image Analysis Error: {e}")
        return None


def popup(title, text):
    """Visual Notification on Host Machine."""
    try:
        ctypes.windll.user32.MessageBoxW(0, text, title, 0x40 | 0x1 | 0x1000)
    except:
        pass

def update_webhook(public_url):
    """Auto-updates Twilio Webhook with new Ngrok URL (The Beacon)."""
    if not TWILIO_SID or not TWILIO_TOKEN or not TWILIO_PHONE_NUMBER:
        print("⚠️ Missing Twilio Credentials for Auto-Update.")
        return

    try:
        client = Client(TWILIO_SID, TWILIO_TOKEN)
        # Find the phone number SID
        numbers = client.incoming_phone_numbers.list(phone_number=TWILIO_PHONE_NUMBER)
        if numbers:
            sid = numbers[0].sid
            # Update the SMS URL
            client.incoming_phone_numbers(sid).update(sms_url=f"{public_url}/sms")
            print(f"✅ Twilio Webhook Auto-Updated: {public_url}/sms")
        else:
            print(f"❌ Twilio Error: Phone number {TWILIO_PHONE_NUMBER} not found in account.")
    except Exception as e:
        print(f"❌ Webhook Update Failed: {e}")


# --- FLASK ROUTES ---

@app.route("/sms", methods=['GET', 'POST'])
def sms_reply():
    """The Oracle v2 - Routes through Pip Core."""
    if request.method == 'GET': 
        return "🔮 ORACLE v2 ONLINE."

    # 1. PARSE INCOMING
    incoming_msg = request.values.get('Body', '').strip()
    from_number = request.values.get('From', '')
    num_media = int(request.values.get('NumMedia', 0))

    # 2. SECURITY CHECK
    if ALLOWED_NUMBER and from_number != ALLOWED_NUMBER:
        print(f"⛔ BLOCKED: {from_number}")
        return str(MessagingResponse())  # Silent drop

    media_processed = []

    # 3. HANDLE MEDIA (MMS)
    if num_media > 0:
        for i in range(num_media):
            media_url = request.values.get(f'MediaUrl{i}')
            content_type = request.values.get(f'MediaContentType{i}')
            ext = mimetypes.guess_extension(content_type) or ".bin"
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{timestamp}_{i}{ext}"
            
            if "image" in content_type:
                save_path = os.path.join(IMG_INBOX, filename)
                if download_media(media_url, save_path):
                    analysis = analyze_image(save_path)
                    if analysis:
                        incoming_msg += f"\n[IMAGE DESCRIPTION]: {analysis}"
                        media_processed.append(f"📸 Analyzed: {filename}")
                    else:
                        media_processed.append(f"📸 Saved: {filename}")
            elif "audio" in content_type:
                audio_dir = os.path.join(INBOX_DIR, "Audio")
                if not os.path.exists(audio_dir):
                    os.makedirs(audio_dir)
                save_path = os.path.join(audio_dir, filename)
                if download_media(media_url, save_path):
                    transcription = transcribe_audio(save_path)
                    if transcription:
                        incoming_msg += f"\n[VOICE NOTE]: {transcription}"
                        media_processed.append(f"🎙️ Transcribed: {len(transcription)} chars")
                    else:
                        media_processed.append("🎙️ Audio saved (transcription failed)")
            elif "text" in content_type:
                save_path = os.path.join(INBOX_DIR, filename)
                if download_media(media_url, save_path):
                    try:
                        with open(save_path, 'r', encoding='utf-8') as f:
                            file_content = f.read()
                        incoming_msg += f"\n[ATTACHMENT]:\n{file_content}"
                        media_processed.append(f"📄 Read: {len(file_content)} chars")
                    except:
                        media_processed.append("❌ Could not read attachment")

    # 4. ROUTE THROUGH PIP CORE
    if pip_core and incoming_msg:
        result = pip_core.handle_message(
            source="sms",
            user_id=from_number,
            message=incoming_msg
        )
        response_text = result.get("text", "")
        rich_content = result.get("rich_content")
        
        # Handle Rich Response upload
        if rich_content and rich_response:
            link = rich_response.upload_response(
                rich_content.get("title", "Oracle Response"),
                rich_content.get("html", response_text)
            )
            if link:
                response_text = f"{response_text}\n📋 {link}"
    else:
        # Fallback if pip_core not loaded
        response_text = f"🦜 Echo: {incoming_msg} (Pip Core offline)"

    # 5. PREPEND MEDIA STATUS
    final_reply = ""
    if media_processed:
        final_reply = " | ".join(media_processed) + "\n"
    final_reply += response_text

    # 6. LENGTH CHECK - FORCE RICH RESPONSE IF TOO LONG
    if len(final_reply) > 400 and rich_response:
        link = rich_response.upload_response(
            f"Response: {datetime.now().strftime('%H:%M')}",
            f"<pre>{final_reply}</pre>"
        )
        if link:
            final_reply = f"📋 Response: {link}"
        else:
            final_reply = final_reply[:150] + "... (truncated)"

    # 7. VISUAL POPUP
    threading.Thread(target=popup, args=("🔮 Oracle", final_reply[:100])).start()

    # 8. SEND SMS
    resp = MessagingResponse()
    resp.message(final_reply)
    print(f"📤 Sent: {final_reply}")

    # 9. LOG
    log_path = os.path.join(PROJECT_ROOT, "sms_history.log")
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] IN: {incoming_msg}\n")
        f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] OUT: {final_reply}\n")

    return str(resp)


def start_server():
    """Start the Oracle server."""
    if os.environ.get("SKIP_NGROK") == "true":
        print("🔮 ORACLE v2 RUNNING (Tunnel managed by Auto-Connect)")
    else:
        try:
            # Kill old tunnels
            ngrok.kill()
            
            # Connect
            tunnel = ngrok.connect(5050)
            public_url = tunnel.public_url
            print(f"🔮 ORACLE v2 LISTENING: {public_url}/sms")
            
            # THE BEACON
            update_webhook(public_url)
            
        except Exception as e:
            print(f"❌ Ngrok Error: {e}")
            return
    
    app.run(port=5050)


if __name__ == "__main__":
    start_server()
