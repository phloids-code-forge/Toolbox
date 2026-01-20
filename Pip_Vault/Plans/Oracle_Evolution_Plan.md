# 🔮 ORACLE: THE BATMAN'S ORACLE EVOLUTION PLAN

> **Objective:** Transform Oracle from "remote command execution" into an **omniscient field operations center** — Batman's Barbara Gordon realized through PipOS.

---

## ⚠️ CRITICAL LESSONS LEARNED (2026-01-19)

> [!CAUTION]
> **The `google.generativeai` library is deprecated and BROKEN.** It uses API v1beta which returns 404 for all current models.

### Library Migration Required

| Component | OLD (Broken) | NEW (Working) |
|-----------|--------------|---------------|
| `llm_layer.py` | `google.generativeai` | `google-genai` ✅ |
| `sms_server.py` (image/audio) | `google.generativeai` | `google-genai` ✅ (2026-01-19) |
| Cloud Brain | `google.generativeai` | `google-genai` ✅ (2026-01-19) |

### Working Configuration
```python
# Use this pattern for ALL Gemini calls:
from google import genai

client = genai.Client(api_key=API_KEY)  # From config.json
response = client.models.generate_content(
    model="gemini-2.0-flash",  # Verified working
    contents="Your prompt here"
)
```

### API Key Location
- **Master key:** `config.json` → `api_keys.google`
- **Backup in .env:** `GOOGLE_API_KEY` (for components that need it)

---

## 📊 Current State Assessment

### What Works Now
| Feature | Status | Notes |
|---------|--------|-------|
| SMS → Server | ✅ | Twilio + Ngrok or Railway |
| Intent Classification | ✅ | `pip_core.py` routes: cmd, todo, queue, search, create, chat |
| LLM Layer | ✅ | Gemini Flash/Pro via `llm_layer.py` |
| Brain Search | ✅ | Local inverted index in `.brain/` |
| Rich Response | ✅ | HTML upload to Cloudflare R2 |
| Cloud → Local Worker | ✅ | `pip_worker.py` polls Supabase for queued commands |
| Auto-Webhook Update | ✅ | "The Beacon" updates Twilio webhook on Ngrok restart |

### Known Pain Points
| Issue | Impact |
|-------|--------|
| A2P 10DLC Pending | SMS reliability not guaranteed until approved |
| Brain hallucinations | Occasionally describes images that don't exist |
| No proactive alerts | Oracle only responds, never initiates |
| Limited skill execution | Can't trigger complex skills (image gen, web mockups) remotely |
| No voice input | Audio MMS received but not transcribed |
| No location awareness | Can't trigger context based on where you are |

---

## 🎯 ORACLE 3.0: THE VISION

### The Goal
When you text Oracle, you should feel like you have a **genius hacker friend** on the other end who:
1. **Knows everything you know** (your projects, contacts, ideas, history)
2. **Can do anything you can do** (run scripts, generate images, deploy sites)
3. **Anticipates your needs** (proactive alerts, context-aware responses)
4. **Never forgets** (every interaction enriches the system)

---

## 🚀 ENHANCEMENT TIERS

### TIER 1: LOW EFFORT / HIGH IMPACT 🔥
> *Quick wins that massively improve capability with minimal code*

#### 1.1 Voice Transcription (Gemini Audio) ✅ IMPLEMENTED
**Current:** ~~Audio MMS received → "🎙️ Audio received"~~ **WORKING**
**Upgrade:** Audio → Gemini 2.0 Flash → Text → Process as normal message

```python
# sms_server.py - WORKING PATTERN (2026-01-19)
def transcribe_audio(audio_path):
    # Gemini handles audio natively! No Whisper key needed.
    with open(audio_path, "rb") as f:
        audio_data = f.read()
    
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[
            "Transcribe this audio exactly.",
            types.Part.from_bytes(data=audio_data, mime_type="audio/mp3")
        ]
    )
    return response.text
```

**Effort:** ~~30 min~~ DONE | **Impact:** 🔥🔥🔥 Voice notes become searchable memory

---

#### 1.2 Image Analysis (Vision API) ✅ IMPLEMENTED
**Current:** ~~Images saved to `Inbox/Images/` but not analyzed~~ **WORKING**
**Upgrade:** Image → Gemini Vision → Description + Context → Saved to memory

```python
# sms_server.py - WORKING PATTERN (2026-01-19)
from google import genai
from google.genai import types

client = genai.Client(api_key=GOOGLE_API_KEY)

def analyze_image(image_path):
    with open(image_path, "rb") as f:
        image_data = f.read()
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[
            "Describe this image. Extract any text.",
            types.Part.from_bytes(data=image_data, mime_type="image/jpeg")
        ]
    )
    return response.text
```

