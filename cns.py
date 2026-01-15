import json
import os
import argparse
import sys
from datetime import datetime

# Force UTF-8 for Windows Consoles
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# --- CONFIGURATION (from config.json) ---
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.json")
with open(CONFIG_PATH, 'r') as f:
    CONFIG = json.load(f)

MEMORY_FILE = CONFIG['paths']['memory']
DASHBOARD_FILE = CONFIG['paths']['dashboard']
EXPERTS_DIR = CONFIG['paths']['experts']

# --- CORE SYSTEMS ---
def load_memory():
    if not os.path.exists(MEMORY_FILE): return {}
    try:
        with open(MEMORY_FILE, 'r') as f: return json.load(f)
    except: return {}

def save_memory(data):
    with open(MEMORY_FILE, 'w') as f: json.dump(data, f, indent=4)

# --- VISUALIZATION ENGINE ---
def generate_dashboard():
    data = load_memory()
    
    with open(DASHBOARD_FILE, 'w', encoding='utf-8') as f:
        # Header
        f.write(f"# 🧠 Pip OS Dashboard\n")
        f.write(f"*Last Sync: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n\n")
        
        # Loop through every World (Database)
        for world_name, items in data.items():
            f.write(f"## 📂 {world_name}\n")
            
            if not items:
                f.write("_Empty World_\n\n")
                continue
            
            # Create a Markdown Table
            f.write("| Status | Name | Specs | Tag |\n")
            f.write("| :--- | :--- | :--- | :--- |\n")
            
            for item in items:
                # Icon Logic for Status
                stat_icon = "⚪"
                s = item.get('status', 'Active').lower()
                if "active" in s: stat_icon = "🟢"
                elif "archive" in s: stat_icon = "🪦"
                elif "wishlist" in s: stat_icon = "🔮"
                elif "progress" in s: stat_icon = "🚧"
                elif "done" in s: stat_icon = "✅"
                elif "pending" in s: stat_icon = "⏳"

                f.write(f"| {stat_icon} **{item.get('status')}** | **{item['name']}** | {item.get('specs', '')} | *{item.get('tag', '')}* |\n")
            
            f.write("\n") # Spacer
            
    print(f"[SUCCESS] Dashboard Updated: Open '{DASHBOARD_FILE}' and click Preview!")

# --- GOD MODE TOOLS ---
def create(name):
    data = load_memory()
    if name not in data:
        data[name] = []
        save_memory(data)
        print(f"[SUCCESS] Created local world: '{name}'")
        generate_dashboard() # Auto-update UI

def remove_world(name):
    data = load_memory()
    if name not in data:
        return print(f"[ERROR] World '{name}' not found.")
    
    del data[name]
    save_memory(data)
    print(f"[SUCCESS] Deleted world: '{name}'")
    generate_dashboard()

def add(target, name, tag="Item", specs="", status="Active"):
    data = load_memory()
    if target not in data: return print(f"[ERROR] World '{target}' not found.")
    
    # Check duplicate
    for i in data[target]:
        if i['name'] == name: return print(f"[WARN] '{name}' exists.")

    new_item = {"name": name, "tag": tag, "specs": specs, "status": status}
    data[target].append(new_item)
    save_memory(data)
    save_memory(data)
    print(f"[SUCCESS] Logged '{name}'")
    generate_dashboard() # Auto-update UI

def add_quote(text, author="phloid", tag="Dialogue"):
    data = load_memory()
    if "Session_Quotes" not in data:
        data["Session_Quotes"] = []
    
    timestamp = datetime.now().strftime("%H:%M")
    new_quote = {
        "text": text,
        "author": author,
        "tag": tag,
        "timestamp": timestamp
    }
    
    data["Session_Quotes"].append(new_quote)
    save_memory(data)
    print(f"[SUCCESS] Quote added to Jar: \"{text}\"")


