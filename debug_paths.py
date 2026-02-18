
import os
import json
from pathlib import Path

# Simulate main.py logic
if os.path.exists("/.dockerenv"):
    DATA_DIR = "/app/data"
else:
    # Try backend-relative first
    backend_data = Path("backend/data").resolve() # strict=False to not fail if missing
    # Try project-root relative
    project_data = Path("data").resolve()
    
    # We need to simulate the exact logic in main.py relative to WHERE main.py is (backend/)
    # But this script will run from project root likely.
    
    # Let's just reproduce the logic assuming we are in backend/
    base_path = Path("backend/main.py").parent.resolve()
    
    backend_data_candidate = base_path / "data"
    project_data_candidate = base_path.parent / "data"
    
    print(f"Backend candidate: {backend_data_candidate} (Exists: {backend_data_candidate.exists()})")
    print(f"Project candidate: {project_data_candidate} (Exists: {project_data_candidate.exists()})")

    if backend_data_candidate.exists():
        DATA_DIR = str(backend_data_candidate)
    elif project_data_candidate.exists():
        DATA_DIR = str(project_data_candidate)
    else:
        DATA_DIR = str(backend_data_candidate)

print(f"Resolved DATA_DIR: {DATA_DIR}")

# Check specific job
scan_id = "749be71b-cd95-43c8-bb79-9ecc3897791a"
job_dir = Path(DATA_DIR) / "jobs" / scan_id
print(f"Job Dir: {job_dir} (Exists: {job_dir.exists()})")

audit_file = job_dir / "audit.json"
print(f"Audit File: {audit_file} (Exists: {audit_file.exists()})")

if audit_file.exists():
    with open(audit_file, "r") as f:
        data = json.load(f)
    
    print(f"Raw output_dir in audit: {data.get('output_dir')}")
    
    if "output_dir" in data:
        out_str = data["output_dir"]
        if out_str.startswith("/app/data") and DATA_DIR != "/app/data":
            out_str = out_str.replace("/app/data", DATA_DIR)
            print(f"Sanitized path string: {out_str}")
            
        output_dir = Path(out_str)
        print(f"Final Path object: {output_dir} (Exists: {output_dir.exists()})")
        
        results_file = output_dir / "verified_steals.json"
        print(f"Results File: {results_file} (Exists: {results_file.exists()})")