**Effort:** ~~30 min~~ DONE | **Impact:** 🔥🔥🔥 "Photograph whiteboard → Extract notes → Save to vault"

---

#### 1.3 Skill Execution Router
**Current:** `create` intent uses LLM but can't trigger actual skills
**Upgrade:** Map phrases to skill invocations

```python
SKILL_TRIGGERS = {
    "generate image": "Artist",
    "create banner": "BannerGenerator",
    "brainstorm": "Brainstorm",
    "review code": "CodeReview",
    "analyze this": "Critic",
}

def handle_create(request: str) -> dict:
    for phrase, skill in SKILL_TRIGGERS.items():
        if phrase in request.lower():
            # Queue skill execution
            return handle_queue(f"skill:{skill} {request}")
```

**Effort:** ~1 hour | **Impact:** 🔥🔥🔥 "SMS: generate image of a sunrise" → Image in your inbox

---

#### 1.4 Contextual Memory (Session Quotes)
**Current:** `idea:`, `plan:`, `remember:` triggers log to CNS
**Upgrade:** Auto-detect insightful statements and log them

```python
QUOTE_SIGNALS = [
    r"I (think|believe|realized)",
    r"the key is",
    r"what if we",
    r"note to self",
    r"important:",
]

def auto_capture(message):
    for pattern in QUOTE_SIGNALS:
        if re.search(pattern, message, re.IGNORECASE):
            cns.add_quote(message, tag="Auto-Capture")
            return True
    return False
```

**Effort:** ~30 min | **Impact:** 🔥🔥 Never lose a thought. The Capture Protocol works passively.

---

### TIER 2: MEDIUM EFFORT / GAME CHANGERS 🧠
> *These require more work but unlock new paradigms*

#### 2.1 Proactive Alerts System ("The Watchtower")
**Current:** Oracle only responds to incoming messages
**Upgrade:** Oracle monitors conditions and sends alerts unprompted

**Use Cases:**
- Weather alert for Oklahoma (tie into Weather Wars)
- "Your scheduled task is overdue" reminders
- "Build completed" or "Deployment finished" notifications
- Market/stock alerts
- Calendar reminders

```python
# watchtower.py
import schedule
from twilio.rest import Client

def check_weather_alerts():
    # Query NWS or Weather Wars API
    if alert_exists:
        send_sms("🌪️ WEATHER ALERT: Tornado Watch issued for OKC.")

def check_task_reminders():
    overdue = get_overdue_tasks()
    if overdue:
        send_sms(f"📋 Overdue: {overdue[0]['title']}")

def send_sms(message):
    client = Client(SID, TOKEN)
    client.messages.create(to=MY_NUMBER, from_=TWILIO_NUMBER, body=message)

schedule.every(15).minutes.do(check_weather_alerts)
schedule.every().hour.do(check_task_reminders)
```

**Effort:** ~2-3 hours | **Impact:** 🔥🔥🔥🔥 Oracle becomes proactive, not just reactive

---

#### 2.2 Continuity Protocol ("The Handoff")
**Current:** Ideas sent via SMS are processed but not surfaced when you return to AG
**Upgrade:** Create a "Welcome Back" brief when you open Antigravity

**Flow:**
1. SMS ideas → Queue with `source: sms` tag
2. On AG session start → Check for queued SMS items
3. Display: "📱 While you were away: 3 ideas, 1 task, 1 code request"

```python
# Add to context_loader.py
def get_mobile_queue():
    inbox_files = list_files(PIPOS_INBOX)
    sms_items = [f for f in inbox_files if "source: sms" in read_file(f)]
    return sms_items

def welcome_back_brief():
    items = get_mobile_queue()
    if items:
        return f"📱 While you were away:\n" + "\n".join([f"• {summarize(i)}" for i in items])
```

**Effort:** ~1-2 hours | **Impact:** 🔥🔥🔥 Seamless mobile → desktop continuity

---

#### 2.3 Deep Brain Integration (Semantic Search)
**Current:** Simple inverted index with token matching
**Upgrade:** Embeddings-based semantic search via Gemini

```python
import google.generativeai as genai

def embed_text(text):
    model = genai.GenerativeModel("models/text-embedding-004")
    result = model.embed_content(text)
    return result['embedding']

def semantic_search(query, top_k=5):
    query_vec = embed_text(query)
    # Compare against stored embeddings
    # Return conceptually similar docs, not just keyword matches
```

**Benefit:** "Find things about scaling" returns docs about "growth patterns" even without the word "scaling"

