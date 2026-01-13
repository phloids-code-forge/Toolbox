"use client";

import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, Moon, Sun, Wind } from "lucide-react";

interface WeatherIconProps {
    condition: string;
    className?: string;
    isNight?: boolean; // Future proofing
}

export function WeatherIcon({ condition, className = "w-6 h-6", isNight = false }: WeatherIconProps) {
    const c = condition?.toLowerCase() || "";

    // Clear / Sunny
    if (c.includes("clear") || c.includes("sunny")) {
        return isNight ? <Moon className={className} /> : <Sun className={className} />;
    }

    // Rain / Drizzle
    if (c.includes("rain") || c.includes("drizzle") || c.includes("shower")) {
        return <CloudRain className={className} />;
    }

    // Thunder
    if (c.includes("thunder") || c.includes("storm") || c.includes("t-storm")) {
        return <CloudLightning className={className} />;
    }

    // Snow / Ice
    if (c.includes("snow") || c.includes("ice") || c.includes("sleet") || c.includes("blizzard")) {
        return <CloudSnow className={className} />;
    }

    // Fog / Mist
    if (c.includes("fog") || c.includes("mist") || c.includes("haze")) {
        return <CloudFog className={className} />;
    }

    // Cloudy / Overcast
    if (c.includes("cloud") || c.includes("overcast")) {
        return <Cloud className={className} />;
    }

    // Wind
    if (c.includes("wind") || c.includes("breeze")) {
        return <Wind className={className} />;
    }

    // Default
    return <Cloud className={className} />;
}
