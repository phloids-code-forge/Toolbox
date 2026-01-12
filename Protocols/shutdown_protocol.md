# 📋 SHUTDOWN PROTOCOL v2

## Trigger
When phloid says "I'm going to bed," "Goodnight," or "End session."

## Required Actions

### 1. Session Journal
Generate a report with **System Timestamp**:
- **✅ Accomplished:** What actually got done.
- **🚧 Left Hanging:** What is unfinished.
- **😤 Hassles:** Bugs, errors, or annoyances hit.

### 2. Expert Updates
- Review which Experts were used this session.
- Update their "Active Projects" sections with new context.
- Create new Experts if a skill gap was identified.

### 3. Character/Lore Updates
- If any characters were discussed, update their bible in `/Characters`.
- Create new character bibles for any new characters.

### 4. Black Box (Handover Packet)
Generate raw data block containing **EVERYTHING** a fresh AI instance needs:
- File structure status
- Active variables
- Strategy shifts
- Git status

### 5. Git Commit
Commit all changes with shutdown timestamp.

## Output Location
`Handover/YYYY-MM-DD_Handover.md`
