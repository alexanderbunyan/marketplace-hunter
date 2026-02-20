from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import json
from pydantic import BaseModel
import subprocess
import os
import sys
import uuid
from pathlib import Path
from audit import ScanMonitor

# Determine data directory
# Default to /app/data (Docker)
# Fallback 1: ./data (Local backend relative)
# Fallback 2: ../data (Local project root relative)
if os.path.exists("/.dockerenv"):
    DATA_DIR = "/app/data"
else:
    # Try backend-relative first
    backend_data = Path(__file__).parent / "data"
    # Try project-root relative
    project_data = Path(__file__).parent.parent / "data"
    
    # Priority: Project Root Data > Backend Data
    if project_data.exists():
        DATA_DIR = str(project_data)
    elif backend_data.exists():
        DATA_DIR = str(backend_data)
    else:
        # Default to project root and create it
        DATA_DIR = str(project_data)

# Determine auth file path
if os.path.exists("/.dockerenv"):
    AUTH_FILE = "/app/auth.json"
else:
    # Try backend-relative first (if moved to backend)
    backend_auth = Path(__file__).parent / "auth.json"
    # Try project-root relative (usual location)
    project_auth = Path(__file__).parent.parent / "auth.json"
    
    if project_auth.exists():
        AUTH_FILE = str(project_auth)
    elif backend_auth.exists():
        AUTH_FILE = str(backend_auth)
    else:
        # Default fallback
        AUTH_FILE = str(project_auth)

Path(DATA_DIR).mkdir(parents=True, exist_ok=True)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Local import to avoid circular dependency or initialization order issues
    try:
        from scheduler import start_scheduler, scheduler
        start_scheduler()
    except Exception as e:
        print(f"[!] Scheduler startup failed: {e}")
    
    yield
    
    # Shutdown: Clean up
    try:
        if scheduler.running:
            scheduler.shutdown()
    except Exception as e:
        print(f"[!] Scheduler shutdown failed: {e}")

# CORS format - allow all for local dev
app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    # Implicit loopback is safer than wildcard with credentials
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173", # Vite default
        "*" # Fallback
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve data directory (images)
app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")

print("----------------------------------------------------------------")
print(f"[*] MARKETPLACE HUNTER BACKEND STARTED")
print(f"[*] DATA_DIR: {DATA_DIR}")
print(f"[*] AUTH_FILE: {AUTH_FILE}")
print("----------------------------------------------------------------")

class ScanRequest(BaseModel):
    query: str
    location: str = "erskineville"
    radius: int = 10
    min_listings: int = 30
    user_intent: str = None
    source: str = "manual"

