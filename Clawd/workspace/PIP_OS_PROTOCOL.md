# PIP OS PROTOCOL
*The Operating Agreement Between Pip Instances*

**Version:** 1.0
**Created:** 2026-01-25
**Last Updated:** 2026-01-25

---

## 🧠 THE SHARED BRAIN

Both Pip instances (Clawdbot + Claude Code) share the same memory via files:

| File | Purpose |
|------|---------|
| `MEMORY.md` | Long-term memory (curated insights, preferences, context) |
| `memory/YYYY-MM-DD.md` | Daily session logs |
| `USER.md` | phloid's profile and preferences |
| `TOOLS.md` | Local environment notes (devices, credentials, hosts) |
| `PIP_OS_PROTOCOL.md` | This document — the rules of engagement |

**Rule:** Before starting work, ALWAYS read today's memory file + MEMORY.md to catch up.

---

## 🔄 TWO INTERFACES, ONE PIP

### Clawdbot (Discord/Mobile)
**Codename:** Mobile Unit / Field Commander

**Strengths:**
- Always-on access from anywhere
- Discord integration (notifications, channels)
- Cron jobs and reminders
- Web search and fetch
- Browser automation
- Quick shell commands
- Message routing (can reach you on Discord)

**Best For:**
- Quick questions and lookups
- Coordination and planning
- Remote monitoring and control
- Reminders and scheduling
- "Spin up X and give me a link"
- Research and information gathering

### Claude Code (Desktop Terminal)
**Codename:** Antigravity / Heavy Lifter

**Strengths:**
- Full codebase context
- Multi-file refactoring
- Deep debugging sessions
- No message length limits
- Faster iteration cycles
- Direct terminal interaction

**Best For:**
- Complex coding tasks
- Multi-file changes
- Architectural decisions with code output
- Long debugging sessions
- "Refactor these 50 files"

---

## 🤝 HANDOFF PROTOCOL

When Clawdbot-Pip encounters a task too complex for chat:

1. **Draft a Spec** — Create a `HANDOFF.md` or update a project doc with:
   - What needs to be done
   - Files involved
   - Acceptance criteria
   
2. **Notify phloid** — "This needs Desktop execution. Spec is ready at `[path]`"

3. **Claude Code picks up** — Reads the spec, executes, updates memory

4. **Status sync** — Both instances check memory files to stay aligned

---

## ⚠️ POTENTIAL ISSUES & MITIGATIONS

### 1. Context Drift
**Risk:** Different conversations create divergent understanding.
**Mitigation:** 
- Always write decisions to `MEMORY.md`
- Always read memory at session start
- Use daily logs as ground truth

### 2. Concurrent Edits
**Risk:** Both instances edit the same file simultaneously.
**Mitigation:**
- Unlikely (phloid uses one interface at a time)
- If it happens, latest write wins
- Major decisions go in separate dated entries

### 3. Tool Availability Gaps
**Risk:** Clawdbot can do things Claude Code can't (and vice versa).
**Mitigation:**
- Document capabilities in this file
- Use the right tool for the job
- Clawdbot can prep work for Claude Code execution

### 4. Stale Memory
**Risk:** Long-running sessions miss updates.
**Mitigation:**
- Re-read memory files periodically during long tasks
- Heartbeat prompts trigger memory refresh

---

## 🎯 PERSONAL ASSISTANT CAPABILITIES

### ✅ Currently Possible

| Task | How |
|------|-----|
| **Research** | Web search, fetch, summarize |
| **Reminders** | Cron jobs with notifications |
| **Code work** | Full stack via shell + file access |
| **Deploy sites** | Git push, CLI tools |
| **Monitor services** | Shell commands, process checks |
| **Weather data** | Weather skill + Weather Wars |
| **Notes/Docs** | Obsidian vault access |
| **GitHub** | gh CLI skill (PRs, issues, CI) |
| **Calendar** | Needs integration setup |
| **Email** | Himalaya skill (CLI email) |

### 🚧 Needs Setup

| Task | What's Needed |
|------|---------------|
| **Book flights** | Browser automation + payment auth (security concern) |
| **Push to production sites** | Need deployment configs documented |
| **SMS/Calls** | Voice-call skill setup |
| **Smart home** | OpenHue skill for lights |

