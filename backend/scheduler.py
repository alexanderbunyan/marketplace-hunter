from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
import json
import os
from pathlib import Path
import uuid
from datetime import datetime
import sys
import subprocess
from email_service import send_email, format_deal_email, load_settings

# Constants
DATA_DIR = Path(__file__).parent / "data"
SCHEDULES_FILE = DATA_DIR / "schedules.json"
SETTINGS_FILE = DATA_DIR / "settings.json"

scheduler = BackgroundScheduler()

def load_schedules():
    if SCHEDULES_FILE.exists():
        try:
            with open(SCHEDULES_FILE, "r") as f:
                return json.load(f)
        except:
            return []
    return []

def save_schedules(schedules):
    with open(SCHEDULES_FILE, "w") as f:
        json.dump(schedules, f, indent=2)

def run_scheduled_scan(schedule):
    """
    Execute the scan pipeline for a schedule.
    """
    print(f"[*] Starting scheduled scan: {schedule['id']} - {schedule['query']}")
    
    # 1. Update 'last_run' immediately
    schedules = load_schedules()
    for s in schedules:
        if s['id'] == schedule['id']:
            s['last_run'] = datetime.now().isoformat()
            break
    save_schedules(schedules)

    # 2. Run the subprocess (reusing main.py logic conceptually)
    # We invoke main.py's subprocess logic manually or via a helper if refactored.
    # For now, we'll run the scraper script directly to avoid recursion issues with main.py
    
    scan_id = str(uuid.uuid4())
    
    # Run Scraper
    scraper_cmd = [
        sys.executable, "-W", "ignore", "scraper.py",
        "--query", schedule['query'],
        "--location", schedule['location'],
        "--radius", str(schedule['radius']),
        "--limit", str(schedule['min_listings']),
        "--auth-file", str(Path(__file__).parent / "auth.json"),
        "--data-dir", str(DATA_DIR)
    ]
    
    try:
        # SCRAPE
        print(f"[*] Running scraper for schedule {schedule['id']}...")
        subprocess.run(scraper_cmd, check=True, cwd=str(Path(__file__).parent))
        
        # Find output dir (latest)
        # This is race-condition prone if multiple run, but good enough for single user
        # A better way is parsing scraper stdout, but let's trust the 'latest' logic for now
        screenshot_dirs = sorted(
            [d for d in DATA_DIR.iterdir() if d.is_dir() and d.name.startswith("screenshots_")],
            key=os.path.getmtime,
            reverse=True
        )
        if not screenshot_dirs:
            print("No data found after scrape.")
            return

        latest_dir = screenshot_dirs[0]
        
        # ANALYZE
        print(f"[*] Running analysis for schedule {schedule['id']}...")
        analyze_cmd = [
            sys.executable, "-W", "ignore", "analyze_images.py",
            "--input-dir", str(latest_dir),
            "--scan-id", scan_id
        ]
        subprocess.run(analyze_cmd, check=True, cwd=str(Path(__file__).parent))
        
        # RANK
        print(f"[*] Running ranking for schedule {schedule['id']}...")
        rank_cmd = [
            sys.executable, "-W", "ignore", "rank_deals.py",
            "--input", str(latest_dir / "market_inventory.json"),
            "--scan-id", scan_id
        ]
        if schedule.get('user_intent'):
             rank_cmd.extend(["--user-intent", schedule['user_intent']])
        subprocess.run(rank_cmd, check=True, cwd=str(Path(__file__).parent))
        
        # DEEP DIVE? (Optional for schedules, maybe too expensive/slow? Let's include it for "Verification")
        # For alerts, we probably only want the "Verified" or highly ranked ones.
        
        # LOAD RESULTS
        results_file = latest_dir / "ranked_deals.json"
        
        deals = []
        if results_file.exists():
            with open(results_file, "r") as f:
                deals = json.load(f)
        
        # Send Email
        settings = load_settings()
        dest_email = schedule.get('email_to') or settings.get('default_email')
        
        if dest_email and deals:
             print(f"[*] Sending email to {dest_email}...")
             email_body = format_deal_email(deals, schedule['query'])
             send_email(dest_email, f"Marketplace Hunter: {schedule['query']} Results", email_body)
        
    except Exception as e:
        print(f"[!] Scheduled scan failed: {e}")

def start_scheduler():
    """
    Initialize and start the scheduler.
    """
    scheduler.start()
    refresh_jobs()
    print("[*] Scheduler started.")

def refresh_jobs():
    """
    Reloads jobs from json and updates scheduler.
    """
    scheduler.remove_all_jobs()
    schedules = load_schedules()
    
    for s in schedules:
        if not s.get('active', True):
            continue
            
        freq = s.get('frequency', 'daily')
        
        # Simple Trigger Logic
        if freq == 'daily':
            # Run every day at 9am (placeholder) or interval
            # For simplicity, let's use interval = 24 hours
             scheduler.add_job(
                run_scheduled_scan, 
                IntervalTrigger(hours=24), 
                args=[s], 
                id=s['id'],
                replace_existing=True
            )
        elif freq == 'weekly':
             scheduler.add_job(
                run_scheduled_scan, 
                IntervalTrigger(days=7), 
                args=[s], 
                id=s['id'], 
                replace_existing=True
            )
        # Immediate run for testing/debug if needed