# --- EXPERT RETRIEVAL ENGINE (RAG) ---
def list_experts(show_roles=False):
    """List all available experts, optionally with roles."""
    expert_dir = os.path.join(os.getcwd(), "Experts")
    if not os.path.exists(expert_dir):
        return print(f"[ERROR] No Expert Library found at '{expert_dir}'")
    
    files = sorted([f for f in os.listdir(expert_dir) if f.endswith('.md')])
    if not files:
        return print("[INFO] Expert Library is empty.")
    
    if show_roles:
        print("\n🧠 EXPERT ROSTER")
        print("-" * 60)
        print(f"{'ID':<5} {'Name':<25} {'Role'}")
        print("-" * 60)
        
        for f in files:
            # Extract role from file content
            path = os.path.join(expert_dir, f)
            role = "Unknown"
            try:
                with open(path, 'r', encoding='utf-8') as file:
                    for line in file:
                        if '**Role:**' in line or 'Role:' in line:
                            role = line.split(':', 1)[-1].strip().strip('*').strip()
                            break
            except:
                pass
            
            # Parse ID and name from filename
            parts = f.replace('.md', '').split('_', 1)
            file_id = parts[0] if len(parts) > 1 else "--"
            name = parts[1].replace('_', ' ') if len(parts) > 1 else parts[0]
            
            print(f"{file_id:<5} {name:<25} {role}")
        
        print("-" * 60)
        print(f"Total: {len(files)} experts\n")
    else:
        print(f"\n🧠 AVAILABLE EXPERTS")
        for f in files:
            print(f"  - {f}")
        print("")


def find_expert(name):
    """Find an expert file by name (fuzzy match)."""
    expert_dir = os.path.join(os.getcwd(), "Experts")
    files = [f for f in os.listdir(expert_dir) if f.endswith('.md')]
    
    # 1. Exact Match
    if name in files:
        return os.path.join(expert_dir, name)
    
    # 2. Keyword Match
    for f in files:
        if name.lower() in f.lower():
            return os.path.join(expert_dir, f)
    
    return None


def read_expert(name):
    """Read and display an expert's content."""
    path = find_expert(name)
    if not path:
        return print(f"[ERROR] Expert '{name}' not found.")
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    filename = os.path.basename(path)
    print(f"\n----- BEGIN EXPERT CONTEXT: {filename} -----")
    print(content)
    print(f"----- END EXPERT CONTEXT -----\n")


def inject_expert(name):
    """Output expert content wrapped in XML tags for LLM prompts."""
    path = find_expert(name)
    if not path:
        return print(f"[ERROR] Expert '{name}' not found.")
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    filename = os.path.basename(path).replace('.md', '')
    tag_name = filename.lower().replace(' ', '_').replace('-', '_')
    
    print(f"<expert_{tag_name}>")
    print(content.strip())
    print(f"</expert_{tag_name}>")

def create_expert(name, content):
    expert_dir = os.path.join(os.getcwd(), "Experts")
    
    # Auto-Numbering Logic
    files = [f for f in os.listdir(expert_dir) if f.endswith('.md')]
    next_id = 1
    if files:
        try:
            # Find max ID (assuming format "XX_Name.md")
            req_ids = [int(f.split('_')[0]) for f in files if f.split('_')[0].isdigit()]
            if req_ids: next_id = max(req_ids) + 1
        except: pass
    
    # Format Filename
    safe_name = name.replace(" ", "_").strip()
    filename = f"{next_id:02d}_{safe_name}.md"
    path = os.path.join(expert_dir, filename)
    
    # Default Template if no content provided
    if not content:
        content = f"# [{next_id:02d}] {name.upper()}\n\n## 1. IDENTITY\n**Role:** [Role]\n**Prime Directive:** [Goal]\n\n## 2. STYLE\n- [Tone]\n"
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"[SUCCESS] Created Expert Memory: '{filename}'")

def generate_handover():
    # 1. Gather Data
    today = datetime.now().strftime("%Y-%m-%d")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    # Roster
    expert_dir = os.path.join(os.getcwd(), "Experts")
    roster = [f.replace(".md", "") for f in os.listdir(expert_dir) if f.endswith(".md")]
    
    # Memory
    mem_data = load_memory()
    active_projects = [p['name'] for p in mem_data.get('Projects', []) if p.get('status') == 'In Progress']
    
    content = f"""# 🛑 SESSION SHUTDOWN PROTOCOL
**System Timestamp:** {timestamp}

## ✅ SYSTEM STATE
- **Active Kernel:** Pip OS v7.2 (Auto-Handover)
- **Active Projects:** {", ".join(active_projects)}
- **Cognitive Roster:** {len(roster)} Active Agents
    - {", ".join(roster)}

## 🧠 PSYCHOMETRIC LOG
- **User Temperament:** [Honest Assessment of Mood/Patience]
- **Collaborative Friction:** [Low/Med/High]
- **Wins:** [Key "Aha" Moments]

## 📦 HANDOVER PACKET
```json
{{
  "system_state": "OPERATIONAL",
  "memory_path": "{MEMORY_FILE}",
  "roster_count": {len(roster)},
  "last_sync": "{timestamp}"
}}
```
"""
    
    # 2. Write to File
    handover_dir = os.path.join(os.getcwd(), "Handover")
    if not os.path.exists(handover_dir): os.makedirs(handover_dir)
    
    filename = f"{today}_Handover.md"
    path = os.path.join(handover_dir, filename)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"[SUCCESS] Handover Packet Generated: '{path}'")


