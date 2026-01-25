# 🎯 WEATHER WARS v3 — IMPLEMENTATION PLAN
> **"The Truth vs. The World"**
> 
> **Created:** 2026-01-25 | **Author:** Pip (Field Commander)
> **Purpose:** Gap analysis + detailed task list for AG/Gemini execution

---

## 📋 EXECUTIVE SUMMARY

**Current State:** ~60% implemented. Core architecture exists, but the full pipeline (Scrape → Score → Display) is not connected end-to-end.

**Goal:** Get the system fully functional with real data flowing through, then polish.

**Priority Order:**
1. Fix dependencies & infrastructure
2. Complete the data pipeline (Loki → DB → Scores → Leaderboard)
3. Connect frontend to live backend
4. Polish & add features

---

## 🔍 GAP ANALYSIS: BIBLE vs REALITY

### ✅ COMPLETE (No Action Needed)

| Feature | Bible Section | Implementation |
|---------|---------------|----------------|
| Dashboard Layout | §2 Desktop No-Scroll | `DashboardLayout.tsx` with 100vh CSS Grid |
| Hero Panel | §4.A | `HeroPanel.tsx` - Live NWS, golden hour, yesterday verdict |
| Blue Ticker | §4.C | `BlueTicker.tsx` - Shuffle bag, 3-3-3-1 mix |
| Theme Engine | §4.B | `ThemeContext.tsx` - 5 themes, localStorage |
| EWS Banner | §4.D | `EWSBanner.tsx` - "Don't Push" simulation |
| Garden Ledger | §5 | `GardenLedger.tsx` - Region switching, crop tips |
| Leaderboard UI | §4.A | `Leaderboard.tsx` - Sniper/Oracle toggle |
| NWS Truth Fetcher | §3 Truth Layer | `nws_truth.py` - 5-min polling |
| Loki Extractor | §3 Ingestion | `loki_v1.py` - RARV pipeline, circuit breaker |
| Loki Targets | §3 Ingestion | `loki_targets.json` - OKC, Tulsa, Atlanta |
| Database Schema | §3 Architecture | `schema.sql` - 4 tables defined |
| Bacon v1 Scoring | §4.E | `bacon_v1.py` - 70/30 temp/precip formula |
| API Structure | §3 | FastAPI with routers |
| Snark Database | §4.C, §10 | `snark_database.json` exists |
| Garden Logic | §5 | `garden_logic.json` exists |

### ⚠️ PARTIAL (Needs Completion)

| Feature | Bible Section | Current State | Gap |
|---------|---------------|---------------|-----|
| Loki Scheduling | §3 Morning Window | Not scheduled | Needs 4-6 AM CST cron trigger |
| Daily Aggregation | §4.E Scoring | Hourly data only | Need daily high/low rollup |
| Scoring Cron | §4.E | Module exists, no trigger | Need daily scoring job |
| Frontend↔Backend | §3 | localhost:8001 hardcoded | Need env config |
| Weather Map | §4.A Map Module | Component exists | Verify Windy.com integration |
| Crappie Card | §6 | Component exists | Verify lake data & geofence |
| Yesterday Verdict | §11.C | Hardcoded mock | Need real DB query |
| Golden Hour | §11.A | Hour-based mock | Need proper astral calc |

### ❌ MISSING (Needs Implementation)

| Feature | Bible Section | Priority | Notes |
|---------|---------------|----------|-------|
| LLM Layer Check | §3 Loki | P0 | Verify Toolbox.llm_layer exists |
| Forecast Date Logic | §3 Scoring | P0 | db_manager TODO for date offsets |
| Scores API Real Data | §4.E | P0 | Leaderboard currently empty |
| Daily Observation Rollup | §3 Truth | P1 | Aggregate hourly → daily high/low |
| Audit Page | §3 Transparency | P2 | `/audit` route exists but needs content |
| Footer | §7 Doodads | P2 | "Fuel the War" button, attribution |
| Astronomy-Aware Icons | §4.A Hero | P3 | Day/night icon variants |
| Interactive Learning Cards | §5 Garden | P3 | Flip card popovers (beyond current accordion) |
| Mobile Layout QA | §2 Mobile | P3 | Verify stack order, ticker position |

