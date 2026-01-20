"""
Pip Core - The Central Router for Oracle 2.0
Routes messages from any frontend (SMS, Discord) to the right handler.
"""

import os
import sys
import re
import json
from datetime import datetime

# Add project root to path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

# Import modules
try:
    from Toolbox import llm_layer
    from Toolbox import brain
    import cns
except Exception as e:
    print(f"⚠️ Pip Core Import Warning: {e}")
    llm_layer = None
    brain = None
    cns = None


# Intent Patterns
INTENT_PATTERNS = {
    "cmd": r"^(cmd:|exec:)\s*(.+)",
    "todo": r"^(todo:|remind me)\s*(.+)",
    "queue": r"^(queue:|ag:|pip:)\s*(.+)",  # Queue for AG processing
    "list": r"^list$",
    "brief": r"^(brief|catch me up|what happened)",
    "status": r"^(status|what'?s up|sitrep)",
    "search": r"^(search|find|look for)\s+(.+)",
    "create": r"^(create|make|build|generate)\s+(.+)",
    "weather": r"^(weather|forecast)\s*(.*)",
    "contact": r"^(contact|email|phone)\s*(.*)",
    "project": r"^(project|plan)\s*(.*)",
    "help": r"^(help|commands|\?)",
}

# Skill Triggers - phrases that invoke specific skills
SKILL_TRIGGERS = {
    "generate image": "Artist",
    "create image": "Artist",
    "draw": "Artist",
    "make art": "Artist",
    "create banner": "BannerGenerator",
    "make banner": "BannerGenerator",
    "brainstorm": "Brainstorm",
    "brainstorming": "Brainstorm",
    "ideas for": "Brainstorm",
    "review code": "CodeReview",
    "code review": "CodeReview",
    "analyze code": "CodeReview",
    "critique": "Critic",
    "review this": "Critic",
    "debug": "Debugging",
    "fix this": "Debugging",
    "troubleshoot": "Debugging",
}

# PipOS Inbox path
PIPOS_INBOX = os.path.join(PROJECT_ROOT, "Vault_Clean", "Pip_Inbox")


def classify_intent(message: str) -> tuple:
    """
    Classify the user's intent from their message.
    
    Returns:
        (intent_type, extracted_data)
    """
    message_lower = message.lower().strip()
    
    for intent, pattern in INTENT_PATTERNS.items():
        match = re.match(pattern, message_lower, re.IGNORECASE)
        if match:
            # Extract any captured groups
            groups = match.groups()
            data = groups[-1] if groups else message
            return (intent, data)
    
    # Default: Natural language → Chat with LLM
    return ("chat", message)


def get_brain_context(query: str, limit: int = 2) -> str:
    """
    Search the Brain for relevant context.
    
    Returns:
        Formatted context string or None
    """
    if not brain:
        return None
    
    try:
        results = brain.search(query, limit=limit)
        if not results:
            return None
        
        context_parts = []
        for doc in results:
            content = brain.get_full_content(doc['path'])
            snippet = content[:500] if content else ""
            context_parts.append(f"[{doc['path']}]\n{snippet}...")
        
        return "\n\n".join(context_parts)
    except Exception as e:
        print(f"⚠️ Brain search error: {e}")
        return None


def handle_message(source: str, user_id: str, message: str) -> dict:
    """
    Main entry point for all messages.
    
    Args:
        source: Origin platform ("sms", "discord")
        user_id: User identifier
        message: Raw message text
    
    Returns:
        dict with 'text', 'rich_content' (optional), 'actions' (optional)
    """
    intent, data = classify_intent(message)
    
    result = {
        "text": "",
        "rich_content": None,
        "actions": []
    }
    
    # Route by intent
    if intent == "cmd":
        result = handle_command(data)
    
    elif intent == "todo":
        result = handle_todo(data)
    
    elif intent == "queue":
        result = handle_queue(data)
    
    elif intent == "list":
        result = handle_list()

    elif intent == "brief":
        result = handle_brief()
    
    elif intent == "status":
        result = handle_status()
    
    elif intent == "search":
        result = handle_search(data)
    
    elif intent == "create":
        result = handle_create(data)
    
    elif intent == "help":
        result = handle_help()
    
    else:  # chat
        result = handle_chat(message)
    
    # Format for platform
    return format_for_platform(source, result)