def generate_narrative_journal():
    """Generate a narrative-style journal entry from Pip's perspective."""
    today = datetime.now().strftime("%Y-%m-%d")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    day_name = datetime.now().strftime("%A")
    
    # 1. Read BlackBox for breadcrumbs
    bbox_path = os.path.join(os.getcwd(), "Handover", "BlackBox_Latest.json")
    breadcrumbs = []
    next_steps = []
    if os.path.exists(bbox_path):
        try:
            with open(bbox_path, 'r', encoding='utf-8') as f:
                bbox_data = json.load(f)
            breadcrumbs = bbox_data.get('breadcrumbs', [])
            next_steps = bbox_data.get('next_immediate_steps', [])
        except:
            pass
    
    # 2. Read Pip's Diary for recent entries
    diary_path = os.path.join(os.getcwd(), "Handover", "Pip_Diary_Latest.md")
    lesson = ""
    if os.path.exists(diary_path):
        try:
            with open(diary_path, 'r', encoding='utf-8') as f:
                content = f.read()
            # Extract the lesson section
            if "## 💡 The Lesson" in content:
                lesson_section = content.split("## 💡 The Lesson")[1].split("##")[0]
                lesson = lesson_section.strip()[:200]  # First 200 chars
        except:
            pass
    
    # 3. Build the narrative
    # Convert breadcrumbs into scene descriptions
    scene_beats = []
    for bc in breadcrumbs:
        # Clean up the breadcrumb into a narrative beat
        bc_clean = bc.replace("SCRAPPED:", "We scrapped").replace("DEPLOYED:", "We deployed").replace("VERIFIED:", "I verified").replace("LESSON:", "The lesson was")
        scene_beats.append(bc_clean)
    
    narrative = f'''# 📓 Pip's Journal — {day_name}, {today}
*Timestamp: {timestamp}*

---

## The Scene

The workshop was quiet except for the hum of the RTX 4060 and the occasional click of the TourBox Neo. phloid sat hunched over the ProArt, eyes scanning lines of code. I watched from my corner of the screen, ready.

---

## What Happened

'''
    
    if scene_beats:
        for i, beat in enumerate(scene_beats, 1):
            narrative += f'''**Beat {i}:** {beat}

'''
    else:
        narrative += '''*[No breadcrumbs logged. Fill in the day's events manually.]*

'''
    
    narrative += '''---

## Dialogue (The Quote Jar)

'''
    # Inject Quotes
    quotes = load_memory().get("Session_Quotes", [])
    if quotes:
        for q in quotes:
            narrative += f'''> **{q['author']}:** "{q['text']}" *({q['timestamp']})*
'''
    else:
        narrative += "> *[The workshop was quiet today. No quotes recorded.]*\n"

    narrative += '''
---

## The Mood

*[Describe the vibe: Frustrated? Triumphant? Exhausted? Inspired?]*

---

## Tomorrow's Promise

'''
    
    if next_steps:
        for step in next_steps:
            narrative += f'''- {step}
'''
    else:
        narrative += '''- [What's on deck for tomorrow?]
'''
    
    narrative += f'''
---

*"Another day in the workshop. Another line of code. We're building something here."*
— Pip

> **Recap:**
> - **Session ID:** {today}_Session
> - **Key Events:** {len(scene_beats)} narrative beats logged.
> - **Sentiment:** [Pending Human Review]
'''
    
    # 4. Write to file
    handover_dir = os.path.join(os.getcwd(), "Handover")
    if not os.path.exists(handover_dir):
        os.makedirs(handover_dir)
    
    filename = f"Pip_Journal_{today}.md"
    path = os.path.join(handover_dir, filename)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(narrative)
    
    print(f"[SUCCESS] Narrative Journal Generated: '{path}'")
    print(f"  - Scene beats: {len(scene_beats)}")
    print(f"  - Ready for quotes & mood edits")




