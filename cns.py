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
    print(f"[SUCCESS] Logged '{name}'")
    generate_dashboard() # Auto-update UI

# --- EXPERT RETRIEVAL ENGINE (RAG) ---
def list_experts():
    expert_dir = os.path.join(os.getcwd(), "Experts")
    if not os.path.exists(expert_dir):
        return print(f"[ERROR] No Expert Library found at '{expert_dir}'")
    
    files = [f for f in os.listdir(expert_dir) if f.endswith('.md')]
    if not files:
        return print("[INFO] Expert Library is empty.")
        
    print(f"\n🧠 **AVAILABLE EXPERTS**")
    for f in files:
        print(f"  - {f}")
    print("")

def read_expert(name):
    expert_dir = os.path.join(os.getcwd(), "Experts")
    # Fuzzy match logic
    files = [f for f in os.listdir(expert_dir) if f.endswith('.md')]
    target = None
    
    # 1. Exact Match
    if name in files: target = name
    
    # 2. Key Word Match
    if not target:
        for f in files:
            if name.lower() in f.lower():
                target = f
                break
    
    if not target:
        return print(f"[ERROR] Expert '{name}' not found.")
        
    path = os.path.join(expert_dir, target)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    print(f"\n----- BEGIN EXPERT CONTEXT: {target} -----")
    print(content)
    print(f"----- END EXPERT CONTEXT -----\n")

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

    # Remove World
    sub.add_parser('remove').add_argument('name')

    # Expert System
    pe = sub.add_parser('expert')
    pe.add_argument('action', choices=['list', 'read', 'create'])
    pe.add_argument('name', nargs='?', default=None)
    pe.add_argument('--content', default=None)

    args = p.parse_args()

    if args.cmd == "create": create(args.name)
    elif args.cmd == "add": add(args.target, args.name, specs=args.specs, status=args.status)
    elif args.cmd == "viz": generate_dashboard()
    elif args.cmd == "handover": generate_handover()
    elif args.cmd == "remove": remove_world(args.name)
    elif args.cmd == "expert":
        if args.action == "list": list_experts()
        elif args.action == "read": read_expert(args.name)
        elif args.action == "create": create_expert(args.name, args.content)
    else: print("Pip OS v7.2 (Auto-Handover) Online.")