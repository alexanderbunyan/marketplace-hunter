import os
from pathlib import Path
import json
import sys

# Replicate DATA_DIR logic
if os.path.exists("/.dockerenv"):
    DATA_DIR = "/app/data"
else:
    # Try backend-relative first
    backend_data = Path("c:/Users/Alex/Development Folder/marketplace-hunter/backend") / "data"
    # Try project-root relative
    project_data = Path("c:/Users/Alex/Development Folder/marketplace-hunter") / "data"
    
    if project_data.exists():
        DATA_DIR = str(project_data)
    elif backend_data.exists():
        DATA_DIR = str(backend_data)
    else:
        DATA_DIR = str(project_data)

print(f"DATA_DIR: {DATA_DIR}")

def list_jobs():
    jobs_dir = Path(DATA_DIR) / "jobs"
    print(f"Jobs Dir: {jobs_dir}")
    if not jobs_dir.exists():
        print("Jobs dir does not exist")
        return {"jobs": []}
    
    jobs = []
    try:
        for job_folder in jobs_dir.iterdir():
            print(f"Checking {job_folder}")
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
                                "location": data.get("location") or "Unknown"
                            })
                    except Exception as e:
                        print(f"Error reading audit file {audit_file}: {e}")
                        pass
        
        # Sort by start_time decending
        jobs.sort(key=lambda x: x["start_time"], reverse=True)
        return {"jobs": jobs}
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()

print(list_jobs())