### 📦 PARKED (Preserve for Later)

| Feature | Bible Section | Notes |
|---------|---------------|-------|
| Earthquake Tools | §4.A | Future sprint - USGS API for CA |
| Fishing "Best Hour" | §11.D | Minute-level crappie optimization |
| Community Vote Scoring | §4.E Future | Let users weight metrics |
| bacon_v2 | §4.E Future | Add wind speed, storm timing |

---

## 🛠️ IMPLEMENTATION PHASES

### PHASE 0: Infrastructure & Dependencies (P0)
*Unblock everything else*

#### Task 0.1: Verify LLM Layer
**File:** `C:\Users\nug\PiPos\Toolbox\llm_layer.py`
**Action:** Check if this file exists and has `analyze_image()` function.
- If EXISTS: Document the interface
- If MISSING: Create stub or integrate Gemini Vision directly

```python
# Expected interface (verify or implement):
def analyze_image(image_b64: str, prompt: str, max_tokens: int = 2000) -> str:
    """Send base64 image to Gemini Vision, return text response."""
    pass
```

#### Task 0.2: Create PiPos_Vault Directory
**Path:** `C:\Users\nug\PiPos\PiPos_Vault\Apps\WeatherWars_v3\data\`
**Action:** Ensure directory exists for DB and screenshots.

```powershell
New-Item -ItemType Directory -Force -Path "C:\Users\nug\PiPos\PiPos_Vault\Apps\WeatherWars_v3\data\screenshots"
```

#### Task 0.3: Initialize Database
**File:** `weather_wars_v3/backend/database/db_manager.py`
**Action:** Run once to create tables.

```powershell
cd C:\Users\nug\PiPos\weather_wars_v3\backend
python -c "from database.db_manager import DBManager; DBManager()"
```

---

### PHASE 1: Complete Data Pipeline (P0-P1)
*Scrape → Store → Score → Display*

#### Task 1.1: Fix Forecast Date Offset Logic
**File:** `weather_wars_v3/backend/database/db_manager.py`
**Function:** `save_loki_forecast()`

**Current (broken):**
```python
base_date = datetime.now().date()
# ...
target_date = base_date  # TODO: Add offset logic
```

**Fix:**
```python
from datetime import timedelta

base_date = datetime.now().date()
for i, day in enumerate(forecast_days):
    target_date = base_date + timedelta(days=i)
    # ... rest of insert
```

#### Task 1.2: Add Daily Observation Rollup
**File:** `weather_wars_v3/backend/database/db_manager.py`
**New Function:** `rollup_daily_observations()`

```python
def rollup_daily_observations(self, station_id: str, date: str):
    """
    Aggregate hourly NWS observations into daily high/low.
    Called by scoring engine before calculating scores.
    """
    conn = self._get_conn()
    cursor = conn.cursor()
    
    # Get all hourly temps for the day
    cursor.execute("""
        SELECT temp_f, precip_in FROM nws_hourly
        WHERE station_id = ? 
        AND date(timestamp) = ?
    """, (station_id, date))
    
    rows = cursor.fetchall()
    if not rows:
        return None
    
    temps = [r[0] for r in rows if r[0] is not None]
    precips = [r[1] for r in rows if r[1] is not None]
    
    if not temps:
        return None
    
    daily = {
        "station_id": station_id,
        "observation_date": date,
        "observed_high": max(temps),
        "observed_low": min(temps),
        "observed_precip": sum(precips)
    }
    
    # Upsert into observations table
    cursor.execute("""
        INSERT OR REPLACE INTO observations
        (station_id, observation_date, observed_high, observed_low, observed_precip)
        VALUES (?, ?, ?, ?, ?)
    """, (daily["station_id"], daily["observation_date"], 
          daily["observed_high"], daily["observed_low"], daily["observed_precip"]))
    
    conn.commit()
    conn.close()
    return daily
