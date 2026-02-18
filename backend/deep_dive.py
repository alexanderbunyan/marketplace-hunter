
import os
import json
import argparse
import time
import asyncio
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai
from playwright.async_api import async_playwright
import base64
from audit import ScanMonitor

# Load environment variables
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("Error: GOOGLE_API_KEY not found in .env file.")
    exit(1)

genai.configure(api_key=api_key)

# Initialize The Judge Model
# User requested gemini-3-pro or 1.5-pro fallback. 
# Trying 3-pro first as requested for the Ranker previously.
MODEL_NAME = "gemini-3-pro-preview" 

import re

async def clean_json_response(text):
    """
    Robustly extracts JSON from AI response using regex.
    """
    try:
        # Find the first { and the last }
        match = re.search(r'(\{.*\})', text, re.DOTALL)
        if match:
            json_str = match.group(1)
            return json.loads(json_str)
        else:
            # Fallback: try standard parsing if regex fails (unlikely if match logic is sound)
            return json.loads(text)
    except Exception as e:
        print(f"JSON Parse Error: {e}")
        # print(f"Raw text was: {text}")
        return None

async def verify_deal(page, item, model, output_dir, user_intent=None, monitor=None):
    item_id = item.get("id")
    url = item.get("url")
    price = item.get("price", "Unknown Price")
    title = item.get("title", "Unknown Item")
    original_hypothesis = item.get("reason", "No specific hypothesis provided.")
    
    print(f"\n--- Verifying: {title} ({price}) ---")
    print(f"Hypothesis: {original_hypothesis}")
    print(f"Navigating to {url}")
    
    # Storage for images to send to AI
    captured_images = []
    
    try:
        # Set fixed viewport for consistent "smart" screenshots - 1280x800 as requested
        await page.set_viewport_size({"width": 1280, "height": 800})
        
        await page.goto(url, timeout=60000)
        await page.wait_for_load_state("domcontentloaded")
        
        # Human-like pause
        await asyncio.sleep(2)
        
        # 1. Expand Description
        try:
            # Try specific "See more" or "Read more" button for description
            expand_buttons = page.get_by_text(re.compile(r"^(See|Read) more$"), exact=True)
            if await expand_buttons.count() > 0:
                await expand_buttons.first.click()
                await asyncio.sleep(0.5)
        except Exception:
            pass

        # 2. Scrape Description
        description_text = ""
        try:
            # Strategy: Main role usually contains the description
            main_element = page.get_by_role("main")
            if await main_element.is_visible():
                description_text = await main_element.inner_text()
            
            # Fallback: Scrape body if main is empty or missing
            if not description_text or len(description_text.strip()) < 50:
                print("Main content empty/short, scraping body as fallback...")
                description_text = await page.inner_text("body")
                
        except Exception as e:
            print(f"Error extracting description: {e}")
            try:
                description_text = await page.inner_text("body")
            except:
                description_text = "Could not extract text."

        # 3. Smart Screenshots & Carousel
        print("Capturing images...")
        
        # Ensure focus is on the page body for keyboard events
        try:
            await page.click("body") 
        except:
            pass

        # Image 1: Main Viewport
        main_shot_path = output_dir / f"deep_dive_{item_id}_main.png"
        await page.screenshot(path=str(main_shot_path)) # Default is viewport only
        captured_images.append(main_shot_path)
        print(f"Captured Main: {main_shot_path}")
        
        # Carousel Navigation via Keyboard (Right Arrow)
        for i in range(2):
            try:
                # Press Right Arrow to advance carousel
                await page.keyboard.press("ArrowRight")
                await asyncio.sleep(1.0) # Wait for animation
                
                extra_shot_path = output_dir / f"deep_dive_{item_id}_extra_{i+1}.png"
                await page.screenshot(path=str(extra_shot_path))
                captured_images.append(extra_shot_path)
                print(f"Captured Extra {i+1}: {extra_shot_path}")
            except Exception as e:
                print(f"Error advancing carousel: {e}")
                break

        # 4. AI Analysis
        from PIL import Image
        pil_images = [Image.open(p) for p in captured_images]
        
        prompt = f"""
        You are a skeptical auditor validating a flagged "Steal".
        
        Item: '{title}'
        Listed Price: '{price}'
        Our Hypothesis (Why we flagged it): "{original_hypothesis}"
        
        SOURCE OF TRUTH (Full Page Text):
        "{description_text[:10000]}"
        
        User Goal: "{user_intent if user_intent else 'General Deal Hunting'}"
        
        Task: Read the SOURCE OF TRUTH text and look at the {len(pil_images)} images to INVALIDATE this hypothesis. 
        Perform these specific checks:
        
        1. The "Bait & Switch" Check: Is the listed price for the headline item, or for a cheaper variant/accessory mentioned in the text?
        2. The "Ghost" Check: Is the specific high-value item marked 'Sold', 'Pending', 'Gone', or 'Stolen'?
        3. The "Lemon" Check: Are there hidden defects (e.g. 'untested', 'parts only', 'broken')?
        4. The "Logistics" Check: Are there unreasonable constraints (e.g. 'Pickup only from [Remote Location]')?
        5. The "Spec Check": If a User Goal is specified, does this item meet the technical requirements? 
           - CRITICAL: If intent is "Plex" or "Transcoding", reject ARM/Realtek CPUs. Prioritize Intel QuickSync (Celeron J4125, N5105, i3/i5+).
           - If not met, REJECT as "Technically Unsuitable".
        
        Verdict: 
        - Return "VERIFIED_DEAL" ONLY if the original hypothesis holds up against scrutiny and it is a legit, available deal.
        - Return "REJECTED" if any deal-breaker is found.
        
        Return RAW JSON ONLY. No markdown. No intro.
        {{
            "verdict": "VERIFIED_DEAL" | "REJECTED",
            "rejection_reason": "Specific reason if rejected (e.g. 'Price Mismatch: $180 is for 2TB drive'). null if verified.",
            "visual_confirmation": "Does visual evidence support the text? (e.g. 'Photos show 8TB label')"
        }}
        """
        
        print(f"Sending {len(captured_images)} images to The Auditor ({MODEL_NAME})...")
        # Send prompt + list of images
        response = model.generate_content([prompt] + pil_images)
        
        if monitor and response.usage_metadata:
             monitor.log_tokens(
                 "deep_dive", 
                 MODEL_NAME, 
                 response.usage_metadata.prompt_token_count, 
                 response.usage_metadata.candidates_token_count
             )
        
        # Parse JSON using robust cleaner
        result = await clean_json_response(response.text)
        
        if result:
            result['description_raw'] = description_text
            return result
        else:
            print("Failed to parse AI response.")
            return {"verdict": "ERROR", "reason": "AI parse failure", "description_raw": description_text}

    except Exception as e:
        print(f"Error checking item {item_id}: {e}")
        return {"verdict": "ERROR", "reason": str(e), "description_raw": description_text if 'description_text' in locals() else "Error extracting text"}

