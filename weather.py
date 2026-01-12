import customtkinter as ctk
import requests
import sys
import threading
import argparse
import json
import os
from datetime import datetime, timedelta

# Force UTF-8 for Windows Consoles
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# --- CONFIGURATION (from config.json) ---
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.json")
with open(CONFIG_PATH, 'r') as f:
    CONFIG = json.load(f)

LAT = CONFIG['location']['lat']
LON = CONFIG['location']['lon']
LOCATION_NAME = CONFIG['location']['name']
REFRESH_RATE_MS = CONFIG['settings']['weather_refresh_ms']

# --- COLORS & STYLE ---
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("dark-blue")

# Obsidian/ProArt Palette
C_BG = "#1e1e1e"        # Main Background
C_CARD = "#2b2b2b"      # Card Background
C_ACCENT = "#3a3d41"    # Lighter Accent
C_TEXT_MAIN = "#ffffff"
C_TEXT_DIM = "#a0a0a0"
C_GOLD = "#FFD700"
C_ALERT = "#ffebee"     # Pastel Red Text
C_ALERT_BG = "#b71c1c"  # Deep Red Background

def fetch_weather_data():
    """Fetching logic extracted for CLI/GUI shared use."""
    weather_data = None
    alerts_data = {}

    # 1. Fetch Weather (Priority)
    try:
        om_url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": LAT,
            "longitude": LON,
            "current": ["temperature_2m", "weather_code", "wind_speed_10m", "apparent_temperature"],
            "hourly": ["temperature_2m", "weather_code", "precipitation_probability"],
            "daily": ["weather_code", "temperature_2m_max", "temperature_2m_min", "sunrise", "sunset", "precipitation_probability_max"],
            "temperature_unit": "fahrenheit",
            "wind_speed_unit": "mph",
            "precipitation_unit": "inch",
            "timezone": "auto",
            "forecast_days": 10
        }
        res = requests.get(om_url, params=params, timeout=10)
        res.raise_for_status()
        weather_data = res.json()
    except Exception as e:
        print(f"OM Error: {e}")
        return None, None

    # 2. Fetch Alerts (Optional - Don't break if fails)
    try:
        nws_url = f"https://api.weather.gov/alerts/active?point={LAT},{LON}"
        nws_res = requests.get(nws_url, headers={"User-Agent": "PipOS-Weather/2.0"}, timeout=5)
        if nws_res.status_code == 200:
            alerts_data = nws_res.json()
    except Exception as e:
        print(f"NWS Error: {e}") 
        # Continue without alerts

    return weather_data, alerts_data

def get_wmo_desc_static(code):
    """Static helper for description."""
    codes = {0:"Clear Sky", 1:"Mainly Clear", 2:"Partly Cloudy", 3:"Overcast", 45:"Fog", 51:"Drizzle", 61:"Rain", 63:"Heavy Rain", 71:"Snow", 95:"Thunderstorm", 80:"Rain Showers"}
    return codes.get(code, "Unknown")

def print_weather_report(weather, alerts):
    """Prints a text summary for the CLI."""
    if not weather:
        print("[ERROR] Could not fetch weather data.")
        return

    current = weather['current']
    daily = weather['daily']
    
    temp = current['temperature_2m']
    feels = current['apparent_temperature']
    code = current['weather_code']
    desc = get_wmo_desc_static(code)
    
    # Header
    print(f"\n🌍 WEATHER REPORT: {LOCATION_NAME}")
    print(f"----------------------------------------")
    print(f"🌡️  Current:   {temp:.0f}°F ({desc})")
    print(f"🤔 Feels Like: {feels:.0f}°F")
    
    # Alerts
    if alerts and alerts.get('features'):
        print(f"\n⚠️  ACTIVE ALERTS:")
        for f in alerts['features']:
            print(f"    - {f['properties']['headline']}")
    else:
        print(f"\n✅ No Active Alerts")

    # Forecast
    print(f"\n📅 3-DAY OUTLOOK:")
    for i in range(3):
        dt = datetime.strptime(daily['time'][i], "%Y-%m-%d")
        day_name = dt.strftime("%a %d")
        hi = daily['temperature_2m_max'][i]
        lo = daily['temperature_2m_min'][i]
        d_code = daily['weather_code'][i]
        d_desc = get_wmo_desc_static(d_code)
        print(f"   {day_name}: {hi:.0f}° / {lo:.0f}° | {d_desc}")
    print("")

class WeatherApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        # Window Setup
        self.title("Pip OS: Weather Command")
        self.geometry("1100x800") # Larger for 10-Day
        self.configure(fg_color=C_BG)
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(3, weight=1) 

        # 1. HEADER (Simple & Clean)
        self.header_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.header_frame.grid(row=0, column=0, sticky="ew", padx=30, pady=(30, 10))
        
        self.loc_label = ctk.CTkLabel(self.header_frame, text=LOCATION_NAME, font=("Roboto Medium", 40), text_color=C_TEXT_MAIN)
        self.loc_label.pack(side="left")

        self.moon_label = ctk.CTkLabel(self.header_frame, text="🌑 Calculating...", font=("Roboto", 18), text_color=C_TEXT_DIM)
        self.moon_label.pack(side="right", padx=10)

        # 2. ALERTS BANNER (Floating Card)
        self.alert_frame = ctk.CTkFrame(self, fg_color=C_ALERT_BG, corner_radius=10)
        self.alert_label = ctk.CTkLabel(self.alert_frame, text="NO ACTIVE ALERTS", text_color="white", font=("Roboto Bold", 16))
        self.alert_label.pack(pady=10, padx=20)
        # Grid managed efficiently in update_logic

        # 3. MAIN DASHBOARD (Grid of Cards)
        self.dash_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.dash_frame.grid(row=2, column=0, sticky="nsew", padx=20, pady=10)
        self.dash_frame.grid_columnconfigure(0, weight=1)  # Left: Current
        self.dash_frame.grid_columnconfigure(1, weight=1)  # Right: 10-Day
        self.dash_frame.grid_rowconfigure(0, weight=1)

        # --- LEFT COLUMN: Current & Vibe & Hourly ---
        self.left_col = ctk.CTkFrame(self.dash_frame, fg_color="transparent")
        self.left_col.grid(row=0, column=0, sticky="nsew", padx=(0, 10))
        
        # Current Condition Card
        self.current_card = ctk.CTkFrame(self.left_col, fg_color=C_CARD, corner_radius=15)
        self.current_card.pack(fill="x", pady=(0, 15), ipady=10)
        
        self.temp_label = ctk.CTkLabel(self.current_card, text="--°", font=("Roboto Medium", 90), text_color="#E0E0E0")
        self.temp_label.pack(pady=(10, 0))
        self.desc_label = ctk.CTkLabel(self.current_card, text="Loading...", font=("Roboto Light", 24), text_color=C_TEXT_DIM)
        self.desc_label.pack(pady=(0, 10))
        
        # Stats Row (Wind / Rain) inside Current Card
        self.stats_frame = ctk.CTkFrame(self.current_card, fg_color="transparent")
        self.stats_frame.pack(pady=5)
        self.wind_label = ctk.CTkLabel(self.stats_frame, text="💨 -- mph", font=("Roboto", 16), text_color=C_TEXT_DIM)
        self.wind_label.pack(side="left", padx=20)
        self.feels_label = ctk.CTkLabel(self.stats_frame, text="🌡️ Feels --°", font=("Roboto", 16), text_color=C_TEXT_DIM)
        self.feels_label.pack(side="left", padx=20)

        # Vibe & Golden Hour (Split Row)
        self.vibes_row = ctk.CTkFrame(self.left_col, fg_color="transparent")
        self.vibes_row.pack(fill="x", pady=(0, 15))
        
        # Golden Hour Card
        self.gold_card = ctk.CTkFrame(self.vibes_row, fg_color=C_CARD, corner_radius=15)
        self.gold_card.pack(side="left", fill="both", expand=True, padx=(0, 5), ipady=10)
        self.golden_title = ctk.CTkLabel(self.gold_card, text="📸 GOLDEN HOUR", font=("Roboto Bold", 12), text_color=C_GOLD)
        self.golden_title.pack(pady=(10, 5))
        self.golden_time = ctk.CTkLabel(self.gold_card, text="--:--", font=("Roboto Medium", 20))
        self.golden_time.pack()

        # Vibe Card
        self.vibe_card = ctk.CTkFrame(self.vibes_row, fg_color=C_CARD, corner_radius=15)
        self.vibe_card.pack(side="right", fill="both", expand=True, padx=(5, 0), ipady=10)
        ctk.CTkLabel(self.vibe_card, text="✨ THE VIBE", font=("Roboto Bold", 12), text_color="#00BFFF").pack(pady=(10, 5))
        self.vibe_text = ctk.CTkLabel(self.vibe_card, text="...", font=("Roboto", 14), wraplength=180)
        self.vibe_text.pack()

        # Hourly Scroll (Bottom of Left Column)
        ctk.CTkLabel(self.left_col, text="NEXT 24 HOURS", font=("Roboto Bold", 14), text_color=C_TEXT_DIM, anchor="w").pack(fill="x", pady=(10, 5))
        
        self.hour_scroll = ctk.CTkScrollableFrame(self.left_col, height=180, fg_color=C_ACCENT, orientation="horizontal", corner_radius=15)
        self.hour_scroll.pack(fill="x")

        # --- RIGHT COLUMN: 10-Day Forecast ---
        self.right_col = ctk.CTkFrame(self.dash_frame, fg_color=C_CARD, corner_radius=15)
        self.right_col.grid(row=0, column=1, sticky="nsew", padx=(10, 0))
        
        ctk.CTkLabel(self.right_col, text="🔟 10-DAY OUTLOOK", font=("Roboto Bold", 16), text_color=C_TEXT_DIM).pack(pady=20)
        
        self.daily_scroll = ctk.CTkScrollableFrame(self.right_col, fg_color="transparent")
        self.daily_scroll.pack(fill="both", expand=True, padx=10, pady=(0, 20))


        # Start Data Fetch
        self.fetch_data()
        
    def fetch_data(self):
        threading.Thread(target=self._get_weather_thread, daemon=True).start()
        self.after(REFRESH_RATE_MS, self.fetch_data)

    def _get_weather_thread(self):
        # NEW: Use shared fetch function
        weather_data, alerts_data = fetch_weather_data()
        
        if not weather_data:
            self.after(0, lambda: self.desc_label.configure(text="API Error"))
            return

        # Update UI
        self.after(0, lambda: self.update_ui(weather_data, alerts_data))

    def update_ui(self, data, alerts):
        current = data['current']
        daily = data['daily']
        hourly = data['hourly']

        # --- CURRENT ---
        temp = current['temperature_2m']
        feels = current['apparent_temperature']
        wind = current['wind_speed_10m']
        code = current['weather_code']
        
        self.temp_label.configure(text=f"{temp:.0f}°")
        self.desc_label.configure(text=self.get_wmo_desc(code))
        self.wind_label.configure(text=f"💨 {wind} mph")
        self.feels_label.configure(text=f"🌡️ Feels {feels:.0f}°")

        # --- ALERTS ---
        if alerts and alerts.get('features'):
            headlines = [f['properties']['headline'] for f in alerts['features']]
            alert_text = " ⚠️ ".join(headlines)
            self.alert_label.configure(text=f"⚠️ {alert_text}")
            self.alert_frame.grid(row=1, column=0, sticky="ew", padx=20, pady=(0, 20))
        else:
            self.alert_frame.grid_forget()

        # --- MOON / GOLDEN / VIBE ---
        self.moon_label.configure(text=f"{self.get_moon_phase()['text']} {self.get_moon_phase()['icon']}")
        
        # --- GOLDEN HOUR ---
        g_title, g_time = self.get_upcoming_golden_hour(daily)
        self.golden_title.configure(text=g_title)
        self.golden_time.configure(text=g_time)
        
        self.vibe_text.configure(text=self.get_vibe(temp, code))

        # --- HOURLY SCROLL (CARDS) ---
        for w in self.hour_scroll.winfo_children(): w.destroy()
        
        now_hour = datetime.now().hour
        times = hourly['time']
        
        # Find start index
        start_idx = 0
        for i, t in enumerate(times):
            if datetime.fromisoformat(t).hour == now_hour:
                start_idx = i
                break

        for i in range(start_idx, start_idx + 24):
            if i >= len(times): break
            
            # Sub-Card for Hour
            h_card = ctk.CTkFrame(self.hour_scroll, fg_color=C_CARD, corner_radius=10, width=80)
            h_card.pack(side="left", padx=5, pady=5)
            
            t_obj = datetime.fromisoformat(times[i])
            t_str = t_obj.strftime("%I %p").lstrip("0")
            
            ctk.CTkLabel(h_card, text=t_str, font=("Roboto", 12), text_color=C_TEXT_DIM).pack(pady=(5,0))
            ctk.CTkLabel(h_card, text=self.get_wmo_icon(hourly['weather_code'][i]), font=("Roboto", 24)).pack()
            ctk.CTkLabel(h_card, text=f"{hourly['temperature_2m'][i]:.0f}°", font=("Roboto Bold", 16)).pack()
            
            pop = hourly['precipitation_probability'][i]
            pop_col = "#87CEEB" if pop > 0 else C_ACCENT
            ctk.CTkLabel(h_card, text=f"{pop}%", font=("Roboto", 10), text_color=pop_col).pack(pady=(0,5))

        # --- 10-DAY LIST ---
        for w in self.daily_scroll.winfo_children(): w.destroy()
        
        for i in range(len(daily['time'])):
            day_frame = ctk.CTkFrame(self.daily_scroll, fg_color="transparent")
            day_frame.pack(fill="x", pady=5)
            
            dt = datetime.strptime(daily['time'][i], "%Y-%m-%d")
            day_name = dt.strftime("%a %d") # Mon 12
            
            # Row Layout
            ctk.CTkLabel(day_frame, text=day_name, font=("Roboto Bold", 14), width=60, anchor="w").pack(side="left", padx=10)
            ctk.CTkLabel(day_frame, text=self.get_wmo_icon(daily['weather_code'][i]), font=("Roboto", 20), width=30).pack(side="left")
            
            # H/L Temp
            hi = daily['temperature_2m_max'][i]
            lo = daily['temperature_2m_min'][i]
            ctk.CTkLabel(day_frame, text=f"{hi:.0f}° / {lo:.0f}°", font=("Roboto", 14), width=80).pack(side="right", padx=10)
            
            # Description (Truncated)
            desc = self.get_wmo_desc(daily['weather_code'][i])
            ctk.CTkLabel(day_frame, text=desc, font=("Roboto", 12), text_color=C_TEXT_DIM, anchor="w").pack(side="left", padx=10)


    # --- HELPERS ---
    def get_wmo_icon(self, code):
        icons = {0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 51:"🌧️", 61:"🌧️", 63:"🌧️", 71:"🌨️", 73:"🌨️", 95:"🌩️", 80:"🌦️"}
        return icons.get(code, "❓")

    def get_wmo_desc(self, code):
        return get_wmo_desc_static(code)

    def get_vibe(self, temp, code):
        if code >= 95: return "🚨 TORNADO ALLEY MODE."
        if code >= 61: return "Tea & Lofi Beats."
        if temp > 90: return "Do Not Go Outside."
        if temp > 65 and code <= 2: return "✨ Pure Bliss. Go Create."
        if temp < 40: return "Hoodie Layering Logic."
        return "Standard Operations."

    def get_moon_phase(self):
        # Rough calc
        lunar_cycle = 29.53
        known_new_moon = datetime(2025, 12, 19)
        days_since = (datetime.now() - known_new_moon).days
        cycle_pos = days_since % lunar_cycle
        
        if cycle_pos < 1.8: return {"icon":"🌑", "text":"New Moon"}
        if cycle_pos < 5.5: return {"icon":"🌒", "text":"Waxing Crescent"}
        if cycle_pos < 9.2: return {"icon":"🌓", "text":"First Quarter"}
        if cycle_pos < 12.9: return {"icon":"🌔", "text":"Waxing Gibbous"}
        if cycle_pos < 16.6: return {"icon":"🌕", "text":"Full Moon"}
        if cycle_pos < 20.3: return {"icon":"🌖", "text":"Waning Gibbous"}
        if cycle_pos < 24.0: return {"icon":"🌗", "text":"Last Quarter"}
        return {"icon":"🌘", "text":"Waning Crescent"}

    def get_upcoming_golden_hour(self, daily):
        now = datetime.now()
        
        # Parse Today
        rise_0 = datetime.fromisoformat(daily['sunrise'][0])
        set_0 = datetime.fromisoformat(daily['sunset'][0])
        
        # Windows
        m0_end = rise_0 + timedelta(hours=1)
        e0_start = set_0 - timedelta(hours=1) # Start of evening golden hour
        
        # 1. Check Today Morning (If we are in it or before it)
        if now < m0_end:
            return "🌅 MORNING GOLD", f"{rise_0.strftime('%I:%M')} - {m0_end.strftime('%I:%M %p').lstrip('0')}"
            
        # 2. Check Today Evening
        if now < set_0:
            return "📸 EVENING GOLD", f"{e0_start.strftime('%I:%M')} - {set_0.strftime('%I:%M %p').lstrip('0')}"
            
        # 3. Tomorrow Morning
        rise_1 = datetime.fromisoformat(daily['sunrise'][1])
        m1_end = rise_1 + timedelta(hours=1)
        return "🌅 TOMORROW GOLD", f"{rise_1.strftime('%I:%M')} - {m1_end.strftime('%I:%M %p').lstrip('0')}"

class CLIError(Exception):
    """Custom exception for CLI errors to avoid stack traces."""
    pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pip OS Weather Command")
    parser.add_argument("--cli", action="store_true", help="Run in CLI mode (text output only)")
    args = parser.parse_args()

    if args.cli:
        w, a = fetch_weather_data()
        print_weather_report(w, a)
    else:
        app = WeatherApp()
        app.mainloop()