```

#### Task 1.3: Create Scoring Orchestrator
**File:** `weather_wars_v3/backend/scoring/daily_scoring.py` (NEW)

```python
"""
daily_scoring.py
Runs daily to calculate accuracy scores for yesterday's forecasts.
Triggered by scheduler after morning Loki scrape completes.
"""
from datetime import datetime, timedelta
from backend.database.db_manager import DBManager
from backend.scoring.bacon_v1 import BaconV1
from backend.scoring.schemas import Forecast, Truth

# Station mapping: Loki station_id -> NWS station_id
STATION_MAP = {
    "oklahoma_city_KFOR": "KOKC",
    "oklahoma_city_KWTV": "KOKC",
    "oklahoma_city_KOCO": "KOKC",
    "oklahoma_city_KOKH": "KOKC",
    "tulsa_KJRH": "KTUL",
    "tulsa_KOTV": "KTUL",
    "tulsa_KTUL": "KTUL",
    "tulsa_KOKI": "KTUL",
    "atlanta_WSB-TV": "KATL",
    "atlanta_WXIA-TV": "KATL",
    "atlanta_WGCL-TV": "KATL",
    "atlanta_WAGA-TV": "KATL",
}

def run_daily_scoring():
    """
    Score yesterday's forecasts against observed truth.
    """
    db = DBManager()
    scorer = BaconV1()
    
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    print(f"[SCORING] Running daily scoring for {yesterday}...")
    
    # 1. Rollup NWS observations for each truth station
    truth_stations = set(STATION_MAP.values())
    for nws_station in truth_stations:
        daily = db.rollup_daily_observations(nws_station, yesterday)
        if daily:
            print(f"  [TRUTH] {nws_station}: High={daily['observed_high']}°F, Low={daily['observed_low']}°F")
        else:
            print(f"  [TRUTH] {nws_station}: No data for {yesterday}")
    
    # 2. Get all forecasts that predicted yesterday
    conn = db._get_conn()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM forecasts 
        WHERE forecast_date = ? AND day_offset = 1
    """, (yesterday,))
    # day_offset=1 means "tomorrow" forecast made the day before
    
    forecasts = cursor.fetchall()
    print(f"  [FORECASTS] Found {len(forecasts)} forecasts to score")
    
    # 3. Score each forecast
    for f in forecasts:
        loki_station = f["station_id"]
        nws_station = STATION_MAP.get(loki_station)
        
        if not nws_station:
            print(f"  [SKIP] Unknown station mapping: {loki_station}")
            continue
        
        # Get truth
        cursor.execute("""
            SELECT * FROM observations 
            WHERE station_id = ? AND observation_date = ?
        """, (nws_station, yesterday))
        obs = cursor.fetchone()
        
        if not obs:
            print(f"  [SKIP] No truth data for {nws_station} on {yesterday}")
            continue
        
        # Build schema objects
        forecast_obj = Forecast(
            source_id=loki_station,
            target_date=yesterday,
            high_temp=f["high_temp"] or 0,
            precip_prob=f["precip_chance"] or 50  # Default 50% if missing
        )
        
        truth_obj = Truth(
            observation_date=yesterday,
            high_temp=obs["observed_high"],
            did_rain=(obs["observed_precip"] or 0) > 0.01
        )
        
        # Calculate score
        result = scorer.calculate_score(forecast_obj, truth_obj)
        
        # Save to scores table
        cursor.execute("""
            INSERT INTO scores 
            (forecast_id, observation_id, total_score, temp_score, precip_score, is_bust, scoring_version)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            f["id"], obs["id"], 
            result.total_score, result.temp_score, result.precip_score,
            1 if result.temp_score == 0 else 0,
            result.scoring_version
        ))
        
        print(f"  [SCORED] {loki_station}: {result.total_score} pts")
    
    conn.commit()
    conn.close()
    print(f"[SCORING] Complete!")

if __name__ == "__main__":
    import sqlite3
    run_daily_scoring()
```

#### Task 1.4: Add Missing Schema Classes
**File:** `weather_wars_v3/backend/scoring/schemas.py`
**Action:** Verify these dataclasses exist:

```python
from dataclasses import dataclass

