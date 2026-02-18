import requests
import sys

BASE_URL = "http://localhost:8000"

def check_endpoint(endpoint):
    url = f"{BASE_URL}{endpoint}"
    print(f"Checking {url}...")
    try:
        response = requests.get(url, timeout=5)
        print(f"Status: {response.status_code}")
        try:
            print(f"Body: {response.json()}")
        except:
            print(f"Body (text): {response.text[:200]}")
        
        if response.status_code == 200:
            return True
        return False
    except Exception as e:
        print(f"Failed to connect: {e}")
        return False

print("--- BACKEND HEALTH CHECK ---")
health = check_endpoint("/health")
jobs = check_endpoint("/jobs")

if health and jobs:
    print("\n✅ Backend appears healthy.")
    sys.exit(0)
else:
    print("\n❌ Backend is failing.")
    sys.exit(1)
