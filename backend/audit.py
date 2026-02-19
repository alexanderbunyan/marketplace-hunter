import time
import json
import os
from pathlib import Path
from datetime import datetime

class ScanMonitor:
    def __init__(self, scan_id, data_dir="data", query=None, location=None, radius=None, min_listings=None, user_intent=None, source="manual"):
        self.scan_id = scan_id
        self.data_dir = Path(data_dir)
        # Reorganized structure: data/jobs/{scan_id}/
        self.job_dir = self.data_dir / "jobs" / scan_id
        self.job_dir.mkdir(parents=True, exist_ok=True)
        
        self.log_file = self.job_dir / "audit.json"
        self.process_log_file = self.job_dir / "process.log"
        
        # Initialize Process Logger
        self._setup_logging()
        
        self.data = {
            "scan_id": scan_id,
            "source": source,
            "query": query,
            "location": location,
            "radius": radius,
            "min_listings": min_listings,
            "user_intent": user_intent,
            "start_time": datetime.now().isoformat(),
            "end_time": None,
            "total_duration_seconds": 0.0,
            "total_cost_usd": 0.0,
            "total_tokens": {"input": 0, "output": 0},
            "steps": {},
            "job_dir": str(self.job_dir)
        }
        
        # Pricing (USD per 1M tokens)
        self.PRICING = {
            "gemini-1.5-flash": {"input": 0.35, "output": 1.05}, # Updated Flash Pricing
            "gemini-1.5-pro": {"input": 3.50, "output": 10.50},  # Updated Pro Pricing
            "gemini-2.0-flash": {"input": 0.10, "output": 0.40}, # 2.0 Flash Preview estimate
            "gemini-3-pro-preview": {"input": 2.00, "output": 12.00} # Placeholder for 3-pro if used (using Pro rates)
        }
        
        # Load existing if available (for subprocesses appending)
        self.load()

    def _setup_logging(self):
        # Configure a specific logger for this scan to write to process.log
        # valid step names or just general logs can go here.
        # For simplicity, we just ensure the file exists.
        if not self.process_log_file.exists():
            self.process_log_file.touch()

    def log_process(self, message: str):
        """Append a message to the process.log file."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        with open(self.process_log_file, "a") as f:
            f.write(f"[{timestamp}] {message}\n")

    def load(self):
        if self.log_file.exists():
            try:
                with open(self.log_file, "r") as f:
                    self.data = json.load(f)
            except:
                pass # Start fresh if error

    def load_from_disk(self):
        self.load()

    def save(self):
        with open(self.log_file, "w") as f:
            json.dump(self.data, f, indent=2)

    def start_step(self, step_name):
        self.load() # Reload latest state
        if step_name not in self.data["steps"]:
            self.data["steps"][step_name] = {
                "start_time": datetime.now().isoformat(),
                "duration_seconds": 0.0,
                "tokens": {"input": 0, "output": 0},
                "cost_usd": 0.0
            }
        else:
            self.data["steps"][step_name]["start_time"] = datetime.now().isoformat()
        self.save()

    def stop_step(self, step_name):
        self.load() # Reload latest state
        if step_name in self.data["steps"]:
            start_str = self.data["steps"][step_name].get("start_time")
            if start_str:
                start_dt = datetime.fromisoformat(start_str)
                duration = (datetime.now() - start_dt).total_seconds()
                self.data["steps"][step_name]["duration_seconds"] += duration 
                # Accumulate if step runs multiple times (e.g. per item deep dive)
        self.save()

    def log_tokens(self, step_name, model_name, input_t, output_t):
        self.load() # Reload latest state
        if step_name not in self.data["steps"]:
            self.start_step(step_name) # Ensure step exists (via self call which saves, but we reload/save again here which is safe)
            
        # Update Step Tokens
        self.data["steps"][step_name]["tokens"]["input"] += input_t
        self.data["steps"][step_name]["tokens"]["output"] += output_t
        
        # Calculate Step Cost
        cost = self._calculate_cost(model_name, input_t, output_t)
        self.data["steps"][step_name]["cost_usd"] += cost
        
        # Update Totals
        self.data["total_tokens"]["input"] += input_t
        self.data["total_tokens"]["output"] += output_t
        self.data["total_cost_usd"] += cost
        
        self.save()
        
    def _calculate_cost(self, model_name, input_t, output_t):
        # Normalize model name to finding pricing key
        pricing_key = "gemini-1.5-flash" # Default low
        
        for key in self.PRICING:
            if key in model_name.lower():
                pricing_key = key
                break
                
        rates = self.PRICING.get(pricing_key, self.PRICING["gemini-1.5-flash"])
        
        input_cost = (input_t / 1_000_000) * rates["input"]
        output_cost = (output_t / 1_000_000) * rates["output"]
        
        return input_cost + output_cost

    def finish_scan(self):
        self.load() # Reload latest state
        self.data["end_time"] = datetime.now().isoformat()
        start = datetime.fromisoformat(self.data["start_time"])
        self.data["total_duration_seconds"] = (datetime.now() - start).total_seconds()
        self.save()
        
        self.log_process("Scan finished. Audit log saved.")
        print(f"Audit log saved to {self.log_file}")