@dataclass
class Forecast:
    source_id: str
    target_date: str
    high_temp: int
    precip_prob: int  # 0-100

@dataclass  
class Truth:
    observation_date: str
    high_temp: int
    did_rain: bool

@dataclass
class ScoreResult:
    source_id: str
    target_date: str
    total_score: float
    temp_score: float
    precip_score: float
    scoring_version: str
    details: str = ""
```

#### Task 1.5: Wire Scores API to Real Data
**File:** `weather_wars_v3/backend/features/scores_api.py`

```python
from fastapi import APIRouter
from backend.database.db_manager import DBManager
from datetime import datetime, timedelta
import sqlite3

router = APIRouter(prefix="/scores", tags=["scores"])

db = DBManager()

@router.get("/leaderboard")
def get_leaderboard(league: str = "sniper", days: int = 7):
    """
    Get leaderboard for Sniper (1-day) or Oracle (5-day) league.
    """
    conn = db._get_conn()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Date range
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    # For Sniper: day_offset = 1 (next day forecasts)
    # For Oracle: day_offset IN (1,2,3,4,5)
    if league == "sniper":
        offset_filter = "AND f.day_offset = 1"
    else:
        offset_filter = "AND f.day_offset BETWEEN 1 AND 5"
    
    query = f"""
        SELECT 
            f.station_id as provider,
            AVG(s.total_score) as avg_score,
            COUNT(*) as battles,
            SUM(CASE WHEN s.is_bust = 1 THEN 1 ELSE 0 END) as busts
        FROM scores s
        JOIN forecasts f ON s.forecast_id = f.id
        WHERE f.forecast_date BETWEEN ? AND ?
        {offset_filter}
        GROUP BY f.station_id
        ORDER BY avg_score DESC
    """
    
    cursor.execute(query, (start_date, end_date))
    rows = cursor.fetchall()
    conn.close()
    
    # Format for frontend
    results = []
    for i, row in enumerate(rows):
        # Simplify station name for display
        provider = row["provider"].replace("oklahoma_city_", "").replace("tulsa_", "").replace("atlanta_", "")
        
        results.append({
            "rank": i + 1,
            "provider": provider,
            "score": round(row["avg_score"], 1),
            "trend": "flat",  # TODO: Calculate from previous period
            "status": "winner" if i == 0 else ("busted" if row["busts"] > row["battles"] / 2 else "neutral")
        })
    
    return results
```

#### Task 1.6: Add Loki to Scheduler (Morning Window)
**File:** `weather_wars_v3/backend/main.py`

**Add to imports:**
```python
from backend.scrapers.loki_v1 import LokiVisionExtractor
from backend.scoring.daily_scoring import run_daily_scoring
import asyncio
```

**Add jobs in lifespan:**
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Scheduler...")
    
    # NWS Truth: Every 5 minutes (current conditions)
    scheduler.add_job(fetch_nws_truth, 'interval', minutes=5, id='nws_poll')
    
    # Loki Scrape: Daily at 5:00 AM CST (forecast data)
    def run_loki_sync():
        extractor = LokiVisionExtractor()
        asyncio.run(extractor.run_extraction_cycle())
    
    scheduler.add_job(
        run_loki_sync, 
        'cron', 
        hour=5, 
        minute=0,
        timezone='America/Chicago',
        id='loki_morning'
    )
    
    # Daily Scoring: 6:00 AM CST (after Loki completes)
    scheduler.add_job(
        run_daily_scoring,
        'cron',
        hour=6,
        minute=0,
        timezone='America/Chicago',
        id='daily_scoring'
    )
    
    scheduler.start()
    yield
    scheduler.shutdown()
```

---

### PHASE 2: Frontend ↔ Backend Connection (P1)

#### Task 2.1: Environment Variable for API URL
**File:** `weather_wars_v3/frontend/.env.local` (create if missing)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**For production, set:**
```env
NEXT_PUBLIC_API_URL=https://api.phloid.com
```

#### Task 2.2: Fix API Port Mismatch
**Current:** Frontend expects `:8001`, backend runs on `:8000`
**File:** `weather_wars_v3/frontend/src/lib/api.ts`