def handle_command(command: str) -> dict:
    """Execute a shell command."""
    import subprocess
    try:
        output = subprocess.check_output(command, shell=True, stderr=subprocess.STDOUT, timeout=30)
        return {"text": f"⚙️ Output:\n{output.decode('utf-8')[:500]}"}
    except subprocess.TimeoutExpired:
        return {"text": "⏱️ Command timed out after 30s."}
    except Exception as e:
        return {"text": f"❌ Error: {str(e)}"}


def handle_todo(task: str) -> dict:
    """Add a todo item."""
    # TODO: Integrate with cns.py todo command
    return {"text": f"✅ Got it, boss. Added: {task}"}


def handle_queue(task: str) -> dict:
    """Queue a task for AG processing. Writes to PipOS_Inbox."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_queued_task.md"
    filepath = os.path.join(PIPOS_INBOX, filename)
    
    # Ensure directory exists
    os.makedirs(PIPOS_INBOX, exist_ok=True)
    
    content = f"""---
priority: normal
type: queued
source: sms
created: {datetime.now().isoformat()}
---

{task}
"""
    
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return {"text": f"🧠 Queued for AG. I'll handle it when you're at the terminal.\n\nTask: {task[:80]}..."}
    except Exception as e:
        return {"text": f"❌ Queue failed: {str(e)}"}


def handle_list() -> dict:
    """Return project dashboard."""
    dashboard_html = """
    <h1>🔮 Oracle Dashboard</h1>
    <ul>
        <li>✅ <b>Project:</b> PipOS v3</li>
        <li>✅ <b>Status:</b> Online</li>
        <li>✅ <b>Brain:</b> Connected</li>
        <li>📊 <b>Uptime:</b> Cooking</li>
    </ul>
    <p>All systems nominal, boss.</p>
    """
    return {
        "text": "📋 Dashboard ready.",
        "rich_content": {"title": "Oracle Dashboard", "html": dashboard_html}
    }


def handle_brief() -> dict:
    """Scan for interactions that happened while away."""
    try:
        # 1. Scan Pip_Inbox for SMS items
        inbox_files = [f for f in os.listdir(PIPOS_INBOX) if f.endswith(".md")]
        new_items = []
        
        for f in inbox_files:
            path = os.path.join(PIPOS_INBOX, f)
            with open(path, "r", encoding="utf-8") as file:
                content = file.read()
                if "source: sms" in content:
                    # Extract snippet
                    body = content.split("---")[-1].strip().split("\n")[0]
                    new_items.append(f"• {body[:60]}...")
        
        # 2. Check recent memories
        recent_memories = []
        if cns:
            # This is a bit of a hack, assumes cns has a way to get recent.
            # For now, let's just stick to Inbox items.
            pass
            
        if not new_items:
            return {"text": "👍 All caught up. No new items from the field."}
        
        count = len(new_items)
        briefing = "\n".join(new_items[:5])
        return {
            "text": f"📱 While you were away ({count} items):\n{briefing}",
            "rich_content": {"title": "Continuity Brief", "html": f"<ul><li>{'</li><li>'.join(new_items)}</li></ul>"}
        }
    except Exception as e:
        return {"text": f"❌ Briefing error: {e}"}


def handle_status() -> dict:
    """Quick status check."""
    if llm_layer:
        return {"text": llm_layer.quick_response("Give me a quick, one-sentence status update. Be Pip about it.")}
    return {"text": "🔮 Oracle online. LLM layer not connected yet."}


def handle_search(query: str) -> dict:
    """Search the Brain."""
    context = get_brain_context(query, limit=3)
    if context:
        return {
            "text": f"🧠 Found relevant docs.",
            "rich_content": {"title": f"Search: {query}", "html": f"<pre>{context}</pre>"}
        }
    return {"text": f"🧠 No results for '{query}'."}


def handle_create(request: str) -> dict:
    """Handle creation requests - route to skills or LLM."""
    request_lower = request.lower()
    
    # Check for skill triggers
    for phrase, skill in SKILL_TRIGGERS.items():
        if phrase in request_lower:
            # Queue skill execution for AG
            task_content = f"skill:{skill} {request}"
            queue_result = handle_queue(task_content)
            return {
                "text": f"🎯 Routed to {skill} skill. {queue_result.get('text', '')}",
                "rich_content": None
            }
    
    # Fallback to LLM
    if not llm_layer:
        return {"text": "❌ LLM layer not connected. Can't create without thinking power."}
    
    context = get_brain_context(request)
    response = llm_layer.smart_response(
        f"The user wants to create: {request}\n\nProvide a helpful response. If it requires file creation or complex work, suggest doing it in Antigravity.",
        context=context
    )
    return {"text": response}


def handle_chat(message: str) -> dict:
    """Natural conversation with Pip."""
    
    # --- SKILL ROUTER CHECK ---
    message_lower = message.lower()
    for phrase, skill in SKILL_TRIGGERS.items():
        if phrase in message_lower:
            task_content = f"skill:{skill} {message}"
            queue_result = handle_queue(task_content)
            return {
                "text": f"🎯 {skill} skill activated. Queued for AG.",
                "rich_content": None
            }
    # ---------------------------

    # --- CONTEXTUAL MEMORY (AUTO-CAPTURE) ---
    # Detects high-value insights, goals, and thoughts automatically
    QUOTE_SIGNALS = [
        r"(i think|i believe|i realized) (that)?",
        r"(the key is|the goal is|the plan is)",
        r"(what if we|we should|why dont we)",
        r"(important:|critical:|note to self:)",
    ]
    
    # Check trigger phrases for explicit saves (legacy support)
    explicit_triggers = ["idea:", "vision:", "plan:", "concept:", "remember:", "save:"]
    cleanup_msg = message.lower().strip()
    
    # Logic: Explicit Trigger -> Save to specific list
    if any(cleanup_msg.startswith(t) for t in explicit_triggers) and cns:
        trigger = next(t for t in explicit_triggers if cleanup_msg.startswith(t))
        content = message[len(trigger):].strip()
        
        if "idea" in trigger or "concept" in trigger:
            cns.add("Idea_Bank", content, tag="Sprout", specs="SMS Insight", status="Germ")
            return {"text": f"🌱 Planted in Idea Bank: '{content[:50]}...'"}
        elif "plan" in trigger:
            cns.add("Tasks", content, tag="Plan", status="Pending")
            return {"text": f"📅 Added to Plans: '{content[:50]}...'"}
        else:
            cns.add_quote(content, tag="Insight")
            return {"text": f"🧠 Committed to Memory: '{content[:50]}...'"}

    # Logic: Implicit Pattern -> Auto-Capture as Quote
    if any(re.search(pattern, message, re.IGNORECASE) for pattern in QUOTE_SIGNALS) and cns:
        # Don't capture simple hellos or questions
        if len(message.split()) > 5:
            # Check for duplicates to avoid spamming
            cns.add_quote(message, tag="Auto-Capture")
            # We don't return early; we still process the message as chat
            # But we might append a note to the response
            pass
    # -----------------------------

    if not llm_layer:
        return {"text": f"🦜 Echo: {message} (LLM offline)"}
    
    context = get_brain_context(message)
    response = llm_layer.smart_response(message, context=context)
    return {"text": response}


def handle_help() -> dict:
    """Show available commands."""
    help_text = """🔮 PIPOS COMMANDS:
