# PROJECT: WEATHER WARS - Architecture & Strategy

## 1. Core Logic: The Judge vs. The Defendant

### The Judge (Source of Truth)
*   **Temps:** NWS/NOAA ASOS stations (Reference: NCEI HOMR).
*   **Snow:** NWS Local Storm Reports (LSR) - parsed text for human-verified totals.
*   **Hurricanes:** Graded on Peak Gusts/Rain (ASOS/CoCoRaHS), NOT Track.

### The Defendant (TV Stations)
*   **Method:** Manual or Local Automation.
*   **Storage:** Internal "Receipts" only. **NO PUBLIC DISPLAY** of screenshots.

### Scaling Strategy
*   **Actuals:** Synoptic Data (Free Tier).
*   **Forecasts:** Apple WeatherKit (Baseline).

## 2. Automation Strategy (Playwright)
*   **Goal:** Daily screenshots of TV sites for verification.
*   **Constraint:** Must run **LOCALLY** on User's Hardware (Residential IP).
*   **Action:** Discuss local-to-cloud pipeline before implementation.

## 3. Deployment
*   **Web App:** Next.js (Phloid.com).
*   **Status:** Fix "Empty Content" bug via SSR/SSG.
