---
description: How to properly close a session and save handover notes
---

# Shutdown Protocol

When phloid says "I'm going to bed," "Goodnight," "End session," or "run shutdown":

## 1. Generate Session Journal
Create a markdown report with:
- **Timestamp** (Current date/time)
- **✅ Accomplished**: What actually got done
- **🚧 Left Hanging**: What is unfinished
- **😤 Hassles**: Bugs, errors, or annoyances encountered

## 2. Generate Black Box (Handover Packet)
Include:
- Active project paths and URLs
- Key files table
- Outstanding bugs
- Approved features not yet implemented
- Any critical context for resuming

## 3. Save to Obsidian
// turbo
Write the handover to: `c:\Users\nug\PiPos\Handover\YYYY-MM-DD_Handover.md`

**CRITICAL**: The entire `c:\Users\nug\PiPos\` folder IS the Obsidian vault. The `Handover` subfolder is synced to all devices.

## 4. Update Pip's Diary
Update `Pip_Diary_Latest.md` with:
- Date and session title
- Key lessons or insights from the session
- Design philosophy notes (if applicable)
- Self-improvement items
- Archive summary of previous entry (1-2 lines)

## 5. Validate Handover Completeness
Before confirming completion, verify ALL FOUR files exist and are current:
- [ ] `Session_Journal_Latest.md` — timestamped today
- [ ] `BlackBox_Latest.json` — timestamped today
- [ ] `YYYY-MM-DD_Handover.md` — dated file exists
- [ ] `Pip_Diary_Latest.md` — dated today

**DO NOT confirm shutdown until all four are verified.**

## 6. Confirm Completion
Notify user that the session is packed and ready for Obsidian review.
