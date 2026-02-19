import asyncio
import os
import argparse
import sys
import time
import json
import re
from datetime import datetime
from playwright.async_api import async_playwright
from pathlib import Path
from audit import ScanMonitor

async def run(args):
    user_data_dir = args.user_data_dir
    cdp_port = args.cdp_port
    
    # Ensure data directory exists
    data_dir = Path(getattr(args, 'data_dir', 'data'))
    data_dir.mkdir(parents=True, exist_ok=True)
    
    monitor = None
    if args.scan_id:
        monitor = ScanMonitor(args.scan_id, data_dir=data_dir, source=args.source)
        monitor.start_step("scraper")
    
    if user_data_dir and not os.path.exists(user_data_dir):
        print(f"Warning: User data directory '{user_data_dir}' does not exist. Chrome will create a new profile there.")
    
    async with async_playwright() as p:
        # ... (lines 18-68 remain same)
        browser = None
        context = None 
        try:
            if cdp_port:
                print(f"Connecting to existing Chrome instance on port {cdp_port}...")
                browser = await p.chromium.connect_over_cdp(f"http://localhost:{cdp_port}")
                context = browser.contexts[0]
                page = context.pages[0] if context.pages else await context.new_page()
            elif args.auth_file:
                print(f"Launching Chrome with auth file: {args.auth_file}...")
                browser = await p.chromium.launch(headless=args.headless, args=["--no-sandbox", "--disable-setuid-sandbox"])
                try:
                    context = await browser.new_context(storage_state=args.auth_file, viewport={"width": 1920, "height": 1080})
                except Exception as e:
                    print(f"Error loading auth file: {e}")
                    print("Starting with fresh context...")
                    context = await browser.new_context(viewport={"width": 1920, "height": 1080})
                page = await context.new_page()
            else:
                print(f"Launching Chrome with user-data-dir: {user_data_dir}")
                # Launch persistent context
                args_list = ["--disable-blink-features=AutomationControlled"]
                if args.headless:
                    args_list.append("--headless=new")
                
                args_list.append("--start-maximized")
                
                context = await p.chromium.launch_persistent_context(
                    user_data_dir,
                    headless=args.headless, 
                    channel="chrome",
                    viewport={"width": 1920, "height": 1080},
                    args=args_list
                )
                page = context.pages[0] if context.pages else await context.new_page()

        except Exception as e:
            print(f"\nError launching/connecting to browser: {e}")
            if "Target page, context or browser has been closed" in str(e) or "lock" in str(e).lower():
                print("\n[SUGGESTION] It looks like Chrome is already running with this profile.")
                # ... suggestions ...
            return
            
        try:
            # ... (navigation logic lines 70-108 remain same)
            
            # Navigate to Marketplace Root
            print("Navigating to Facebook Marketplace root...")
            await page.goto("https://www.facebook.com/marketplace", timeout=60000)
            
            # Check for login
            try:
                await page.wait_for_selector('role=main', timeout=5000)
            except:
                print("\n" + "="*60)
                print("ACTION REQUIRED: Please log in to Facebook.")
                print("="*60 + "\n")
                await page.wait_for_selector('role=main', timeout=300000)

            # --- LOCATION & RADIUS FILTERING ---
            if args.location:
                print(f"Setting location to: {args.location} (Radius: {args.radius}km)...")
                try:
                    # 1. Open Location Modal
                    # Try to find the location button. It usually displays the current location.
                    # We look for a button that likely contains "km" or a location name, or just the "Change location" span.
                    # Best bet: Look for the specific location path in the URL to see if we are already there? No, user said URL is unreliable.
                    
                    # Heuristic: Find the button that opens the map/radius modal.
                    # Often has text like "Sydney • 65 km" or "Newtown".
                    # Let's try locating by the "Location" text in the sidebar if possible, or using a broad selector.
                    
                    # Try clicking the "Location" settings logic
                    # We'll try to find the "Change location" button/link.
                    location_triggers = await page.get_by_role("button", name=re.compile(r"(\d+\s*km)|Location", re.IGNORECASE)).all()
                    
                    # If specific button not found, try a known selector strategy or text
                    if not location_triggers:
                        # Fallback: click the span that looks like a location/radius
                        await page.click("span:has-text(' km')", timeout=2000)
                    else:
                        # Pick the most likely one (usually in the sidebar filter area)
                        await location_triggers[0].click()
                    
                    await asyncio.sleep(1)
                    
                    # 2. Interact with Modal
                    # Input Location
                    input_loc = page.get_by_placeholder("Search by city", exact=False)
                    if await input_loc.count() > 0:
                        await input_loc.click()
                        await input_loc.fill(args.location)
                        await asyncio.sleep(1)
                        
                        # Select first suggestion
                        await page.keyboard.press("ArrowDown")
                        await page.keyboard.press("Enter")
                        await asyncio.sleep(1)
                    
                    # Set Radius
                    # Find the combobox/radius dropdown
                    radius_combo = page.get_by_role("combobox", name="Radius") # Specific selector based on logs
                    if await radius_combo.count() > 0:
                        await radius_combo.click()
                        # Select closest radius option? Or just type if allowed? 
                        # Usually it's a dropdown with specific values: 1, 2, 5, 10, 20, 40, 60, 80, 100...
                        # We'll try to match the text "X km" or "X miles"
                        
                        # Find option with exact radius
                        radius_option = page.get_by_role("option", name=re.compile(rf"^{args.radius}\s*k?m?", re.IGNORECASE))
                        if await radius_option.count() > 0:
                            await radius_option.first.click()
                        else:
                            print(f"Warning: Exact radius {args.radius}km not found in dropdown. Keeping default.")
                            # Close dropdown
                            await page.click("body", force=True) 

                    # Click Apply
                    apply_btn = page.get_by_role("button", name="Apply")
                    if await apply_btn.count() > 0:
                        await apply_btn.click()
                        print("Location settings applied.")
                        await asyncio.sleep(2) # Wait for reload
                    else:
                        print("Apply button not found, maybe location didn't change?")
                        
                except Exception as e:
                    print(f"Warning: Could not set location via UI ({e}). Continuing with default...")

            # --- SEARCH EXECUTION ---
            if args.query:
                print(f"Searching for: {args.query}...")
                try:
                    # Find Search Bar
                    await page.wait_for_timeout(2000) # Wait for UI to settle after location change
                    
                    # There might be multiple (top nav vs main content), so we take the first visible one or specific one
                    search_box = page.get_by_placeholder("Search Marketplace", exact=False).first
                    if await search_box.count() == 0:
                         search_box = page.get_by_role("textbox", name="Search Marketplace").first
                    
                    await search_box.click()
                    await search_box.fill(args.query)
                    await search_box.press("Enter")
                    
                    print("Search submitted. Waiting for results...")
                    # Facebook keeps network active, so networkidle is flaky.
                    # We wait for DOM loaded + a buffer, then proceed.
                    try:
                        await page.wait_for_load_state("domcontentloaded", timeout=10000)
                        await page.wait_for_timeout(3000) 
                    except:
                        print("Search page load wait timed out, continuing anyway...")

                except Exception as e:
                    print(f"Error interacting with search bar: {e}")
                    # Only fallback if we REALLY failed (e.g. didn't find search box)
                    # If it was just a timeout waiting for results, we have likely succeeded.
                    if "Timeout" not in str(e):
                         print("Falling back to URL navigation...")
                         from urllib.parse import quote
                         q = quote(args.query)
                         url = f"https://www.facebook.com/marketplace/search?query={q}"
                         await page.goto(url)

            print("Waiting for results to settle...")
            try:
                await page.wait_for_load_state("networkidle", timeout=5000)
            except: pass
                
            # Initial wait
            await asyncio.sleep(3)

            # Prepare screenshots directory
            timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            dir_name = f"screenshots_{timestamp_str}"
            if args.query:
                 # Sanitize query for folder name
                safe_query = "".join([c for c in args.query if c.isalpha() or c.isdigit() or c==' ']).strip().replace(' ', '_')
                dir_name = f"screenshots_{safe_query}_{timestamp_str}"
            
            save_dir = data_dir / dir_name
            save_dir.mkdir(parents=True, exist_ok=True)
            print(f"Saving screenshots to {save_dir}/")

            processed_urls = set()
            no_new_items_count = 0
            listings_data = [] # Store listing metadata
            
            print(f"Starting scroll to fetch at least {args.min_listings} listings...")
            
            while len(processed_urls) < args.min_listings:
                
                # 1. Identify current visible listings
                # Strategy: Look for links with /marketplace/item/
                current_listings = await page.get_by_role("link").all()
                valid_listings = []
                
                for link in current_listings:
                    href = await link.get_attribute("href")
                    if href and "/marketplace/item/" in href:
                        # Extract ID to avoid duplicates
                        # href usually looks like /marketplace/item/12345/?...
                        # We use the full href as key for simplicity, or strip parameters if needed
                        if href not in processed_urls:
                            valid_listings.append((link, href))
                
                if not valid_listings:
                    print("No new listings found in this view.")
                    no_new_items_count += 1
                    if no_new_items_count > 5:
                        print("No new items found after multiple scrolls. Stopping.")
                        break
                else:
                    no_new_items_count = 0
                    print(f"Found {len(valid_listings)} new listings on screen. Capturing...")
                    
                    for link_element, href in valid_listings:
                        if len(processed_urls) >= args.min_listings:
                            break
                            
                        try:
                            # Verify still in view and stable
                            if await link_element.is_visible():
                                # Metadata Extraction
                                try:
                                    text_content = await link_element.inner_text()
                                    aria_label = await link_element.get_attribute("aria-label") or ""
                                    
                                    # Basic heuristic for title/price (often: Price\nTitle\nLocation)
                                    lines = [l.strip() for l in text_content.split('\n') if l.strip()]
                                    price = lines[0] if len(lines) > 0 else "N/A"
                                    title = lines[1] if len(lines) > 1 else "N/A"
                                    location_guess = lines[2] if len(lines) > 2 else "N/A"

                                    item_id = href.split("item/")[1].split("/")[0]
                                    full_url = f"https://www.facebook.com{href}" if href.startswith("/") else href
                                    
                                    listing_obj = {
                                        "id": item_id,
                                        "url": full_url,
                                        "price": price,
                                        "title": title,
                                        "location": location_guess,
                                        "description_raw": text_content,
                                        "aria_label": aria_label,
                                        "screenshot": f"item_{item_id}.png"
                                    }
                                    
                                    listings_data.append(listing_obj)
                                    
                                    # Save JSON (overwrite file each time for safety)
                                    with open(f"{save_dir}/listings.json", "w", encoding="utf-8") as f:
                                        json.dump(listings_data, f, indent=2, ensure_ascii=False)
                                        
                                except Exception as e:
                                    print(f"Error extracting metadata: {e}")
                                    item_id = href.split("item/")[1].split("/")[0] if "item/" in href else "unknown"

                                # Create filename
                                filename = f"{save_dir}/item_{item_id}.png"
                                
                                await link_element.scroll_into_view_if_needed()
                                await link_element.screenshot(path=filename)
                                processed_urls.add(href)
                                print(f"Saved {filename} ({len(processed_urls)}/{args.min_listings})")
                        except Exception as e:
                            # Element might have detached
                            pass
                
                # 2. Scroll Logic ("Jiggle")
                print("Scrolling...")
                await page.keyboard.press("End")
                await asyncio.sleep(2)
                await page.evaluate("window.scrollBy(0, -500)")
                await asyncio.sleep(1)
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await asyncio.sleep(2)
                
            print(f"Successfully captured {len(processed_urls)} listings.")

        except Exception as e:
            print(f"An error occurred during execution: {e}")
        finally:
            print("Closing browser context...")
            await browser.close()
        
        if monitor:
             monitor.stop_step("scraper")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Facebook Marketplace Scraper")
    parser.add_argument("--user-data-dir", help="Path to your Chrome user data directory (e.g., C:\\Users\\Name\\AppData\\Local\\Google\\Chrome\\User Data)")
    parser.add_argument("--cdp-port", type=int, help="Port to connect to an existing Chrome instance (e.g., 9222)")
    parser.add_argument("--headless", action="store_true", help="Run in headless mode (default is visible)")
    parser.add_argument("--query", help="Search query (e.g., 'office chair')")
    parser.add_argument("--location", default="erskineville", help="Location slug (e.g., 'erskineville' or 'sydney'). Default: 'erskineville'")
    parser.add_argument("--radius", type=int, default=10, help="Search radius in KM (default: 10)")
    parser.add_argument("--min-listings", type=int, default=30, help="Minimum number of listings to scrape (default: 30)")
    parser.add_argument("--auth-file", help="Path to auth.json file for session storage (alternative to user-data-dir)")
    parser.add_argument("--data-dir", default="data", help="Directory to save data (default: data/)")
    parser.add_argument("--scan-id", help="Scan ID for audit logging")
    parser.add_argument("--source", default="manual", help="Source of the scan (manual, scheduled)")
    
    args = parser.parse_args()
    
    # Check for at least one way to run
    if not args.user_data_dir and not args.cdp_port and not args.auth_file:
        parser.print_help()
        print("\nError: You must provide either --user-data-dir, --cdp-port, or --auth-file")
        sys.exit(1)
        
    # Ensure relative paths for Data Dir if needed
    # (args.data_dir is usually relative to working dir)
        
    # Run the async main loop
    asyncio.run(run(args))
