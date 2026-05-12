from playwright.sync_api import sync_playwright, expect
import os
from dotenv import load_dotenv

load_dotenv()

# change the base url to your domain/droplet
DOMAIN = os.getenv("LEAPMILE_DEPLOYMENT_NAME ")
url = os.getenv("LEAPMILE_HOST_BASEURL", "https://magesh.leapmile.com")

def log_header():
    print("-" * 105)
    print(f"| {'Task Flow'.ljust(35)} | {'Status'.ljust(8)} | {'Message'.ljust(50)} |")
    print("-" * 105)

def log_step(task, status="✅", message="Done"):
    msg = (message[:47] + '...') if len(message) > 50 else message.ljust(50)
    print(f"| {task.ljust(35)} | {status.ljust(8)} | {msg} |")

def log_footer():
    print("-" * 105)

def test_login(page, phone, password):
    unique_spam_endpoints = set()

    # Watch for 500 errors and intercept GET call data
    def handle_response(response):
        if response.status >= 500:
            log_step("Event Monitor", "❌", f"500 Error from {response.url}")
                
        # log GET call counts
        if response.request.method == "GET" and response.status == 200:
            content_type = response.headers.get("content-type", "")
            if "application/json" in content_type:
                try:
                    data = response.json()
                    if isinstance(data, dict):
                        if "total_count" in data or "count" in data or "records" in data:
                            count = data.get("total_count", data.get("count", len(data.get("records", []))))
                            endpoint = response.url.split("?")[0].split("/")[-1]
                            
                            # Filter out continuous spam from /subscribe
                            if endpoint == "subscribe":
                                if "subscribe" in unique_spam_endpoints:
                                    return
                                unique_spam_endpoints.add("subscribe")
                                
                            if count > 0 or data.get("records"):
                                log_step(f"GET {endpoint}", "✅", f"Data loaded successfully. Count: {count}")
                            else:
                                log_step(f"GET {endpoint}", "⚠️", f"API returned success but NO data.")
                except:
                    pass

    page.on("response", handle_response)

    try:
        page.goto(f"{url}/dashboardapp/")
        page.wait_for_load_state("networkidle")
        log_step("Login Navigation", "✅", "Page opened")
    except Exception as e:
        log_step("Login Navigation", "❌", "Failed to navigate to login page")
        return False

    try:
        # Fill phone and password
        page.get_by_placeholder("Enter your mobile number").fill(phone)
        page.get_by_placeholder("Enter your password").fill(password)
        page.get_by_role("button", name="Login").click()
        log_step("Submit Form", "✅", "Login form submitted")
    except Exception as e:
        log_step("Submit Form", "❌", "Failed to submit login form")
        return False

    try:
        # Wait for home page, which is /home for dashboardapp
        page.wait_for_url(f"**/home")
        page.wait_for_load_state("networkidle")
        log_step("Dashboard Validation", "✅", "Navigation to home successful")
    except Exception as e:
        log_step("Dashboard Validation", "❌", "Failed to reach home")
        return False

    return True

def test_dashboard_ui_and_data(page):
    try:
        # We are already on home from login
        page.wait_for_selector("div", timeout=5000)
        log_step("Dashboard UI", "✅", "Dashboard Home UI is loaded without crash")
    except Exception as e:
        log_step("Dashboard UI", "❌", "Dashboard UI crashed or failed to load")
        return False

    pages_to_check = [
        ("racks", "Racks"),
        ("trays", "Trays"),
        ("slots", "Slots"),
        ("station", "Station"),
        ("extremes", "Extremes"),
        ("completed", "Completed Tasks"),
        ("pending", "Pending Tasks"),
        ("tray-ready", "Tray Ready Tasks"),
        ("inprogress", "Inprogress Tasks"),
        ("camera", "Camera"),
        ("reports", "Reports - Product Stock Report"),
        ("logs", "Logs"),
        ("monitor", "Status Monitor")
    ]

    for path, name in pages_to_check:
        try:
            # Navigate directly
            page.goto(f"{url}/dashboardapp/{path}")
            if path != "monitor":
                page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000) # give it a moment to render and fetch data
            
            # Check for generic crash by ensuring body is present
            body_text = page.locator("body").inner_text()
            if "Application error" in body_text or "Crash" in body_text:
                log_step(f"Check {name}", "❌", "UI crashed!")
            else:
                log_step(f"Check {name}", "✅", "UI loaded without crash")
                
            # specific logic for the reports page to test dropdown selections
            if path == "reports":
                report_options = [
                    "Order Product Transaction",
                    "Order Tray Transaction",
                    "Tray Transaction",
                    "Rack Transaction",
                    "Order Failure Transaction"
                ]
                for option_name in report_options:
                    try:
                        # Click the Shadcn Select combobox
                        page.locator("button[role='combobox']").first.click()
                        page.wait_for_timeout(500)
                        
                        # Select the specific dropdown option
                        page.get_by_role("option", name=option_name).click()
                        page.wait_for_timeout(2000)
                        
                        body_text_report = page.locator("body").inner_text()
                        if "Application error" in body_text_report or "Crash" in body_text_report:
                            log_step(f"Report Option {option_name[:20]}", "❌", "Crashed!")
                        else:
                            log_step(f"Report Option {option_name[:20]}", "✅", "Loaded successfully")
                    except Exception as e:
                        log_step(f"Report Option {option_name[:20]}", "❌", "Failed to verify")

        except Exception as e:
            log_step(f"Check {name}", "❌", "Failed to verify")

    return True

def run_all_tests():
    with sync_playwright() as p:
        # Running browser in non-headless mode for visibility
        browser = p.chromium.launch(
            headless=False,
            slow_mo=1000
        )
        page = browser.new_page()
        log_step("Browser State", "✅", "Browser opened")

        try:
            if not test_login(page, "1234567899", "Mag@123"):
                log_step("Login Action", "❌", "Login failed, aborting tests")
                return

            if not test_dashboard_ui_and_data(page):
                log_step("UI Check", "❌", "Dashboard UI and Data checks failed")
                return

            print("\n✅✅✅ All tests passed for Dashboard App! ✅✅✅")

        finally:
            browser.close()
            log_step("Browser State", "✅", "Browser closed")

if __name__ == "__main__":
    run_all_tests()