```typescript
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
```

#### Task 2.3: Add CORS for Production
**File:** `weather_wars_v3/backend/main.py`

```python
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://phloid.com",
    "https://www.phloid.com",
]
```

---

### PHASE 3: Feature Completion (P2)

#### Task 3.1: Real Yesterday Verdict
**File:** `weather_wars_v3/backend/features/weather_api.py`

Replace hardcoded verdict with:
```python
def get_yesterday_verdict(station_id: str) -> dict:
    """Check if any forecast busted yesterday."""
    conn = db._get_conn()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    
    # Get average score for yesterday
    cursor.execute("""
        SELECT AVG(s.total_score) as avg, MIN(s.total_score) as worst
        FROM scores s
        JOIN forecasts f ON s.forecast_id = f.id
        WHERE f.forecast_date = ?
    """, (yesterday,))
    
    row = cursor.fetchone()
    conn.close()
    
    if not row or row["avg"] is None:
        return {"status": "No Data", "icon": "❓", "color": "text-text-secondary"}
    
    avg = row["avg"]
    if avg >= 80:
        return {"status": "Forecasts Nailed It", "icon": "✅", "color": "text-accent"}
    elif avg >= 60:
        return {"status": "Mostly Accurate", "icon": "👍", "color": "text-yellow-400"}
    else:
        return {"status": "Major Busts", "icon": "❌", "color": "text-red-400"}
```

#### Task 3.2: Proper Golden Hour Calculation
**File:** `weather_wars_v3/backend/features/weather_api.py`

```python
# Add to requirements.txt: astral

from astral import LocationInfo
from astral.sun import sun
from datetime import datetime
import pytz

def is_golden_hour(lat: float = 35.4676, lon: float = -97.5164) -> bool:
    """
    Check if current time is within golden hour.
    Default coords: Oklahoma City
    """
    city = LocationInfo("Oklahoma City", "USA", "America/Chicago", lat, lon)
    tz = pytz.timezone("America/Chicago")
    now = datetime.now(tz)
    
    s = sun(city.observer, date=now.date(), tzinfo=tz)
    
    # Golden hour: 1 hour after sunrise, 1 hour before sunset
    morning_start = s["sunrise"]
    morning_end = s["sunrise"] + timedelta(hours=1)
    evening_start = s["sunset"] - timedelta(hours=1)
    evening_end = s["sunset"]
    
    return (morning_start <= now <= morning_end) or (evening_start <= now <= evening_end)
```

#### Task 3.3: Audit Page Content
**File:** `weather_wars_v3/frontend/src/app/audit/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { fetchJson } from '@/lib/api';

export default function AuditPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchJson('/audit/recent?limit=50')
            .then(setLogs)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8 text-center">Loading audit trail...</div>;

    return (
        <div className="min-h-screen bg-bg-primary p-8">
            <h1 className="text-2xl font-display text-accent mb-4">Audit Ledger</h1>
            <p className="text-text-secondary mb-8">
                Raw forecast data for transparency. Every claim is logged.
            </p>
            
            <div className="space-y-4">
                {logs.map((log: any, i: number) => (
                    <div key={i} className="bg-bg-card p-4 rounded border border-white/10">
                        <div className="flex justify-between text-sm">
                            <span className="text-accent">{log.station_id}</span>
                            <span className="text-text-secondary">{log.capture_timestamp}</span>
                        </div>
                        <pre className="mt-2 text-xs text-text-secondary overflow-auto max-h-32">
                            {JSON.stringify(JSON.parse(log.raw_json || '{}'), null, 2)}
                        </pre>
                    </div>
                ))}
            </div>
        </div>
    );
}
```

#### Task 3.4: Footer Component
**File:** `weather_wars_v3/frontend/src/components/Footer.tsx`

