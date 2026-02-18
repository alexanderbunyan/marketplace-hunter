
import os
import json
import argparse
import time
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai
from audit import ScanMonitor

# Load environment variables
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("Error: GOOGLE_API_KEY not found in .env file.")
    print("Please create a .env file with GOOGLE_API_KEY=your_key_here")
    exit(1)

genai.configure(api_key=api_key)

# Initialize The Ranker Model
MODEL_NAME = "gemini-3-pro-preview" 

def rank_inventory(inventory_data, user_intent=None, monitor=None):
    """
    Sends the inventory to Gemini for analysis and ranking.
    """
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        
        # Prepare data for prompt (simplify to save tokens if needed, but JSON is good)
        inventory_str = json.dumps(inventory_data, indent=2)
        
        input_context = ""
        if user_intent:
            input_context = f"""
        CRITICAL CONTEXT: The user specifically wants this item for: "{user_intent}".
        Filtering Rule: Even if an item is a great price, DISCARD IT if it is technically unsuitable for this specific use case.
        Example: If user wants "4K Plex", discard old/weak NAS models like "j" series or ARM chips.
        Reasoning: If you discard an item for this reason, do not include it in potential_buys.
            """

        prompt = f"""
        You are a master market analyst. I am providing you with a list of items currently for sale on Facebook Marketplace.
        {input_context}
        
        Your Mission:
        1. **Categorize & Group**: Group similar items together.
        2. **Valuation**: Estimate average market price.
        3. **Hunt for Deals**: Identify "Outliers" - items that are significantly underpriced.
        4. **Flag Deep Dives**: Recommend items for a "Deep Dive".
        
        Input Data:
        {inventory_str}
        
        Output Format:
        Return strictly Valid JSON.
        {{
            "market_summary": "Brief overview of the market state for these items.",
            "groups": [
                {{
                    "group_name": "...",
                    "average_price_estimate": "...",
                    "item_ids": ["...", "..."]
                }}
            ],
            "potential_buys": [
                {{
                    "id": "...",
                    "title": "...",
                    "price": "...",
                    "reason": "Why is this a good deal? Be specific.",
                    "confidence": "High/Medium/Low"
                }}
            ]
        }}
        """
        
        print(f"Sending {len(inventory_data)} items to {MODEL_NAME} for ranking...")
        response = model.generate_content(prompt)
        
        if monitor and response.usage_metadata:
             monitor.log_tokens(
                 "rank_deals", 
                 MODEL_NAME, 
                 response.usage_metadata.prompt_token_count, 
                 response.usage_metadata.candidates_token_count
             )
        
        # Parse JSON response
        try:
            text = response.text.strip()
            # Clean up potential markdown blocks
            if text.startswith("```json"):
                text = text.replace("```json", "").replace("```", "")
            elif text.startswith("```"):
                text = text.replace("```", "")
            
            return json.loads(text)
        except json.JSONDecodeError:
            print("Failed to parse JSON from Ranker response.")
            print("Raw response preview:", text[:500])
            return None
            
    except Exception as e:
        print(f"Error during ranking: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Rank Marketplace Deals with Gemini 3 Pro")
    parser.add_argument("--input", required=True, help="Path to market_inventory.json")
    parser.add_argument("--output", help="Path to save potential_buys.json (default: potential_buys.json in same dir)")
    parser.add_argument("--user-intent", help="Specific use case to filter deals (e.g. '4K Plex Server')")
    parser.add_argument("--scan-id", help="Scan ID for audit logging")
    
    args = parser.parse_args()
    
    input_file = Path(args.input)
    # Check if input file exists, if not check in data/
    if not input_file.exists() and (Path("data") / input_file).exists():
        input_file = Path("data") / input_file
        
    if not input_file.exists():
        print(f"Error: {input_file} not found.")
        return
        
    if args.output:
        output_file = Path(args.output)
    else:
        output_file = input_file.parent / "potential_buys.json"
        
    print(f"Loading inventory from {input_file}...")
    with open(input_file, "r", encoding="utf-8") as f:
        inventory = json.load(f)
        
    if not inventory:
        print("Inventory is empty.")
        return
        
    print(f"Analyzing {len(inventory)} items...")
    
    monitor = None
    if args.scan_id:
        # Determine data_dir from input file location
        data_dir = input_file.parent.parent
        monitor = ScanMonitor(args.scan_id, data_dir=data_dir)
        monitor.start_step("rank_deals")
    
    ranking_results = rank_inventory(inventory, args.user_intent, monitor)
    
    # Merge original metadata back into potential buys
    if ranking_results and "potential_buys" in ranking_results:
        # Create a map of the original inventory for fast lookup
        inventory_map = {item.get("id"): item for item in inventory}
        
        merged_buys = []
        for buy in ranking_results["potential_buys"]:
            original = inventory_map.get(buy.get("id"))
            if original:
                # Merge original fields, but let Ranker's specific fields (reason, confidence) take precedence if needed
                # Actually, we want Ranker's reason, but Original's screenshot/metadata
                merged_item = original.copy()
                merged_item.update(buy) # Overwrites original title/price if Ranker changed them, adds reason/confidence
                merged_buys.append(merged_item)
            else:
                merged_buys.append(buy)
        
        ranking_results["potential_buys"] = merged_buys

    
    if monitor:
        monitor.stop_step("rank_deals")
    
    if ranking_results:
        print(f"Analysis complete. Found {len(ranking_results.get('potential_buys', []))} potential buys.")
        
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(ranking_results, f, indent=2, ensure_ascii=False)
            
        print(f"Report saved to {output_file}")
    else:
        print("Analysis failed or returned no results.")

if __name__ == "__main__":
    main()
