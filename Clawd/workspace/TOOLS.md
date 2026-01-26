# TOOLS.md - Local Notes

Skills define *how* tools work. This file is for *your* specifics — the stuff that's unique to your setup.

---

## 🔋 Token Pools

| Pool | Provider | Used By | Limits | Check |
|------|----------|---------|--------|-------|
| Claude Max | Anthropic OAuth | Clawdbot, Claude Code | 5hr/day, weekly | https://console.anthropic.com/settings/plans |
| OpenRouter | OpenRouter | Backup/routing | Pay-per-use | https://openrouter.ai/activity |
| Gemini $20 | Google AI Studio | Brain, AG scripts | Generous, rarely hit | https://aistudio.google.com/app/billing |

### Model Preferences

| Default | Fallback | Use Case |
|---------|----------|----------|
| Opus 4.5 | Sonnet 4.5 | General work |
| Gemini 3 Pro | Opus 4.5 | Massive context (1M+ tokens) |
| Haiku 4.5 | Gemini Flash | Quick/cheap tasks |

**Quick check:** Ask Pip "token status" or run `python C:\Users\nug\PiPos\scripts\token_status.py`

---

## 🧠 Brain Access

| Command | What It Does |
|---------|--------------|
| `python scripts\pip_brain.py "question"` | Query Gemini with vault context |
| `python scripts\pip_brain.py --local "query"` | BM25 local search |
| `python scripts\brain_query.py --sync` | Rebuild full Gemini cache (slow) |

**Context files loaded:** CONTINUITY.md, pip_memory.json, Project_Ecosystem.md, BlackBox_Latest.json

---

## 🖥️ Hardware

### Machines
- **PROARTPX13** (Antigravity) — Main desktop/laptop, Windows
- **Tailscale IP:** 100.75.27.94

### Mobile
- **samsung-sm-s918u** — phloid's phone (Tailscale: 100.119.249.52)

---

## 🌐 Network

- **Tailscale:** chickenrulez.db@ tailnet
- **ngrok:** Available for public tunnels

---

## What Else Goes Here

Things like:
- Camera names and locations
- SSH hosts and aliases  
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

---

Add whatever helps you do your job. This is your cheat sheet.
