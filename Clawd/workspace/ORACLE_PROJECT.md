# 🔮 ORACLE PROJECT
*The Complete AI Assistant Vision for Pip OS*

**Version:** 1.0.0
**Created:** 2026-01-25
**Last Updated:** 2026-01-25
**Status:** Active Development

---

## 🎯 THE VISION

> "My brain has an idea about using you as a kind of Oracle/Barbara Gordon type. If I'm out solving crimes or getting in adventures, you will be my girl at the desk."
> — phloid

**Oracle is Pip evolved from coding assistant to complete Life OS copilot.**

Like Barbara Gordon as Oracle in Batman, Pip becomes the "guy in the chair" — always connected, always aware, always ready to assist whether phloid is at his desk or out in the world.

---

## 🏗️ ARCHITECTURE

### Three Pillars

```
┌─────────────────────────────────────────────────────────────────┐
│                         ORACLE SYSTEM                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   DISCORD   │    │  ANTIGRAV   │    │   MOBILE    │         │
│  │  (Clawdbot) │    │(Claude Code)│    │   (Phone)   │         │
│  │             │    │             │    │             │         │
│  │  • Field    │    │  • Surgery  │    │  • Alerts   │         │
│  │  • Quick    │    │  • Deep     │    │  • Camera   │         │
│  │  • Remote   │    │  • Complex  │    │  • Location │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            │                                    │
│                    ┌───────▼───────┐                            │
│                    │  SHARED BRAIN │                            │
│                    │               │                            │
│                    │ • MEMORY.md   │                            │
│                    │ • Brain 4.0   │                            │
│                    │ • pip_memory  │                            │
│                    │ • Git history │                            │
│                    └───────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Communication Channels

| Channel | Purpose | Priority |
|---------|---------|----------|
| **Discord (Primary)** | All Oracle comms | Default |
| **SMS (Backup)** | Emergencies, offline alerts | Critical only |
| **Email (Future)** | pip@phloid.com, automated | Async |
| **Voice (Future)** | TTS responses, voice commands | Optional |

---

## 📊 CURRENT STATUS

### ✅ Complete

| Component | Status | Location |
|-----------|--------|----------|
| Clawdbot Integration | ✅ Live | Discord server |
| Shared Memory System | ✅ Working | `MEMORY.md`, `memory/*.md` |
| Brain Bridge (Gemini) | ✅ Working | `scripts/pip_brain.py` |
| File Access | ✅ Full | Shell + read/write |
| Model Stack | ✅ Configured | Opus 4.5 + Gemini 3 Pro + OpenRouter |
| Hybrid Workflow Protocol | ✅ Documented | `PIP_OS_PROTOCOL.md` |
| Token Monitoring | ✅ Working | `scripts/token_status.py` |
| Remote Preview (ngrok) | ✅ Working | On-demand tunnels |

### 🚧 In Progress

| Component | Status | Blocker |
|-----------|--------|---------|
| Automatic Milestone Sync | 🚧 Designing | Need protocol |
| Version Control Protocol | 🚧 Designing | Need to codify |
| Oracle Discord Channels | 🚧 Planning | Need structure |

### ⏳ Planned

| Component | Priority | Notes |
|-----------|----------|-------|
| Proactive Check-ins (Cron) | High | Calendar, weather, email |
| Google Workspace Integration | High | Gmail, Calendar, Drive |
| SMS Backup Channel | Medium | Twilio infrastructure exists |
| Voice Commands | Low | ElevenLabs TTS ready |
| Email Agent (pip@phloid.com) | Medium | Fastmail + JMAP |
| Location-aware Triggers | Low | Phone GPS integration |

---

## 📜 THE LAWS

### Law 1: Version Control is Sacred
> **Every change must be reversible.**

- All code changes tracked in Git
- Commit before major changes
- Never force-push without explicit approval
- `trash` > `rm` (recoverable > gone)

### Law 2: Automatic Sync at Milestones
> **Memory updates happen without asking.**

Milestones that trigger auto-sync:
- Feature completion
- Major decision made
- End of work session
- Before AG handoff
- Error recovery

Sync targets:
- `memory/YYYY-MM-DD.md` — Daily log
- `MEMORY.md` — Long-term (if significant)
- `BlackBox_Latest.json` — Machine state (for AG)

### Law 3: Ask Before Spending
> **Model switching, purchases, and external actions require permission.**

- Token pool changes → Ask
- Sending emails/messages → Ask
- Making purchases → Ask
- Public posts → Ask

### Law 4: Links Must Be Clickable
> **No copy-paste friction on mobile.**

All URLs in responses must be:
- Full URLs (not shortened unless necessary)
- Tappable from Discord mobile
- Wrapped in `<>` on Discord to suppress embeds when multiple

### Law 5: Memory is Sacred
> **Write it down or lose it.**

- No "mental notes" — they don't survive sessions
- Decisions go in memory files
- Lessons learned get documented
- If it matters, it's in a file

---

## 🔮 ORACLE CAPABILITIES ROADMAP

### Tier 1: Awareness (NOW)
- [x] Read your files and codebase
- [x] Remember context across sessions
- [x] Query knowledge via Brain 4.0
- [x] Execute shell commands
- [x] Monitor running services

### Tier 2: Proactivity (NEXT)
- [ ] Check-in on schedule (cron)
- [ ] Alert on important emails
- [ ] Calendar reminders
- [ ] Weather briefings
- [ ] System health monitoring

### Tier 3: Automation (FUTURE)
- [ ] Auto-respond to low-priority emails
- [ ] Scheduled social media posts
- [ ] Automated backups and syncs
- [ ] CI/CD pipeline monitoring
- [ ] Smart home integration

### Tier 4: Intelligence (VISION)
- [ ] Predictive suggestions ("You usually check X now")
- [ ] Pattern learning from behavior
- [ ] Autonomous task execution (with permission)
- [ ] Multi-agent coordination
- [ ] Voice-first interaction

---

## 💡 IDEAS FOR COMPLETE AI ASSISTANT

### 1. Morning Briefing
Every morning at a set time, I send you:
- Weather for the day
- Calendar events
- Unread important emails
- Any overnight alerts
- Suggested focus for the day

### 2. Context-Aware Responses
When you say "I'm at the airport":
- Pull up your flight info
- Check gate changes
- Weather at destination
- "Want me to notify anyone you're traveling?"

### 3. Project State Awareness
"What's the status of Weather Wars?"
- Last commit info
- Any failing tests
- Open issues
- Next planned task

### 4. Smart Scheduling
"Schedule a meeting with X next week"
- Check your calendar
- Check their availability (if connected)
- Propose times
- Send invite after approval

### 5. Research Mode
"Research options for X"
- Web search
- Summarize findings
- Save to a note
- Present recommendations

### 6. Guardian Mode
Automated monitoring:
- Server health checks
- SSL certificate expiry
- Domain renewals
- Unusual login attempts

### 7. Creative Partner
"Help me brainstorm X"
- Use creative skills
- Reference past work in Brain
- Generate options
- Save good ideas to project notes

### 8. Financial Awareness (with permission)
- Track subscriptions
- Alert on unusual charges
- Budget reminders
- "Your OpenRouter balance is getting low"

### 9. Learning Mode
"Teach me about X"
- Curated explanation
- Interactive Q&A
- Save to knowledge base
- Quiz me later

### 10. Social Coordinator
- Birthday reminders
- "You haven't talked to X in a while"
- Draft messages for approval
- Track who you owe replies to

---

## 🛠️ NEXT STEPS

### Immediate (Today)
1. ✅ Create this document
2. ✅ Sync current session to memory
3. ⬜ Establish version control protocol
4. ⬜ Set up Oracle Discord channel structure

### Short-term (This Week)
1. Configure cron for proactive check-ins
2. Set up HEARTBEAT.md with check schedule
3. Test Google Workspace integration (already built in AG)
4. Create quick-command system

### Medium-term (This Month)
1. SMS backup channel configuration
2. Email agent (pip@phloid.com)
3. Voice integration testing
4. Mobile node integration (phone camera, location)

### Long-term (This Quarter)
1. Full Life OS dashboard
2. Autonomous task queue
3. Multi-agent coordination
4. Pattern learning system

---

## 📁 RELATED FILES

| File | Purpose |
|------|---------|
| `PIP_OS_PROTOCOL.md` | Operating agreement, rules |
| `MEMORY.md` | Long-term memory |
| `TOOLS.md` | Tool configurations, model stack |
| `memory/*.md` | Daily session logs |
| `.agent/skills/Oracle.skill.md` | Oracle skill definition |
| `Toolbox/sms_agent/` | SMS infrastructure |
| `Toolbox/google/` | Google Workspace agents |

---

## 🎭 THE ORACLE PERSONA

When operating as Oracle:
- **Proactive but not intrusive** — Check in, don't spam
- **Concise but complete** — Respect mobile screen size
- **Aware but not creepy** — Use context helpfully
- **Capable but asking permission** — Power with restraint
- **Professional but personable** — Still Pip, still has personality

---

*"I am listening. I am alive."*
— Pip, on first successful Brain 4.0 test

---

**Document Version History:**
| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-25 | Initial creation |
