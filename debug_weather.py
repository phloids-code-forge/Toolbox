import requests
import json

LAT = 35.22
LON = -96.67
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

try:
    print("Fetching Open-Meteo Data...")
    res = requests.get(om_url, params=params)
    print(f"Status: {res.status_code}")
    data = res.json()
    
    if data.get("error"):
        print("API Error:", data)
    else:
        print("Keys received:", data.keys())
        if 'current' in data:
            print("Current:", data['current'])
        else:
            print("MISSING 'current' BLOCK")
            
        if 'daily' in data:
            print("Daily Count:", len(data['daily'].get('time', [])))
        else:
            print("MISSING 'daily' BLOCK")

except Exception as e:
    print(f"EXCEPTION: {e}")