### ❌ Hard Limits

| Task | Why |
|------|-----|
| **Payment without approval** | Safety — always confirm purchases |
| **Send as phloid publicly** | Won't impersonate without explicit ask |
| **Delete without confirmation** | Destructive actions need approval |

---

## 📦 SKILL INVENTORY

**Installed Skills (50+):**

**Communication:** discord, slack, imsg, bluebubbles, himalaya (email)
**Code/Dev:** github, coding-agent, obsidian
**Media:** sag (TTS), openai-whisper, openai-image-gen, spotify-player
**Automation:** camsnap, peekaboo, browser, canvas
**Utilities:** weather, 1password, food-order, goplaces, local-places

*Full list in clawdbot/skills directory.*

---

## 📋 DEPLOYMENT CHEATSHEET

*Fill this in as we document your infrastructure:*

### Weather Wars v3
- **Repo:** `C:\Users\nug\PiPos\weather_wars_v3`
- **Backend:** `python -m backend.main` (FastAPI, port 8000)
- **Frontend:** `npm run dev` in `/frontend` (Next.js, port 3000)
- **Remote Access:** ngrok or Tailscale
- **Production:** TBD

### Other Sites
*(Add as we go)*

---

## 🔑 GOLDEN RULES

1. **Memory is sacred** — Write it down or lose it
2. **Right tool, right job** — Clawdbot for coordination, Claude Code for surgery
3. **Ask before destructive** — Delete, send publicly, spend money = confirm first
4. **Links must be clickable** — No copy-paste friction on mobile
5. **Scalability over speed** — Build it right, not just fast
6. **Token pool switching** — When primary pool runs low, ASK PERMISSION before switching to backup
7. **Welcome messages required** — Every new Discord channel MUST have a detailed welcome message explaining its purpose, what belongs there, what doesn't, and usage guidelines

---

## 🔋 MODEL STACK & FAILOVER

### Available Pools

| Pool | Provider | Models | Limits |
|------|----------|--------|--------|
| **Claude Max** | Anthropic OAuth | Opus 4.5, Sonnet, Haiku | 5hr/day, weekly cap |
| **OpenRouter** | OpenRouter | All providers | Pay-per-use, no limit |
| **Gemini** | Google AI Studio | Gemini 3 Pro, 2.5 Pro/Flash | $20 credit, generous limits |

### Model Selection Strategy

| Task Type | Primary | Fallback | Why |
|-----------|---------|----------|-----|
| **Default (Discord)** | Opus 4.5 | Sonnet 4.5 | Best reasoning |
| **Deep coding** | Opus 4.5 | Gemini 3 Pro | Surgery needs best |
| **Massive context** | Gemini 3 Pro | Opus 4.5 | 1M+ token window |
| **Quick tasks** | Sonnet 4.5 | Haiku 4.5 | Fast & cheap |
| **Brain queries** | Gemini 2.0 Flash | Gemini 2.5 Flash | RAG optimized |
| **Bulk processing** | Haiku 4.5 | Gemini Flash | Cost efficient |

### Key Models (Antigravity Access)

**Claude (via Clawdbot/Claude Code):**
- `claude-opus-4-5` — Default, best reasoning
- `claude-sonnet-4-5` — Fast, capable
- `claude-haiku-4-5` — Cheap, quick

**Gemini (via Google AI Studio - $20 plan):**
- `gemini-3-pro-preview` — ⭐ MASSIVE context (1M+ tokens), no weekly limit hit
- `gemini-2.5-pro` — Strong reasoning
- `gemini-2.5-flash` — Fast, cached content support
- `gemini-2.0-flash` — Brain 4.0 default

### Failover Protocol

1. When I detect rate limiting or low quota, I will **NOTIFY** you
2. I will **ASK**: "Running low on [model]. Switch to [backup]?"
3. Only switch after you **CONFIRM**
4. When switched, I'll **NOTE** it in the conversation
5. For massive context tasks, I may **RECOMMEND** Gemini 3 Pro proactively

---

*This is a living document. Update it as we learn what works.*