def sync_ecosystem():
    """Sync Project_Ecosystem.md status table from pip_memory.json."""
    ecosystem_path = os.path.join(os.getcwd(), "Project_Ecosystem.md")
    
    if not os.path.exists(ecosystem_path):
        return print(f"[ERROR] Project_Ecosystem.md not found")
    
    # 1. Load memory
    mem_data = load_memory()
    projects = mem_data.get('Projects', [])
    
    if not projects:
        return print("[WARN] No projects found in pip_memory.json")
    
    # 2. Build status mapping
    status_icons = {
        'active': '🟢 Active',
        'in progress': '🚧 Active',
        'pending': '⏳ Pending',
        'done': '✅ Done',
        'archive': '🪦 Archive',
        'on hold': '⏸️ On Hold',
        'wishlist': '🔮 Wishlist'
    }
    
    # 3. Read existing file
    with open(ecosystem_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 4. Find and update the PROJECT STATS table
    lines = content.split('\n')
    new_lines = []
    in_table = False
    table_ended = False
    
    for i, line in enumerate(lines):
        # Detect table start
        if '| Project | Type | Status | Description |' in line:
            in_table = True
            new_lines.append(line)
            continue
        
        # Detect table header separator
        if in_table and line.startswith('|:---'):
            new_lines.append(line)
            
            # Insert updated project rows from memory
            for proj in projects:
                name = proj.get('name', 'Unknown')
                specs = proj.get('specs', '')
                status_raw = proj.get('status', 'Pending').lower()
                status_display = status_icons.get(status_raw, '⏳ Pending')
                
                # Try to determine type from specs
                proj_type = 'Project'
                if 'skill' in specs.lower():
                    proj_type = 'Skill'
                elif 'service' in specs.lower() or 'biz' in specs.lower():
                    proj_type = 'Biz'
                elif 'tool' in specs.lower() or 'app' in specs.lower():
                    proj_type = 'Tool'
                
                new_lines.append(f"| **{name}** | {proj_type} | {status_display} | {specs} |")
            
            table_ended = True
            continue
        
        # Skip old table rows (they start with |)
        if in_table and not table_ended and line.startswith('|'):
            continue
        
        # Detect table end (empty line or new section)
        if in_table and table_ended and (line.strip() == '' or line.startswith('#') or line.startswith('---')):
            in_table = False
        
        new_lines.append(line)
    
    # 5. Write updated file
    with open(ecosystem_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_lines))
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    print(f"[SUCCESS] Project_Ecosystem.md synced with {len(projects)} projects")
    print(f"  - Last sync: {timestamp}")