def run_scraper_pipeline(request: ScanRequest, scan_id: str):
    """
    Runs the full scraping and analysis pipeline in the background.
    """
    # monitor will create the directory structure at data/jobs/{scan_id}
    monitor = ScanMonitor(
        scan_id, 
        data_dir=DATA_DIR,
        query=request.query,
        location=request.location,
        radius=request.radius,
        min_listings=request.min_listings,
        user_intent=request.user_intent,
        source=request.source
    )
    monitor.start_step("pipeline_wall_clock")
    
    try:
        monitor.log_process(f"Starting scan {scan_id} for '{request.query}'...")
        monitor.log_process(f"Using Data Dir: {DATA_DIR}")
        monitor.log_process(f"Using Auth File: {AUTH_FILE}")
        
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
                bufsize=1 # Line buffered
            )
            
            # Stream output
            for line in process.stdout:
                line = line.strip()
                if line:
                    monitor.log_process(line)
                    
            process.wait()
            if process.returncode != 0:
                raise subprocess.CalledProcessError(process.returncode, cmd)

        # 1. Scraper
        scraper_cmd = [
            sys.executable, "-u", "-W", "ignore", "scraper.py",
            "--query", request.query,
            "--location", request.location,
            "--radius", str(request.radius),
            "--min-listings", str(request.min_listings),
            "--scan-id", scan_id,
            "--source", request.source,
            "--auth-file", AUTH_FILE,
            "--data-dir", DATA_DIR,
            "--headless"
        ]
        run_step(scraper_cmd, "Scraper")
        
        # Find output dir
        data_dir = Path(DATA_DIR)
        screenshot_dirs = sorted(
            [d for d in data_dir.iterdir() if d.is_dir() and d.name.startswith("screenshots_")],
            key=os.path.getmtime,
            reverse=True
        )
        
        if not screenshot_dirs:
            monitor.log_process("ERROR: No screenshot directory found.")
            return

        latest_dir = screenshot_dirs[0]
        monitor.log_process(f"Scraper finished. Output: {latest_dir.name}")
        
        # Save output directory to audit log
        monitor.load_from_disk()
        monitor.data["output_dir"] = str(latest_dir)
        monitor.save()
        
        # 2. Analyze Images
        analyze_cmd = [
            sys.executable, "-W", "ignore", "analyze_images.py",
            "--input-dir", str(latest_dir),
            "--scan-id", scan_id
        ]
        run_step(analyze_cmd, "Image Analysis")
        
        # 3. Rank Deals
        rank_cmd = [
            sys.executable, "-W", "ignore", "rank_deals.py",
            "--input", str(latest_dir / "market_inventory.json"),
            "--scan-id", scan_id
        ]
        if request.user_intent:
            rank_cmd.extend(["--user-intent", request.user_intent])
        run_step(rank_cmd, "Deal Ranking")
        
        # 4. Deep Dive
        target_file = latest_dir / "potential_buys.json"
        
        # Fallback just in case
        if not target_file.exists():
             target_file = latest_dir / "ranked_deals.json"

        if target_file.exists():
            deep_dive_cmd = [
                 sys.executable, "-W", "ignore", "deep_dive.py",
                 "--input", str(target_file),
                 "--listings", str(latest_dir / "listings.json"),
                 "--auth-file", AUTH_FILE,
                 "--data-dir", DATA_DIR,
                 "--scan-id", scan_id
            ]
            if request.user_intent:
                deep_dive_cmd.extend(["--user-intent", request.user_intent])
            
            run_step(deep_dive_cmd, "Deep Dive Verification")
            
        monitor.log_process("Pipeline Completed Successfully.")

    except subprocess.CalledProcessError as e:
        monitor.log_process(f"CRITICAL ERROR: Step failed: {e.cmd}")
    except Exception as e:
        monitor.log_process(f"UNEXPECTED ERROR: {e}")
    finally:
        monitor.load_from_disk()
        monitor.stop_step("pipeline_wall_clock")
        monitor.finish_scan()

@app.post("/scan")
async def start_scan(request: ScanRequest, background_tasks: BackgroundTasks):
    scan_id = str(uuid.uuid4())
    background_tasks.add_task(run_scraper_pipeline, request, scan_id)
    return {"status": "Scan started", "scan_id": scan_id, "query": request.query, "location": request.location}

@app.get("/scan/{scan_id}")
def get_scan_status(scan_id: str):
    """
    Frontend polls this to get live stats and final results.
    """
    """
    Frontend polls this to get live stats and final results.
    """
    # Look in the new jobs directory
    job_dir = Path(DATA_DIR) / "jobs" / scan_id
    audit_file = job_dir / "audit.json"
    
    if audit_file.exists():
        with open(audit_file, "r") as f:
            data = json.load(f)
        
        # [REMOVED REDUNDANT BLOCK]
        
        status = "complete" if data["end_time"] else "running"
        response = {
            "status": status,
            "stats": data,
            "results": None,
            "stage": "initializing"
        }
        
        # Load the results if they exist (linked via output_dir in data)
        # Load the results if they exist (linked via output_dir in data)
        if "output_dir" in data:
            # Handle path mapping between Docker and Host
            out_str = data["output_dir"]
            
            if out_str.startswith("/app/data") and DATA_DIR != "/app/data":
                out_str = out_str.replace("/app/data", DATA_DIR)
            output_dir = Path(out_str)
            
            # 1. Market Inventory (Always Load if Available)
            if (output_dir / "market_inventory.json").exists():
                try:
                    with open(output_dir / "market_inventory.json", "r") as f:
                        inventory_data = json.load(f)
                        response["inventory"] = inventory_data 
                        response["stage"] = "analyzed"
                except: pass

            # 2. Verified Steals (Final Results)
            if (output_dir / "verified_steals.json").exists():
                try:
                    with open(output_dir / "verified_steals.json", "r") as f:
                        data_loaded = json.load(f)
                        # Deep Dive returns {"verified": [], "rejected": []}
                        if isinstance(data_loaded, dict) and "verified" in data_loaded:
                            response["results"] = data_loaded["verified"]
                        else:
                            response["results"] = data_loaded
                        
                        response["stage"] = "complete"
                        return response
                except: pass

            # 3. Potential Buys (Ranked)
            if (output_dir / "potential_buys.json").exists():
                 try:
                    with open(output_dir / "potential_buys.json", "r") as f:
                        response["results"] = json.load(f)
                        response["stage"] = "ranked"
                        return response
                 except: pass

                 
            # 1. Raw Listings (Scraped)
            # Only fall back to this if we don't have inventory yet
            elif (output_dir / "listings.json").exists():
                 try:
                    with open(output_dir / "listings.json", "r") as f:
                        response["results"] = json.load(f)
                        response["stage"] = "scraped"
                        return response
                 except: pass
        
        return response

    return {"status": "not_found", "stats": None, "results": None}

