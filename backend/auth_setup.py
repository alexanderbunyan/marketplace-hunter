from playwright.sync_api import sync_playwright

def run():
    print("Launching Chromium (Headful)...")
    with sync_playwright() as p:
        # Launch persistent context is often better for manual login, 
        # but standard context + storage_state save works too if we just want cookies/local storage.
        # User requested: "Launch the browser in Headful mode... Save to auth.json"
        
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        print("Navigating to Facebook...")
        try:
            page.goto("https://www.facebook.com")
        except Exception as e:
            print(f"Navigation error: {e}")
        
        print("\n" + "="*60)
        print("ACTION REQUIRED:")
        print("1. Please log in manually in the browser window.")
        print("2. Handle any 2FA prompts.")
        print("3. Navigate to Marketplace (https://www.facebook.com/marketplace) to ensure cookies are set.")
        print("="*60 + "\n")
        
        # Pause for user input
        input("Press Enter in this terminal when you are ready to save the session... ")
        
        print("Saving auth.json...")
        try:
            context.storage_state(path="auth.json")
            print("Session saved successfully to 'auth.json'.")
        except Exception as e:
            print(f"Error saving state: {e}")
        
        print("Closing browser...")
        browser.close()

if __name__ == "__main__":
    run()
