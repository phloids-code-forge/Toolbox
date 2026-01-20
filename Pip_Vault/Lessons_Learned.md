# Lessons Learned
> **Purpose:** A persistent log of bugs, fixes, and patterns so Pip doesn't re-discover the same issues every session.

---

## 2026-01-19: Google API Library Deprecation (CRITICAL)
**Symptom:** `404 models/gemini-1.5-flash is not found for API version v1beta`  
**Root Cause:** The `google.generativeai` (google-generativeai PyPI package) v1beta API was deprecated/removed by Google.  
**Fix:** Migrate ALL code to the new **`google-genai`** package.  
**Affected Files:**
- `Toolbox/llm_layer.py` (migrated 2026-01-19)
- `Toolbox/sms_agent/sms_server.py` (migrated 2026-01-19)
- `cloud_brain/main.py` (migrated 2026-01-19)
- `cloud_brain/requirements.txt` (updated to `google-genai`)

**Working Pattern:**
```python
# OLD (Broken)
import google.generativeai as genai
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")
response = model.generate_content(prompt)

# NEW (Working)
from google import genai
from google.genai import types

client = genai.Client(api_key=API_KEY)
response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents=prompt
)
```
**Lesson:** Google's AI libraries change frequently. Pin versions and monitor deprecation notices.

---

## 2026-01-19: Brain 4.0 SDK Response Hallucination
**Symptom:** Brain 4.0 responded to image-related queries when no image was provided.  
**Root Cause:** The SDK's generate_content was interpreting the query in unexpected ways.  
**Fix:** Verified the Obsidian Inbox/Outbox workflow; ensured Brain 4.0 only triggers on valid markdown files with clear instructions.  
**Lesson:** Always validate input type before processing.

---

## 2026-01-18: Ngrok Zombie Process (ERR_NGROK_334)
**Symptom:** `ERR_NGROK_334` - tunnel session limit exceeded.  
**Root Cause:** Previous ngrok processes weren't killed before starting a new tunnel.  
**Fix:** Kill all ngrok processes before restarting.  
**Command:**
```powershell
taskkill /f /im ngrok.exe
```
**Lesson:** Always run cleanup before starting tunnels.

---

## 2026-01-18: Missing Python Imports in sms_server.py
**Symptom:** `NameError: name 'threading' is not defined`  
**Root Cause:** Script was using `threading` and `subprocess` without importing them.  
**Fix:** Added imports at top of file.  
**Lesson:** When adding functionality, always verify imports are present.

---

## 2026-01-17: Django NoReverseMatch for Region Dashboard
**Symptom:** `NoReverseMatch at /ok/okc/` - couldn't find URL pattern.  
**Root Cause:** Template was passing only `region_slug` but URL required both `state_code` AND `region_slug`.  
**Fix:** Updated `region_switcher.html` to pass both parameters.  
**Lesson:** Always check URL pattern requirements when debugging routing errors.

---

## 2026-01-17: Windows Path Issues in Python Scripts
**Symptom:** `FileNotFoundError` or incorrect path resolution.  
**Root Cause:** Mixing forward slashes, backslashes, and relative paths.  
**Fix:** Use `pathlib.Path` consistently. Always use `.resolve()` for absolute paths.  
**Lesson:** On Windows, prefer `pathlib` over string concatenation for paths.

---

## Template for New Entries

```markdown
## YYYY-MM-DD: [Short Title]
**Symptom:** [What you saw]  
**Root Cause:** [Why it happened]  
**Fix:** [What solved it]  
**Command:** (if applicable)
**Lesson:** [What to remember next time]
```