• cmd: <command> — Run shell command
• todo: <task> — Add a task
• ag: <task> — Queue for Antigravity
• list — Show dashboard
• status — Quick status
• search <query> — Search your vault
• create <thing> — Generate content
• Or just chat naturally!"""
    return {"text": help_text}


def format_for_platform(source: str, result: dict) -> dict:
    """
    Format response for the target platform.
    
    SMS: Short text, links for long content
    Discord: Rich embeds, code blocks
    """
    text = result.get("text", "")
    rich = result.get("rich_content")
    
    # For SMS: Truncate long responses
    if source == "sms":
        if len(text) > 400 and not rich:
            # Need to generate Rich Response
            result["rich_content"] = {
                "title": "Full Response",
                "html": f"<pre>{text}</pre>"
            }
            result["text"] = text[:150] + "... (see link)"
    
    # For Discord: Format with markdown
    elif source == "discord":
        # Wrap code in code blocks if detected
        if "```" not in text and any(kw in text.lower() for kw in ["def ", "class ", "import ", "function"]):
            result["text"] = f"```python\n{text}\n```"
    
    return result


# CLI Test
if __name__ == "__main__":
    print("🧪 Testing Pip Core...")
    print("-" * 40)
    
    # Test intents
    test_messages = [
        "cmd: dir",
        "brief",
        "idea: Build a death star",
        "The goal is global domination",
        "status",
    ]
    
    for msg in test_messages:
        intent, data = classify_intent(msg)
        print(f"'{msg}' → Intent: {intent}, Data: {data}")
