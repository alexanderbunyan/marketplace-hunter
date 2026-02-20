import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import json
import os
from pathlib import Path
from dotenv import load_dotenv

# Load env vars from project root .env
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Paths
SETTINGS_FILE = Path(__file__).parent / "data" / "settings.json"

def load_settings():
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r") as f:
                return json.load(f)
        except:
            return {}
    return {}

def send_email(to_email: str, subject: str, html_content: str, attachments: list = None):
    settings = load_settings()
    
    # Priority: Env Vars > Settings.json
    smtp_server = os.getenv("SMTP_SERVER") or settings.get("smtp_server")
    smtp_port = os.getenv("SMTP_PORT") or settings.get("smtp_port")
    smtp_user = os.getenv("SMTP_USER") or settings.get("smtp_user")
    smtp_password = os.getenv("SMTP_PASSWORD") or settings.get("smtp_password")
    
    if not all([smtp_server, smtp_port, smtp_user, smtp_password]):
        print("ERROR: Missing SMTP settings. Cannot send email.")
        return False

    try:
        msg = MIMEMultipart('related') # 'related' is important for inline images
        msg['From'] = smtp_user
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg_alternative = MIMEMultipart('alternative')
        msg.attach(msg_alternative)
        
        msg_alternative.attach(MIMEText(html_content, 'html'))
        
        if attachments:
            from email.mime.image import MIMEImage
            for file_path in attachments:
                try:
                    fp = Path(file_path)
                    if fp.exists():
                        with open(fp, 'rb') as f:
                            img_data = f.read()
                        image = MIMEImage(img_data)
                        # Define the image ID as the filename
                        image.add_header('Content-ID', f"<{fp.name}>")
                        image.add_header('Content-Disposition', 'inline', filename=fp.name)
                        msg.attach(image)
                except Exception as e:
                    print(f"Failed to attach image {file_path}: {e}")

        server = smtplib.SMTP(smtp_server, int(smtp_port))
        server.starttls()
        server.login(smtp_user, smtp_password)
        text = msg.as_string()
        server.sendmail(smtp_user, to_email, text)
        server.quit()
        print(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def format_deal_email(scan_results, query, image_base_path=None):
    """
    Formats a list of deals into an HTML email body with rich details.
    Returns (html_content, list_of_attachments)
    """
    attachments = []
    
    html = f"""
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f9; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }}
            .header {{ padding-bottom: 20px; border-bottom: 2px solid #eee; margin-bottom: 20px; }}
            .header h2 {{ margin: 0; color: #2c3e50; }}
            .deal-card {{ display: flex; gap: 15px; border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }}
            .deal-img {{ width: 150px; height: 150px; object-fit: cover; border-radius: 6px; background-color: #eee; flex-shrink: 0; }}
            .deal-content {{ flex: 1; min-width: 0; }}
            .deal-title {{ font-size: 16px; font-weight: bold; color: #2c3e50; margin-bottom: 5px; }}
            .deal-price {{ color: #27ae60; font-weight: bold; font-size: 15px; margin-bottom: 8px; }}
            .deal-price small {{ color: #7f8c8d; font-weight: normal; font-size: 12px; }}
            .badges {{ display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; font-size: 11px; }}
            .badge {{ padding: 2px 6px; border-radius: 4px; background: #eee; color: #555; text-transform: uppercase; font-weight: bold; }}
            .badge.score {{ background: #e8f5e9; color: #27ae60; border: 1px solid #a5d6a7; }}
            .ai-insight {{ background: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 12px; color: #555; border-left: 3px solid #3498db; margin-bottom: 10px; }}
            .verification {{ background: #e8f5e9; padding: 10px; border-radius: 4px; font-size: 12px; color: #2e7d32; border-left: 3px solid #2e7d32; margin-bottom: 10px; }}
            .btn {{ display: inline-block; padding: 8px 16px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: bold; }}
            .footer {{ text-align: center; color: #999; font-size: 11px; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>🎯 Mission Report: {query}</h2>
                <p>Top deals found in your latest scan.</p>
            </div>
    """
    
    if not scan_results or len(scan_results) == 0:
        html += "<p style='text-align: center; color: #7f8c8d;'>No significant deals found this time.</p>"
    else:
        for deal in scan_results[:10]: # Top 10
            # Data Extraction
            title = deal.get('title', 'Unknown Item')
            price = deal.get('price', 'N/A')
            url = deal.get('url', '#')
            
            # Image Logic
            image_src = "https://placehold.co/150x150?text=No+Image"
            screenshot = deal.get('screenshot')
            
            # If we have a local screenshot and a base path
            if screenshot and image_base_path:
                local_path = Path(image_base_path) / screenshot
                if local_path.exists():
                    image_src = f"cid:{screenshot}"
                    attachments.append(local_path)
            # Fallback to remote URL if no local screenshot but we have a URL (unlikely given current scraper)
            elif deal.get('image_url') and deal.get('image_url').startswith('http'):
                 image_src = deal.get('image_url')

            brand = deal.get('visual_brand_model', 'Unknown')
            condition = deal.get('visual_condition', 'Unknown')
            score = deal.get('verification', {}).get('score', deal.get('deal_rating', 0))
            
            # AI Data
            ai_data = deal.get('ai_analysis', {})
            rrp = ai_data.get('resale_price_estimate', deal.get('estimated_new_price', 'N/A'))
            reason = deal.get('reason') or ai_data.get('reason') or deal.get('flipper_comment') or "No analysis."
            
            verified_notes = deal.get('verification', {}).get('notes')
            
            html += f"""
            <div class="deal-card">
                <img src="{image_src}" class="deal-img" alt="Item Image" onerror="this.src='https://placehold.co/150x150?text=Err';">
                <div class="deal-content">
                    <div class="deal-title"><a href="{url}" style="text-decoration: none; color: inherit;">{title}</a></div>
                    <div class="deal-price">{price} <small>(Est. New: {rrp})</small></div>
                    
                    <div class="badges">
                        <span class="badge">{brand}</span>
                        <span class="badge">{condition}</span>
                        <span class="badge score">Score: {score}/10</span>
                    </div>

                    <div class="ai-insight">
                        <strong>🤖 AI Analysis:</strong> {reason}
                    </div>
                    
                    {f'<div class="verification"><strong>✅ Verified:</strong> {verified_notes}</div>' if verified_notes else ''}
                    
                    <a href="{url}" class="btn">View on Facebook</a>
                </div>
            </div>
            """
            
    html += """
        <div class="footer">
            Generated by Marketplace Hunter AI • <a href="http://localhost:3000" style="color: #999;">Open Dashboard</a>
        </div>
        </div>
    </body>
    </html>
    """
    return html, attachments
