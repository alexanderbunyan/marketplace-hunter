import os
import sys
from pathlib import Path
import json

# Replicate logic from main.py
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
        # Default to project root
        DATA_DIR = str(project_data)

print(f"Computed DATA_DIR: {DATA_DIR}")

jobs_dir = Path(DATA_DIR) / "jobs"
print(f"Jobs Directory: {jobs_dir}")
print(f"Exists: {jobs_dir.exists()}")

if jobs_dir.exists():
    items = list(jobs_dir.iterdir())
    print(f"Found {len(items)} items in jobs directory.")
    
    valid_jobs = 0
    for item in items:
        if item.is_dir():
            if (item / "audit.json").exists():
                 valid_jobs += 1
            else:
                 print(f"Warning: No audit.json in {item.name}")
        else:
            print(f"Skipping non-dir: {item.name}")
            
    print(f"Valid Jobs (with audit.json): {valid_jobs}")
else:
    print("Jobs directory does not exist!")
