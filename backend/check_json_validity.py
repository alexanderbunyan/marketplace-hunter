import json
import math
from pathlib import Path
import os

# Define data dir (harcoded based on user screenshot)
DATA_DIR = r"C:\Users\Alex\Development Folder\marketplace-hunter\data"
jobs_dir = Path(DATA_DIR) / "jobs"

print(f"Checking for invalid JSON values in {jobs_dir}...")

def has_invalid_floats(obj, path=""):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if has_invalid_floats(v, f"{path}.{k}"):
                return True
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            if has_invalid_floats(v, f"{path}[{i}]"):
                return True
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            print(f"Found invalid float: {obj} at {path}")
            return True
            
    return False

invalid_count = 0
for job_folder in jobs_dir.iterdir():
    if job_folder.is_dir():
        audit_file = job_folder / "audit.json"
        if audit_file.exists():
            try:
                with open(audit_file, "r") as f:
                    content = f.read()
                    
                # Python's json loader handles NaN, but let's check values after loading
                data = json.loads(content)
                if has_invalid_floats(data, f"{job_folder.name}/audit.json"):
                    invalid_count += 1
                    print(f"!!! FAIL: {audit_file} contains NaN or Infinity")
            except Exception as e:
                print(f"Error reading {audit_file}: {e}")

if invalid_count == 0:
    print("All audit.json files are clean.")
else:
    print(f"Found {invalid_count} files with invalid values.")