```tsx
export default function Footer() {
    return (
        <footer className="w-full bg-bg-secondary border-t border-white/10 py-4 px-6 flex justify-between items-center text-xs font-mono text-text-secondary">
            <div>
                © 2026 phloid.com | Weather data: NWS, Open-Meteo
            </div>
            <div className="flex gap-4">
                <a href="/audit" className="hover:text-accent transition-colors">
                    Verify the Battle
                </a>
                <a 
                    href="https://ko-fi.com/phloid" 
                    target="_blank"
                    className="bg-accent text-bg-primary px-3 py-1 rounded hover:bg-accent/80 transition-colors"
                >
                    ☕ Fuel the War
                </a>
            </div>
        </footer>
    );
}
```

---

### PHASE 4: Polish & QA (P3)

#### Task 4.1: Mobile Layout Verification
- [ ] Verify ticker stays fixed at bottom on mobile
- [ ] Verify stack order: Hero → Leaderboard → Garden → Map → Footer
- [ ] Test touch targets (50px minimum for buttons)
- [ ] Test theme switching on mobile

#### Task 4.2: Map Module Verification
- [ ] Verify Windy.com embed loads
- [ ] Add "Big Exit" button (50px red X)
- [ ] Add Privacy Shield over Windy logo in fullscreen
- [ ] Test fullscreen behavior

#### Task 4.3: Astronomy-Aware Icons
- [ ] Create day/night icon variants
- [ ] Hook to sunrise/sunset data
- [ ] Implement icon switching based on time

#### Task 4.4: Interactive Learning Cards
- [ ] Upgrade GardenLedger accordion to flip card style
- [ ] Add "Why You Should Care" content
- [ ] Add "The Tip" actionable advice

---

## 📦 PARKED IDEAS (Preserved for Later)

These features are documented in the DESIGN_BIBLE but deferred:

| Feature | Bible Section | Reason for Deferral |
|---------|---------------|---------------------|
| Earthquake Tools | §4.A | Phase 2 - needs USGS API integration |
| Fishing "Best Hour" | §11.D | Minute-level optimization after core works |
| bacon_v2 Scoring | §4.E | After bacon_v1 proves out |
| Community Vote Scoring | §4.E | Needs user accounts |
| Regional Crop Swapping | §5 | garden_logic.json needs GA/NE/CA data |
| Snark Severity Escalation | §11.B | After EWS is battle-tested |

---

## 🚀 EXECUTION ORDER

```
PHASE 0 (Do First - Unblocks Everything)
├── Task 0.1: Verify LLM Layer
├── Task 0.2: Create Vault Directory  
└── Task 0.3: Initialize Database

PHASE 1 (Core Pipeline)
├── Task 1.1: Fix Forecast Date Offset
├── Task 1.2: Add Daily Observation Rollup
├── Task 1.3: Create Scoring Orchestrator
├── Task 1.4: Add Missing Schema Classes
├── Task 1.5: Wire Scores API to Real Data
└── Task 1.6: Add Loki to Scheduler

PHASE 2 (Connect Frontend)
├── Task 2.1: Environment Variable for API
├── Task 2.2: Fix API Port Mismatch
└── Task 2.3: Add CORS for Production

PHASE 3 (Feature Completion)
├── Task 3.1: Real Yesterday Verdict
├── Task 3.2: Proper Golden Hour Calc
├── Task 3.3: Audit Page Content
└── Task 3.4: Footer Component

PHASE 4 (Polish)
├── Task 4.1: Mobile Layout QA
├── Task 4.2: Map Module Verification
├── Task 4.3: Astronomy-Aware Icons
└── Task 4.4: Interactive Learning Cards
```

---

## 📝 NOTES FOR AG/GEMINI

1. **Always run from project root:** `C:\Users\nug\PiPos\weather_wars_v3`
2. **Backend venv:** Create if missing, install from `backend/requirements.txt`
3. **Frontend:** Run `npm install` in `frontend/` before starting
4. **Database:** SQLite file at `PiPos_Vault/Apps/WeatherWars_v3/data/weather_wars.db`
5. **Timezone:** All cron jobs use `America/Chicago` (CST)
6. **Testing:** After each phase, verify with:
   - Backend: `uvicorn backend.main:app --reload`
   - Frontend: `cd frontend && npm run dev`

---

*Plan Version: 1.0 | Created: 2026-01-25 | Pip Certified ⚡*