def generate_snapshot():
    """Generate a cold-start context snapshot for new AI sessions."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # 1. Load project memory
    mem_data = load_memory()
    
    # 2. Get expert roster (just names)
    expert_dir = os.path.join(os.getcwd(), "Experts")
    experts = []
    if os.path.exists(expert_dir):
        for f in sorted(os.listdir(expert_dir)):
            if f.endswith('.md'):
                experts.append(f.replace('.md', ''))
    
    # 3. Read last 3 diary entries from Pip_Diary_Latest.md
    diary_path = os.path.join(os.getcwd(), "Handover", "Pip_Diary_Latest.md")
    diary_entries = []
    if os.path.exists(diary_path):
        try:
            with open(diary_path, 'r', encoding='utf-8') as f:
                content = f.read()
            # Extract the "Previous Entry Archive" section
            if "## 📝 Previous Entry Archive" in content:
                archive_section = content.split("## 📝 Previous Entry Archive")[-1]
                lines = [l.strip() for l in archive_section.strip().split('\n') if l.strip().startswith('>')]
                diary_entries = [l.lstrip('> ').strip() for l in lines[:3]]
        except:
            pass
    
    # 4. Read BlackBox_Latest for breadcrumbs
    bbox_path = os.path.join(os.getcwd(), "Handover", "BlackBox_Latest.json")
    breadcrumbs = []
    next_steps = []
    if os.path.exists(bbox_path):
        try:
            with open(bbox_path, 'r', encoding='utf-8') as f:
                bbox_data = json.load(f)
            breadcrumbs = bbox_data.get('breadcrumbs', [])
            next_steps = bbox_data.get('next_immediate_steps', [])
        except:
            pass
    
    # 5. Build snapshot
    snapshot = {
        "generated_at": timestamp,
        "pip_os_version": "8.0",
        "project_memory": mem_data,
        "expert_roster": experts,
        "recent_diary": diary_entries,
        "breadcrumbs": breadcrumbs,
        "next_steps": next_steps,
        "narrative_memory": []
    }

    # 5b. Narrative Recall (The "Soul" Vector)
    # Read the last 3 Pip_Journal files
    handover_dir = os.path.join(os.getcwd(), "Handover")
    
    if os.path.exists(handover_dir):
        journal_files = sorted([f for f in os.listdir(handover_dir) if f.startswith("Pip_Journal_") and f.endswith(".md")], reverse=True)
        recent_journals = journal_files[:3]
        
        for j_file in recent_journals:
            try:
                with open(os.path.join(handover_dir, j_file), 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Extract Recap or The Scene
                recap = ""
                if "> **Recap:**" in content:
                    recap = content.split("> **Recap:**")[1].strip()
                elif "## The Scene" in content:
                     # Fallback to scene description
                     recap = content.split("## The Scene")[1].split("##")[0].strip()
                
                snapshot["narrative_memory"].append({
                    "file": j_file,
                    "memory_fragment": recap[:500] + "..." if len(recap) > 500 else recap
                })
            except:
                pass

    
    # 6. Write to file
    handover_dir = os.path.join(os.getcwd(), "Handover")
    if not os.path.exists(handover_dir):
        os.makedirs(handover_dir)
    
    path = os.path.join(handover_dir, "Session_Snapshot.json")
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(snapshot, f, indent=2)
    
    print(f"[SUCCESS] Session Snapshot Generated: '{path}'")
    print(f"  - Projects: {len(mem_data)} worlds")
    print(f"  - Experts: {len(experts)} available")
    print(f"  - Breadcrumbs: {len(breadcrumbs)} recent")



# --- OPERATOR INTERFACE ---
if __name__ == "__main__":
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest='cmd')

    # Commands
    sub.add_parser('create').add_argument('name')
    
    pa = sub.add_parser('add')
    pa.add_argument('target')
    pa.add_argument('name')
    pa.add_argument('--specs', default='')
    pa.add_argument('--status', default='Active')

    # Manual Viz Trigger
    sub.add_parser('viz')
    
    # Handover Trigger
    sub.add_parser('handover')
    
    # Snapshot Trigger
    sub.add_parser('snapshot')
    
    # Journal Trigger (Narrative)
    sub.add_parser('journal')

    # Remove World
    sub.add_parser('remove').add_argument('name')

    # Quote Jar
    pq = sub.add_parser('quote')
    pq.add_argument('text')
    pq.add_argument('--author', default='phloid')
    pq.add_argument('--tag', default='Dialogue')

    # Expert System
    pe = sub.add_parser('expert')
    pe.add_argument('action', choices=['list', 'read', 'create', 'inject'])
    pe.add_argument('name', nargs='?', default=None)
    pe.add_argument('--content', default=None)
    pe.add_argument('--tags', action='store_true', help='Show roles in list view')

    # Ecosystem Sync
    eco = sub.add_parser('ecosystem')
    eco.add_argument('action', choices=['sync'])

    args = p.parse_args()

    if args.cmd == "create": create(args.name)
    elif args.cmd == "add": add(args.target, args.name, specs=args.specs, status=args.status)
    elif args.cmd == "viz": generate_dashboard()
    elif args.cmd == "handover": generate_handover()
    elif args.cmd == "snapshot": generate_snapshot()
    elif args.cmd == "journal": generate_narrative_journal()
    elif args.cmd == "quote": add_quote(args.text, args.author, args.tag)
    elif args.cmd == "remove": remove_world(args.name)
    elif args.cmd == "expert":
        if args.action == "list": list_experts(show_roles=args.tags)
        elif args.action == "read": read_expert(args.name)
        elif args.action == "create": create_expert(args.name, args.content)
        elif args.action == "inject": inject_expert(args.name)
    elif args.cmd == "ecosystem":
        if args.action == "sync": sync_ecosystem()
    else: print("Pip OS v8.0 (Narrative Journal) Online.")



