
import os
import json
import datetime
import sys

# Force UTF-8 for Windows Consoles
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# Configuration
HANDOVER_DIR = r"c:\Users\nug\PiPos\Handover"
DIARY_FILE = os.path.join(HANDOVER_DIR, "Pip_Diary_Latest.md")
BLACKBOX_LATEST = os.path.join(HANDOVER_DIR, "BlackBox_Latest.json")

# Required keys for BlackBox completeness check
BLACKBOX_REQUIRED_KEYS = ["timestamp", "session_id", "project_state", "breadcrumbs", "next_immediate_steps"]

# Staleness threshold in hours
STALENESS_THRESHOLD_HOURS = 24


def check_file_exists(filepath, description):
    """Check if a file exists."""
    if os.path.exists(filepath):
        print(f"✅ FOUND: {description} ({os.path.basename(filepath)})")
        return True
    else:
        print(f"❌ MISSING: {description}")
        return False


def check_file_updated_today(filepath, description):
    """Check if a file was modified today."""
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


def check_staleness(filepath, description, threshold_hours=24):
    """Check if a file is older than the threshold (in hours)."""
    if not os.path.exists(filepath):
        print(f"❌ MISSING: {description}")
        return False
    
    mtime = os.path.getmtime(filepath)
    file_datetime = datetime.datetime.fromtimestamp(mtime)
    now = datetime.datetime.now()
    age = now - file_datetime
    age_hours = age.total_seconds() / 3600
    
    if age_hours > threshold_hours:
        print(f"⚠️  STALE: {description} is {age_hours:.1f} hours old (threshold: {threshold_hours}h)")
        return False
    else:
        print(f"✅ FRESH: {description} ({age_hours:.1f} hours old)")
        return True


def check_blackbox_completeness(filepath):
    """Check if BlackBox_Latest.json has all required keys and non-empty values."""
    if not os.path.exists(filepath):
        print(f"❌ MISSING: BlackBox_Latest.json")
        return False
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ CORRUPT: BlackBox_Latest.json - Invalid JSON ({e})")
        return False
    
    missing_keys = []
    empty_keys = []
    
    for key in BLACKBOX_REQUIRED_KEYS:
        if key not in data:
            missing_keys.append(key)
        elif not data[key]:  # Check for empty/null values
            empty_keys.append(key)
    
    if missing_keys:
        print(f"❌ INCOMPLETE: BlackBox missing keys: {', '.join(missing_keys)}")
        return False
    
    if empty_keys:
        print(f"⚠️  WARNING: BlackBox has empty values for: {', '.join(empty_keys)}")
        # Still pass, but warn
    
    print(f"✅ COMPLETE: BlackBox_Latest.json has all required fields")
    return True


def main():
    print("=" * 55)
    print("   🛡️  PIP OS SHUTDOWN PROTOCOL VALIDATOR v2.0 🛡️")
    print("=" * 55)
    print()
    
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    results = []
    
    # --- Section 1: Daily Artifacts ---
    print("📁 DAILY ARTIFACTS")
    print("-" * 40)
    
    # Check Session Journal
    journal_name = f"Session_Journal_{today_str}.md"
    journal_path = os.path.join(HANDOVER_DIR, journal_name)
    results.append(check_file_exists(journal_path, "Session Journal"))
    
    # Check BlackBox (dated)
    bbox_name = f"BlackBox_{today_str}.json"
    bbox_path = os.path.join(HANDOVER_DIR, bbox_name)
    results.append(check_file_exists(bbox_path, "BlackBox Data (Dated)"))
    
    print()
    
    # --- Section 2: Staleness Checks ---
    print("⏰ STALENESS CHECKS")
    print("-" * 40)
    
    # Check Diary freshness
    results.append(check_staleness(DIARY_FILE, "Pip's Diary", STALENESS_THRESHOLD_HOURS))
    
    # Check BlackBox_Latest freshness
    results.append(check_staleness(BLACKBOX_LATEST, "BlackBox_Latest.json", STALENESS_THRESHOLD_HOURS))
    
    print()
    
    # --- Section 3: Completeness Checks ---
    print("🔍 COMPLETENESS CHECKS")
    print("-" * 40)
    
    results.append(check_blackbox_completeness(BLACKBOX_LATEST))
    
    print()
    
    # --- Final Verdict ---
    print("=" * 55)
    
    if all(results):
        print("🟢 SYSTEM READY FOR SHUTDOWN. Goodnight, phloid.")
        sys.exit(0)
    else:
        failed_count = len([r for r in results if not r])
        print(f"🔴 SHUTDOWN ABORTED. {failed_count} check(s) failed.")
        print("   Please generate or update missing artifacts.")
        sys.exit(1)


if __name__ == "__main__":
    main()