**Effort:** ~2-3 hours | **Impact:** 🔥🔥🔥 Brain becomes conceptually aware, not just keyword-matching

---

#### 2.4 MMS Response (Send Images Back)
**Current:** Oracle can only send text
**Upgrade:** Send generated images via MMS

```python
from twilio.rest import Client

def send_mms(to, body, image_url):
    client = Client(SID, TOKEN)
    client.messages.create(
        to=to,
        from_=TWILIO_NUMBER,
        body=body,
        media_url=[image_url]  # Must be public URL
    )
```

**Flow:**
1. "Generate an image of a dragon"
2. → Artist skill generates image
3. → Upload to R2 (public URL)
4. → Send MMS with image attached

**Effort:** ~1-2 hours | **Impact:** 🔥🔥🔥 Visual responses directly on phone

---

### TIER 3: HIGH EFFORT / LEGENDARY 🏆
> *The nuclear options. Major undertakings for maximum power.*

#### 3.1 Real-Time Voice Agent ("Cortana Mode")
**Current:** No real-time voice
**Upgrade:** Call your Twilio number → Talk to Pip → Get spoken response

**Tech Stack:**
- Twilio Voice API + TwiML
- Google Speech-to-Text (streaming)
- Google Text-to-Speech
- WebSocket connection for real-time

**Flow:**
1. Call Twilio number
2. Twilio streams audio to your server
3. Transcribe in real-time
4. Process with Pip Core
5. TTS response back through call

**Effort:** ~1-2 days | **Impact:** 🔥🔥🔥🔥🔥 Hands-free Oracle while driving

---

#### 3.2 Location-Aware Context ("Field Mode")
**Current:** No location awareness
**Upgrade:** "Where am I?" triggers location-based responses

**Options:**
1. **Tasker/IFTTT Integration:** Phone shares location to webhook
2. **SMS Command:** "location: 35.4676, -97.5164" → Auto-parse
3. **Geo-Fencing:** Different personas based on location
   - **At home:** Full capabilities
   - **At client site:** Freelance Mode activated
   - **On the road:** Minimal, voice-friendly responses

**Effort:** ~3-4 hours | **Impact:** 🔥🔥🔥 Context-aware assistance

---

#### 3.3 Multi-Channel Fusion
**Current:** SMS and Discord are separate
**Upgrade:** Unified conversation across all channels

**Features:**
- Start conversation on SMS, continue on Discord
- Push notifications to multiple channels based on urgency
- Channel-appropriate formatting (SMS short, Discord rich)

**Effort:** ~4-6 hours | **Impact:** 🔥🔥🔥 One conversation, many windows

---

#### 3.4 Autonomous Agent Mode ("Nightwing")
**Current:** Oracle executes single commands
**Upgrade:** Oracle can chain tasks autonomously

**Example:**
> "Research competitor X, summarize their features, compare to Weather Wars, and create a one-page strategic brief"

**Flow:**
1. Parse as multi-step task
2. Execute each step, passing output to next
3. Chain: Search → Summarize → Compare → Generate Doc
4. Return final artifact link

**Effort:** ~1 day | **Impact:** 🔥🔥🔥🔥🔥 True agent behavior, not just command executor

---

## 📋 RECOMMENDED IMPLEMENTATION ORDER

### Phase 1: Foundation (This Week)
1. ✅ Fix any existing bugs in SMS → Email chain
2. ✅ **Voice Transcription** (Tier 1.1) — Gemini audio (2026-01-19)
3. ✅ **Image Analysis** (Tier 1.2) — Gemini Vision (2026-01-19)
4. ✅ **Skill Router** (Tier 1.3) — Map phrases to skills (in `pip_core.py`)

### Phase 2: Intelligence (Next Week)
5. 🧠 **Contextual Memory** (Tier 1.4) — Auto-capture insights
6. 🧠 **Continuity Protocol** (Tier 2.2) — Mobile → Desktop handoff
7. 🧠 **Proactive Alerts** (Tier 2.1) — Weather, reminders, builds

### Phase 3: Power (Following Week)
8. 💪 **Semantic Search** (Tier 2.3) — Embeddings-based Brain
9. 💪 **MMS Responses** (Tier 2.4) — Send images back
10. 💪 **Voice Agent** (Tier 3.1) — Phone call interface

### Phase 4: Legendary (When Ready)
11. 🏆 **Location Awareness** (Tier 3.2)
12. 🏆 **Multi-Channel Fusion** (Tier 3.3)
13. 🏆 **Autonomous Agent** (Tier 3.4)

---

## 🛠️ QUICK WINS TO DO RIGHT NOW

