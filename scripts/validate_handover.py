
import os
import datetime
import sys

# Configuration
HANDOVER_DIR = r"c:\Users\nug\PiPos\Handover"
DIARY_FILE = os.path.join(HANDOVER_DIR, "Pip_Diary_Latest.md")

def check_file_exists(filepath, description):
    if os.path.exists(filepath):
        print(f"✅ FOUND: {description} ({os.path.basename(filepath)})")
        return True
    else:
        print(f"❌ MISSING: {description}")
        return False

def check_file_updated_today(filepath, description):
    if not os.path.exists(filepath):
        print(f"❌ MISSING: {description}")
        return False
    
    timestamp = os.path.getmtime(filepath)
    file_date = datetime.date.fromtimestamp(timestamp)
    today = datetime.date.today()
    
    if file_date == today:
        print(f"✅ UPDATED: {description}")
        return True
    else:
        print(f"⚠️  STALE: {description} (Last modified: {file_date})")
        return False

def main():
    print("--- 🛡️  PIP OS SHUTDOWN PROTOCOL VALIDATOR 🛡️  ---\n")
    
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    
    # 1. Check Session Journal
    journal_name = f"Session_Journal_{today_str}.md"
    journal_path = os.path.join(HANDOVER_DIR, journal_name)
    journal_ok = check_file_exists(journal_path, "Session Journal")
    
    # 2. Check BlackBox
    bbox_name = f"BlackBox_{today_str}.json"
    bbox_path = os.path.join(HANDOVER_DIR, bbox_name)
    bbox_ok = check_file_exists(bbox_path, "BlackBox Data")
    
    # 3. Check Pip Diary
    diary_ok = check_file_updated_today(DIARY_FILE, "Pip's Diary")
    
    print("\n---------------------------------------------------")
    
    if journal_ok and bbox_ok and diary_ok:
        print("🟢 SYSTEM READY FOR SHUTDOWN. Goodnight, Phloid.")
        sys.exit(0)
    else:
        print("🔴 SHUTDOWN ABORTED. PLEASE GENERATE MISSING ARTIFACTS.")
        sys.exit(1)

if __name__ == "__main__":
    main()
