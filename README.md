# Marketplace Hunter v2.0 🎯

**An autonomous AI agent that scours Facebook Marketplace for underpriced deals.**

![Status](https://img.shields.io/badge/Status-Active-success)
![Version](https://img.shields.io/badge/Version-2.0-blue)
![Stack](https://img.shields.io/badge/Stack-Python%20%7C%20FastAPI%20%7C%20React%20%7C%20Docker-orange)

## 🚀 Overview

Marketplace Hunter is a "set and forget" tool designed for resellers and bargain hunters. It automates the entire process of finding profitable items:

1.  **Scrapes** Facebook Marketplace for your query (e.g., "Herman Miller Chair").
2.  **Analyzes** images using Vision AI (Gemini Flash 2.0) to assess condition and authenticity.
3.  **Ranks** deals based on potential profit margin (using a "Ruthless Reseller" persona).
4.  **Deep Dives** into promising listings to verify details and detect scams.
5.  **Alerts** you to "Verified Steals" via a live dashboard.

## 🎥 See it in Action

### 1. Autonomous Hunting & AI Valuation
Watch the agent process a manual search, scrape listings, analyze images using Gemini, and populate the live dashboard with ranked recommendations:

<video src="https://github.com/user-attachments/assets/993dfd6a-78ea-46e0-8ca5-1f56d1976dd5" width="100%" controls></video>


### 2. Scheduled Scans & Smart Alerts
See how to configure persistent background schedules and view the rich HTML email alerts generated when a "Verified Steal" is found:

<video src="https://github.com/user-attachments/assets/950e9c0c-e401-4e74-9abe-8528914ee591" width="100%" controls></video>

## ✨ Features

-   **Autonomous Pipeline**: Scraper -> Visual Analysis -> Deal Ranking -> Deep Dive Verification.
-   **AI-Powered Valuation**: Uses LLMs to estimate fair market value and resell potential.
-   **Live Mission Control**: React-based dashboard with real-time logs, cost tracking, and deal feeds.
-   **Automated Scheduling**: Set up daily or weekly scans for specific items and locations.
-   **Smart Alerts**: Receive rich HTML email reports with images, AI analysis, and verification scores.
-   **Fraud Detection**: "Deep Dive" mode browses listings like a human to catch description inconsistencies.
-   **Dockerized**: Run the entire stack with a single command.

## 🛠️ Architecture

### Backend (Python/FastAPI)
-   `scraper.py`: Headless browser automation (Playwright) to gather listings.
-   `analyze_images.py`: Google Gemini 1.5 Flash integration for visual inspection.
-   `rank_deals.py`: Logic engine to prioritize high-margin items.
-   `deep_dive.py`: Secondary verification step for top-ranked items.
-   `scheduler.py`: Background job manager (APScheduler) for persistent cron-like tasks.
-   `email_service.py`: Rich HTML email generator for deal reports.
-   `main.py`: FastAPI orchestrator and API endpoints.

### Frontend (React/Vite)
-   **Mission Control**: Real-time status, token usage, and cost monitoring.
-   **Schedules & Alerts**: Manage automated searches and email notifications.
-   **Market Analysis**: Horizontal carousel of all scanned items with AI commentary.
-   **Verified Top Picks**: Dedicated section for high-confidence "Steals".
-   **System Logs**: Live terminal feed of the backend process.

## 🚀 Getting Started

### Prerequisites
-   [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Recommended)
-   Google Gemini API Key (for AI analysis)

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/alexanderbunyan/marketplace-hunter.git](https://github.com/alexanderbunyan/marketplace-hunter.git)
    cd marketplace-hunter
    ```

2.  **Configure Environment**
    Create a `.env` file in the root directory:
    ```env
    # Google Gemini API Key
    GOOGLE_API_KEY=your_api_key_here
    
    # Optional: Email Alerts
    SMTP_SERVER=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=your_email@gmail.com
    SMTP_PASSWORD=your_app_password
    ```

3.  **Launch (Docker)**
    Double-click `StartHunter.bat` (Windows) or run:
    ```bash
    docker-compose up --build
    ```
    
    *The frontend will launch automatically at `http://localhost:3000`.*

### Local Development (No Docker)
If you prefer running locally:
1.  **Backend**: `cd backend && pip install -r requirements.txt && python main.py`
2.  **Frontend**: `cd frontend_v2 && npm install && npm run dev`

## 🖥️ Usage

1.  **Select a Mission**: Enter a search query (e.g., "Gaming Laptop"), location, and radius.
2.  **Set Intent**: Optional. Tell the AI what you're looking for (e.g., "Only interested in RTX 3080 or better").
3.  **Launch Scan**: Sit back and watch the logs.
    -   **Phase 1**: The scraper gathers raw listings.
    -   **Phase 2**: AI analyzes images for damage/models.
    -   **Phase 3**: Deals are ranked by ROI.
    -   **Phase 4**: Top picks are verified.
4.  **Review Deals**: Check the "Verified Top Picks" carousel for the best opportunities.

## ⚠️ Disclaimer

This tool is for educational purposes only. Automated scraping may violate Facebook's Terms of Service. Use responsibly and at your own risk.

## 📄 License

MIT License. See `LICENSE` for details.