### 1. Fix the duplicate MODELS dict in `llm_layer.py`
```python
# Line 23-31 has duplicated MODELS = { definition
# Should be:
MODELS = {
    "opus": "gemini-1.5-pro-002",
    "sonnet": "gemini-1.5-pro-002",
    "flash": "gemini-2.5-flash",
    "gpt4": "gemini-1.5-pro-002",
    "quick": "gemini-2.5-flash",
}
```

### 2. Add missing keyword patterns to `pip_core.py`
```python
# Add to INTENT_PATTERNS
"weather": r"^(weather|forecast|temperature)",  # Quick weather check
"contact": r"^(call|text|email|contact)\s+(.+)",  # Contact lookup
"project": r"^(project|show me|what about)\s+(.+)",  # Project status
```

### 3. Create a startup script for Oracle
```powershell
# oracle_start.ps1
Write-Host "🔮 ORACLE STARTUP SEQUENCE" -ForegroundColor Cyan

# Kill zombies
taskkill /F /IM ngrok.exe 2>$null
Start-Sleep -Seconds 1

# Start SMS Server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\nug\PiPos\Toolbox\sms_agent; python sms_server.py"

# Start Worker
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\nug\PiPos\Toolbox; python pip_worker.py"

Write-Host "✅ Oracle Systems Online" -ForegroundColor Green
```

---

## 📌 DECISION POINTS FOR YOU

> [!IMPORTANT]
> **I need your input on these:**

1. **Voice Priority:** Do you want voice transcription (Whisper) as the first enhancement, or is image analysis more valuable for your workflow?

2. **Proactive Alerts:** What should Oracle alert you about?
   - Weather warnings? (already have Weather Wars data)
   - Task reminders?
   - Build/deployment status?
   - Something else?

3. **Phone Calls:** Is the real-time voice agent ("Call Pip") something you'd actually use, or is SMS sufficient?

4. **Budget Constraints:** Whisper API and some Google services have costs. Are monthly API costs of $20-50 acceptable for full Oracle power?

5. **Auto-Start:** Should Oracle start automatically on Windows boot, or do you prefer manual startup?

---

## 🏗️ ARCHITECTURE AFTER UPGRADES

```
┌─────────────────────────────────────────────────────────────────────┐
│                        📱 MOBILE LAYER                              │
├─────────────┬─────────────┬─────────────┬─────────────┬────────────┤
│    SMS      │    MMS      │   Voice     │   Discord   │  Location  │
│  (Twilio)   │  (Images)   │  (Whisper)  │   (Bot)     │  (Tasker)  │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴──────┬─────┘
       │             │             │             │             │
       └─────────────┴──────┬──────┴─────────────┴─────────────┘
                            │
                   ┌────────▼────────┐
                   │  🧠 CLOUD BRAIN │  (Railway)
                   │     FastAPI     │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │   pip_core.py   │
                   │   (The Router)  │
                   └────────┬────────┘
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
┌──────▼──────┐     ┌───────▼───────┐    ┌──────▼──────┐
│   🧠 Brain  │     │   🤖 LLM     │    │  ⚡ Skills  │
│  Semantic   │     │    Layer     │    │   Router    │
│   Search    │     │  (Gemini)    │    │  (Actions)  │
└─────────────┘     └──────────────┘    └──────┬──────┘
                                               │
                    ┌──────────────────────────┼──────────────────┐
                    │                          │                  │
             ┌──────▼──────┐           ┌───────▼──────┐   ┌──────▼──────┐
             │   Artist    │           │  Brainstorm  │   │  File Ops   │
             │  (Image)    │           │  (Ideas)     │   │  (Scripts)  │
             └─────────────┘           └──────────────┘   └─────────────┘
                            │
                   ┌────────▼────────┐
                   │  📤 RESPONSE    │
                   │  (MMS/Link/TTS) │
                   └─────────────────┘
```

---

## 🎬 THE END STATE

When this is done, you'll be able to:

✅ **Voice note an idea while driving** → Transcribed, analyzed, saved to vault, waiting for you in AG

✅ **Photograph a whiteboard** → OCR'd, parsed, converted to tasks

✅ **Say "What's the weather alert situation?"** → Get live NWS data for Oklahoma

✅ **Text "Generate a logo for my new app"** → Receive an MMS with the generated image

✅ **Get proactive alerts** → "🌪️ Tornado Watch - Take shelter" without asking

✅ **Continue any conversation** → Start on phone, finish on desktop

✅ **Execute complex tasks** → "Research X and write me a summary" runs autonomously

**This IS Batman's Oracle.** Barbara Gordon with full access to every camera, database, and system in the city. Except your city is your creative work.

---

*"Damn...you sold me Pip...pull that trigger!" — phloid, 2026*