@app.get("/scan/{scan_id}/log")
def get_scan_log(scan_id: str):
    """
    Returns the process log for the scan.
    """
    log_file = Path(DATA_DIR) / "jobs" / scan_id / "process.log"
    if log_file.exists():
        with open(log_file, "r") as f:
            return {"log": f.read()}
    return {"log": ""}

@app.delete("/scan/{scan_id}")
def delete_job(scan_id: str):
    """
    Deletes a job and its associated data.
    """
    jobs_dir = Path(DATA_DIR) / "jobs"
    job_dir = jobs_dir / scan_id
    
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="Job not found")
        
    try:
        # 1. Read audit to find output_dir (screenshots)
        audit_file = job_dir / "audit.json"
        output_dir = None
        if audit_file.exists():
            try:
                with open(audit_file, "r") as f:
                    data = json.load(f)
                    if "output_dir" in data:
                        # Handle path mapping between Docker and Host
                        out_str = data["output_dir"]
                        if out_str.startswith("/app/data") and DATA_DIR != "/app/data":
                            out_str = out_str.replace("/app/data", DATA_DIR)
                        output_dir = Path(out_str)
            except: pass
            
        # 2. Delete screenshot dir if exists
        if output_dir and output_dir.exists():
            import shutil
            shutil.rmtree(output_dir)
            
        # 3. Delete job dir
        import shutil
        shutil.rmtree(job_dir)
        
        return {"status": "deleted", "scan_id": scan_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/jobs")
def list_jobs():
    """
    Returns a list of past jobs.
    """
    jobs_dir = Path(DATA_DIR) / "jobs"
    if not jobs_dir.exists():
        return {"jobs": []}
    
    jobs = []
    try:
        for job_folder in jobs_dir.iterdir():
            if job_folder.is_dir():
                audit_file = job_folder / "audit.json"
                if audit_file.exists():
                    try:
                        with open(audit_file, "r") as f:
                            data = json.load(f)
                            jobs.append({
                                "scan_id": data.get("scan_id"),
                                "start_time": data.get("start_time"),
                                "end_time": data.get("end_time"),
                                "status": "complete" if data.get("end_time") else "running",
                                "query": data.get("query") or "Unknown",
                                "location": data.get("location") or "Unknown",
                                "source": data.get("source") or "manual"
                            })
                    except:
                        pass
        
        # Sort by start_time decending
        jobs.sort(key=lambda x: x["start_time"] or "", reverse=True)
        print(f"[*] /jobs returning {len(jobs)} items")
        return {"jobs": jobs}
    except Exception as e:
        import traceback
        print(f"[!] /jobs ERROR: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/scheduler/debug")
def scheduler_debug():
    from scheduler import scheduler
    import datetime
    jobs = []
    for j in scheduler.get_jobs():
        jobs.append({
            "id": j.id,
            "next_run_time": str(j.next_run_time),
            "trigger": str(j.trigger)
        })
    return {
        "server_time": str(datetime.datetime.now()),
        "jobs": jobs,
        "scheduler_running": scheduler.running
    }

@app.post("/debug/send-test-email")
def debug_send_email(email: str = None):
    from email_service import format_deal_email, send_email, load_settings
    import json
    import os
    
    # Logic to find latest scan with results
    data_dir = DATA_DIR
    screenshot_dirs = sorted(
        [d for d in data_dir.iterdir() if d.is_dir() and d.name.startswith("screenshots_")],
        key=os.path.getmtime,
        reverse=True
    )
    
    if not screenshot_dirs:
        return {"error": "No scan data found to test with."}
        
    latest_dir = screenshot_dirs[0]
    results_file = latest_dir / "verified_steals.json"
    if not results_file.exists():
         results_file = latest_dir / "ranked_deals.json"
         
    if not results_file.exists():
        return {"error": "No results found in latest scan.", "path": str(latest_dir)}
        
    with open(results_file, "r") as f:
        data = json.load(f)
        deals = data.get("verified", []) if isinstance(data, dict) else data
        
    if not deals:
        return {"error": "Latest scan has no deals."}
        
    settings = load_settings()
    dest_email = email or settings.get("default_email")
    
    if not dest_email:
        return {"error": "No email provided and no default email setting found."}
        
    email_body, attachments = format_deal_email(deals, "TEST EMAIL from Debugger", latest_dir)
    success = send_email(dest_email, "Marketplace Hunter: TEST EMAIL", email_body, attachments)
    
    return {
        "success": success,
        "email_to": dest_email,
        "deals_count": len(deals),
        "attachments_count": len(attachments),
        "source_dir": str(latest_dir)
    }

# ----------------- SCHEDULER & SETTINGS -----------------
from pydantic import BaseModel
from scheduler import (
    start_scheduler, load_schedules, save_schedules, 
    SETTINGS_FILE, load_settings, run_scheduled_scan
)
import json

# Scheduler is now started via lifespan at the top of the file

class ScheduleModel(BaseModel):
    id: str = None
    query: str
    location: str = "erskineville"
    radius: int = 10
    min_listings: int = 10
    user_intent: str = ""
    frequency: str = "daily" # daily, weekly
    time: str = "09:00" # HH:MM 24h format
    email_to: str = ""
    active: bool = True

class SettingsModel(BaseModel):
    smtp_server: str
    smtp_port: int
    smtp_user: str
    smtp_password: str
    default_email: str

@app.get("/schedules")
def get_schedules():
    return {"schedules": load_schedules()}

@app.post("/schedules")
def save_schedule(schedule: ScheduleModel):
    schedules = load_schedules()
    
    if not schedule.id:
        schedule.id = str(uuid.uuid4())
        # Default dates
        data = schedule.dict()
        data['last_run'] = None
        data['next_run'] = None
        schedules.append(data)
    else:
        # Update existing
        for i, s in enumerate(schedules):
            if s['id'] == schedule.id:
                data = schedule.dict()
                # Preserve run times
                data['last_run'] = s.get('last_run')
                data['next_run'] = s.get('next_run')
                schedules[i] = data
                break
                
    save_schedules(schedules)
    from scheduler import refresh_jobs
    refresh_jobs()
    return {"status": "saved", "schedule": schedule}

@app.delete("/schedules/{schedule_id}")
def delete_schedule(schedule_id: str):
    schedules = load_schedules()
    schedules = [s for s in schedules if s['id'] != schedule_id]
    save_schedules(schedules)
    from scheduler import refresh_jobs
    refresh_jobs()
    return {"status": "deleted"}

@app.post("/schedules/{schedule_id}/run")
def trigger_schedule(schedule_id: str, background_tasks: BackgroundTasks):
    schedules = load_schedules()
    target = next((s for s in schedules if s['id'] == schedule_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Schedule not found")
        
    scan_id = str(uuid.uuid4())
    background_tasks.add_task(run_scheduled_scan, target, source="manual_scheduled", scan_id=scan_id)
    return {"status": "Triggered manual run", "scan_id": scan_id}

@app.get("/settings")
def get_settings():
    settings = load_settings()
    # Redact password for frontend
    if "smtp_password" in settings:
         settings["smtp_password"] = "********"
    return settings

@app.post("/settings")
def save_settings(settings: SettingsModel):
    new_data = settings.dict()
    
    # Handle password update logic (if ********, keep old one)
    current = load_settings()
    if new_data["smtp_password"] == "********":
        new_data["smtp_password"] = current.get("smtp_password", "")
        
    with open(SETTINGS_FILE, "w") as f:
        json.dump(new_data, f, indent=2)
        
    return {"status": "Settings saved"}