async def run(args):
    data_dir = Path(getattr(args, 'data_dir', 'data'))
    data_dir.mkdir(parents=True, exist_ok=True)
    
    input_file = Path(args.input)
    listings_file = Path(args.listings)
    
    # Resolve input paths relative to data_dir if not found
    if not input_file.exists() and (data_dir / input_file).exists():
        input_file = data_dir / input_file
        
    if not listings_file.exists() and (data_dir / listings_file).exists():
        listings_file = data_dir / listings_file
        
    if not input_file.exists():
        print(f"Error: {input_file} not found.")
        return
    if not listings_file.exists():
        print(f"Error: {listings_file} not found.")
        return
        
    # Load Listings for URL lookup
    with open(listings_file, "r", encoding="utf-8") as f:
        all_listings = json.load(f)
        # Map ID to URL
        id_to_url = {item["id"]: item["url"] for item in all_listings}
        
    # Load Potential Buys
    with open(input_file, "r", encoding="utf-8") as f:
        potential_data = json.load(f)
        
    # Handle structure from Ranker
    potential_buys = potential_data.get("potential_buys", [])
    if not potential_buys:
        print("No potential buys found in input file.")
        return
        
    print(f"Found {len(potential_buys)} deals to verify.")
    
    monitor = None
    if args.scan_id:
        data_dir = Path(getattr(args, 'data_dir', 'data'))
        monitor = ScanMonitor(args.scan_id, data_dir=data_dir)
        monitor.start_step("deep_dive")
    
    # Initialize AI
    try:
        model = genai.GenerativeModel(MODEL_NAME)
    except:
        print(f"Model {MODEL_NAME} not found, falling back to gemini-1.5-pro")
        model = genai.GenerativeModel("gemini-1.5-pro")

    # Output file
    output_file = input_file.parent / "verified_steals.json"
    
    verified_steals = []
    rejected_deals = []

    async with async_playwright() as p:
        browser = None
        context = None
        
        try:
            if args.auth_file:
                 print(f"Launching Chrome with auth file: {args.auth_file}...")
                 browser = await p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-setuid-sandbox"])
                 context = await browser.new_context(
                     storage_state=args.auth_file,
                     viewport={"width": 1280, "height": 1400}
                 )
                 page = await context.new_page()
            else:
                # Persistent context fallback (local dev)
                print(f"Launching Chrome with persistent context...")
                context = await p.chromium.launch_persistent_context(
                    user_data_dir="./verifier_profile",
                    headless=False,
                    channel="chrome",
                    viewport={"width": 1280, "height": 1400},
                    args=["--disable-blink-features=AutomationControlled"]
                )
                page = context.pages[0] if context.pages else await context.new_page()
            
            for deal in potential_buys:
                deal_id = deal.get("id")
                url = id_to_url.get(deal_id)
                
                if not url:
                    print(f"URL not found for deal ID {deal_id}, skipping.")
                    continue
                    
                # Merge deal info with url
                full_item = deal.copy()
                full_item["url"] = url
                
                # Verify
                # Pass output_dir (same as input parent) for screenshots
                verdict_data = await verify_deal(page, full_item, model, input_file.parent, args.user_intent, monitor)
                
                # Update deal with verdict
                # CRITICAL: Prepare the final object by merging ORIGINAL data with VERIFIED data
                # We want to keep the original screenshot if the verifier didn't take a better one (mostly it doesn't return one in the JSON)
                
                final_deal = deal.copy() # Start with original (has screenshot, potentially)
                final_deal.update(verdict_data) # Overlay verification results
                
                # Ensure screenshot is preserved if missing in verdict
                if "screenshot" not in final_deal and "screenshot" in deal:
                    final_deal["screenshot"] = deal["screenshot"]
                
                output_data = {
                    "verified": verified_steals,
                    "rejected": rejected_deals
                }
                
                if verdict_data.get("verdict") == "VERIFIED_DEAL":
                    verified_steals.append(final_deal)
                    print(f"  [!] VERIFIED STEAL: {deal['title']}")
                else:
                    rejected_deals.append(final_deal)
                    reason = verdict_data.get('rejection_reason') or verdict_data.get('reason') or "Unknown"
                    print(f"  [x] Rejected: {deal['title']} ({reason})")
                
                # Save incrementally
                with open(output_file, "w", encoding="utf-8") as f:
                    json.dump(output_data, f, indent=2, ensure_ascii=False)
                    
        except Exception as e:
            print(f"Browser error: {e}")
        finally:
            if context:
                try:
                    await context.close()
                except:
                    pass
            if browser:
                try:
                    await browser.close()
                except:
                    pass
        
    if monitor:
        monitor.stop_step("deep_dive")
        
    print(f"\nVerification Complete. {len(verified_steals)} verified, {len(rejected_deals)} rejected. Report saved to {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Deep Dive Verification for Marketplace Deals")
    parser.add_argument("--input", required=True, help="Path to potential_buys.json")
    parser.add_argument("--listings", required=True, help="Path to original listings.json (for URL lookup)")
    parser.add_argument("--auth-file", help="Path to auth.json")
    parser.add_argument("--data-dir", default="data", help="Directory for data persistence")
    parser.add_argument("--user-intent", help="Specific use case to verify against (e.g. '4K Plex Server')")
    parser.add_argument("--scan-id", help="Scan ID for audit logging")
    
    args = parser.parse_args()
    asyncio.run(run(args))
