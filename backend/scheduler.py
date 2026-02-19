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
# Determine data directory (Match main.py logic)
if os.path.exists("/.dockerenv"):
    DATA_DIR = Path("/app/data")
else:
    # Try backend-relative first
    backend_data = Path(__file__).parent / "data"
    # Try project-root relative
    project_data = Path(__file__).parent.parent / "data"
    
    # Priority: Project Root Data > Backend Data
    if project_data.exists():
        DATA_DIR = project_data
    elif backend_data.exists():
        DATA_DIR = backend_data
    else:
        # Default to project root
        DATA_DIR = project_data

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

def run_scheduled_scan(schedule, source="scheduled", scan_id=None):
    """
    Execute the scan pipeline for a schedule.
    """
    print(f"[*] Starting scheduled scan: {schedule['id']} - {schedule['query']} (Source: {source})")
    
    # 1. Update 'last_run' immediately
    schedules = load_schedules()
    for s in schedules:
        if s['id'] == schedule['id']:
            s['last_run'] = datetime.now().isoformat()
            break
    save_schedules(schedules)

    # 2. Run the subprocess (reusing main.py logic conceptually)
    
    if not scan_id:
        scan_id = str(uuid.uuid4())

    # Create initial audit log immediately for visibility
    try:
        from audit import ScanMonitor
        # Initialize monitor to create folder and audit.json
        monitor = ScanMonitor(
            scan_id, 
            data_dir=DATA_DIR, 
            query=schedule['query'],
            location=schedule['location'],
            radius=schedule['radius'],
            min_listings=schedule['min_listings'],
            user_intent=schedule.get('user_intent'),
            source=source
        )
        monitor.start_step("pipeline_wall_clock")
        
        monitor.log_process(f"Starting scheduled scan {scan_id} for '{schedule['query']}'...")
        monitor.log_process(f"Using Data Dir: {DATA_DIR}")
        
        # Helper to run command and stream logs
        def run_step(cmd, step_name):
            monitor.log_process(f"Launching {step_name}...")
            # Use unbuffered output for python commands
            if cmd[0] == sys.executable and "-u" not in cmd:
                 cmd.insert(1, "-u")
                 
            process = subprocess.Popen(
                cmd, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.STDOUT, 
                text=True,
                bufsize=1, # Line buffered
                cwd=str(Path(__file__).parent) # Ensure we run in backend dir
            )
            
            # Stream output
            for line in process.stdout:
                line = line.strip()
                if line:
                    monitor.log_process(line)
                    # Also print to console for backup
                    print(f"[{scan_id}] {line}")
                    
            process.wait()
            if process.returncode != 0:
                raise subprocess.CalledProcessError(process.returncode, cmd)

        # Run Scraper
        scraper_cmd = [
            sys.executable, "-W", "ignore", "scraper.py",
            "--query", schedule['query'],
            "--location", schedule['location'],
            "--radius", str(schedule['radius']),
            "--min-listings", str(schedule['min_listings']),
            "--source", source,
            "--scan-id", scan_id, # Pass the ID we just created
            "--auth-file", str(Path(__file__).parent / "auth.json"),
            "--data-dir", str(DATA_DIR),
            "--headless"
        ]
        run_step(scraper_cmd, "Scraper")
        
        # Find output dir (latest)
        screenshot_dirs = sorted(
            [d for d in DATA_DIR.iterdir() if d.is_dir() and d.name.startswith("screenshots_")],
            key=os.path.getmtime,
            reverse=True
        )
        if not screenshot_dirs:
            monitor.log_process("ERROR: No data found after scrape.")
            return

        latest_dir = screenshot_dirs[0]
        monitor.log_process(f"Scraper finished. Output: {latest_dir.name}")
        
        # Save output directory to audit log
        monitor.load_from_disk()
        monitor.data["output_dir"] = str(latest_dir)
        monitor.save()
        
        # ANALYZE
        analyze_cmd = [
            sys.executable, "-W", "ignore", "analyze_images.py",
            "--input-dir", str(latest_dir),
            "--scan-id", scan_id
        ]
        run_step(analyze_cmd, "Image Analysis")
        
        # RANK
        rank_cmd = [
            sys.executable, "-W", "ignore", "rank_deals.py",
            "--input", str(latest_dir / "market_inventory.json"),
            "--scan-id", scan_id
        ]
        if schedule.get('user_intent'):
             rank_cmd.extend(["--user-intent", schedule['user_intent']])
        run_step(rank_cmd, "Deal Ranking")
        
        # DEEP DIVE (Added to match main.py pipeline)
        target_file = latest_dir / "potential_buys.json"
        if not target_file.exists():
             target_file = latest_dir / "ranked_deals.json"

        if target_file.exists():
            deep_dive_cmd = [
                 sys.executable, "-W", "ignore", "deep_dive.py",
                 "--input", str(target_file),
                 "--listings", str(latest_dir / "listings.json"),
                 "--auth-file", str(Path(__file__).parent / "auth.json"),
                 "--data-dir", str(DATA_DIR),
                 "--scan-id", scan_id
            ]
            if schedule.get('user_intent'):
                deep_dive_cmd.extend(["--user-intent", schedule['user_intent']])
            
            run_step(deep_dive_cmd, "Deep Dive Verification")
        
        # LOAD RESULTS FOR EMAIL
        results_file = latest_dir / "verified_steals.json" # try verified first
        if not results_file.exists():
             results_file = latest_dir / "ranked_deals.json"
        
        deals = []
        if results_file.exists():
            with open(results_file, "r") as f:
                data = json.load(f)
                if isinstance(data, dict) and "verified" in data:
                    deals = data["verified"]
                elif isinstance(data, list):
                    deals = data
        
        # Send Email
        settings = load_settings()
        dest_email = schedule.get('email_to') or settings.get('default_email')
        
        if dest_email and deals:
             monitor.log_process(f"Sending email to {dest_email}...")
             email_body = format_deal_email(deals, schedule['query'])
             send_email(dest_email, f"Marketplace Hunter: {schedule['query']} Results", email_body)
             
        monitor.log_process("Pipeline Completed Successfully.")

    except Exception as e:
        print(f"[!] Scheduled scan failed: {e}")
        if 'monitor' in locals():
            monitor.log_process(f"CRITICAL ERROR: {e}")
    finally:
        if 'monitor' in locals():
            monitor.load_from_disk()
            monitor.stop_step("pipeline_wall_clock")
            monitor.finish_scan()

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
        time_str = s.get('time', '09:00')
        try:
            hour, minute = map(int, time_str.split(':'))
        except:
            hour, minute = 9, 0
        
        # Trigger Logic
        if freq == 'daily':
             scheduler.add_job(
                run_scheduled_scan, 
                CronTrigger(hour=hour, minute=minute), 
                args=[s], 
                id=s['id'],
                replace_existing=True,
                misfire_grace_time=86400
            )
        elif freq == 'weekly':
             scheduler.add_job(
                run_scheduled_scan, 
                CronTrigger(day_of_week='mon', hour=hour, minute=minute), 
                args=[s], 
                id=s['id'], 
                replace_existing=True,
                misfire_grace_time=86400
            )
        elif freq == 'hourly':
             scheduler.add_job(
                run_scheduled_scan, 
                IntervalTrigger(hours=1), 
                args=[s], 
                id=s['id'], 
                replace_existing=True,
                misfire_grace_time=3600 # Keep hourly tight
            )
