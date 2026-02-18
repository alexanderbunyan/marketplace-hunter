
import os
import json
import argparse
import time
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai
from PIL import Image
from audit import ScanMonitor

# Load environment variables
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("Error: GOOGLE_API_KEY not found in .env file.")
    print("Please create a .env file with GOOGLE_API_KEY=your_key_here")
    exit(1)

genai.configure(api_key=api_key)

# Initialize Model
# Using gemini-3-flash-preview as requested for Harvester
MODEL_NAME = "gemini-3-flash-preview" 

def analyze_image(image_path, monitor=None):
    try:
        if not os.path.exists(image_path):
            print(f"Image not found: {image_path}")
            return None

        # Load image
        img = Image.open(image_path)
        
        # Configure model
        model = genai.GenerativeModel(MODEL_NAME)
        
        prompt = """
        You are an expert flipper. Analyze this image and text.

        Identify: If the brand is generic/unknown, look at the build quality (e.g., chrome base vs. plastic, mesh quality) to guess the tier.
        
        Estimate Original RRP: Based on the visual look, estimate how much this item cost when brand new (e.g., "Est. New: $300").
        
        The "Steal" Factor: Compare the listed price vs your estimated_rrp.
        
        Visual Cues: specific details that add/subtract value (e.g., "Ergonomic adjustments visible", "Rust on legs", "Stains on fabric").
        
        Return JSON with:
        {
            "visual_brand_model": "Identified Brand and Model",
            "visual_tier": "Budget | Mid-Range | High-End/Designer",
            "visual_condition": "New | Used - Good | Used - Poor",
            "estimated_new_price": 0,
            "deal_rating": 0,
            "flipper_comment": "One sentence verdict."
        }
        """
        
        response = model.generate_content([prompt, img])
        
        if monitor and response.usage_metadata:
             monitor.log_tokens(
                 "analyze_images", 
                 MODEL_NAME, 
                 response.usage_metadata.prompt_token_count, 
                 response.usage_metadata.candidates_token_count
             )
        
        # Parse JSON response
        try:
            # Clean up code blocks if present
            text = response.text.strip()
            if text.startswith("```json"):
                text = text.replace("```json", "").replace("```", "")
            elif text.startswith("```"):
                text = text.replace("```", "")
                
            return json.loads(text)
        except json.JSONDecodeError:
            print(f"Failed to parse JSON from AI response for {image_path}")
            return None
            
    except Exception as e:
        print(f"Error analyzing {image_path}: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Analyze Marketplace Listings with Gemini Vision")
    parser.add_argument("--input-dir", required=True, help="Directory containing listings.json and images")
    parser.add_argument("--scan-id", help="Scan ID for audit logging")
    
    args = parser.parse_args()
    
    # Support relative paths from default data dir if needed, but usually input-dir is passed full or relative to execution
    input_dir = Path(args.input_dir)
    
    # If input_dir is just a name and not a path, check if it's in data/
    if not input_dir.exists() and (Path("data") / input_dir).exists():
        input_dir = Path("data") / input_dir
        
    listings_file = input_dir / "listings.json"
    output_file = input_dir / "market_inventory.json"
    
    if not listings_file.exists():
        print(f"Error: {listings_file} not found.")
        return

    print(f"Loading listings from {listings_file}...")
    with open(listings_file, "r", encoding="utf-8") as f:
        listings = json.load(f)
        
    print(f"Found {len(listings)} items. Starting analysis with {MODEL_NAME}...")
    
    monitor = None
    if args.scan_id:
        # Determine data_dir. Input dir is likely inside data/screenshots_...
        # We can try to traverse up to find data dir, or assume standard structure.
        # Deep dive uses passed data-dir. Analyze images just gets input-dir.
        # Let's try to infer data_dir from input_dir parent.
        # If input_dir is /app/data/screenshots_..., parent is /app/data.
        data_dir = input_dir.parent
        monitor = ScanMonitor(args.scan_id, data_dir=data_dir)
        monitor.start_step("analyze_images")
    
    analyzed_listings = []
    
    # Load existing if resuming
    if output_file.exists():
        try:
            with open(output_file, "r", encoding="utf-8") as f:
                analyzed_listings = json.load(f)
                print(f"Resuming... Loaded {len(analyzed_listings)} already analyzed items.")
        except:
            pass
    
    # Create a set of already processed IDs for fast lookup
    processed_ids = {item["id"] for item in analyzed_listings}
    
    try:
        for i, item in enumerate(listings):
            if item["id"] in processed_ids:
                continue
                
            print(f"Processing {i+1}/{len(listings)}: {item.get('title', 'Unknown')} (ID: {item['id']})")
            
            # Construct image path
            # Logic: listing.json has 'screenshot': 'item_ID.png'
            # Image is in input_dir / item['screenshot']
            image_name = item.get("screenshot")
            if not image_name:
                print("No screenshot filename provided in item.")
                continue
                
            image_path = input_dir / image_name
            
            # Call AI
            ai_data = analyze_image(image_path, monitor)
            
            if ai_data:
                # Merge AI data with original item data
                enriched_item = item.copy()
                enriched_item.update(ai_data)
                analyzed_listings.append(enriched_item)
                
                # Save incrementally
                with open(output_file, "w", encoding="utf-8") as f:
                    json.dump(analyzed_listings, f, indent=2, ensure_ascii=False)
                
                # Rate limit politeness
                time.sleep(1) 
            else:
                print("Skipping item due to analysis failure.")
    except KeyboardInterrupt:
        print("\n\n[!] Interrupted by user. Saving current progress...")
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(analyzed_listings, f, indent=2, ensure_ascii=False)
        print("Progress saved. Exiting gracefully.")
        return

    if monitor:
        monitor.stop_step("analyze_images")
        
    print(f"Analysis complete. Saved to {output_file}")

if __name__ == "__main__":
    main()
