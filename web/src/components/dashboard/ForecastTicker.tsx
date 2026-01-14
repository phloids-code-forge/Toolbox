"use client";

import { useEffect, useState } from "react";

interface ForecastTickerProps {
    daily?: any[];
    alerts?: any[]; // NWS Alerts (optional for now)
}

export function ForecastTicker({ daily, alerts }: ForecastTickerProps) {
    const [items, setItems] = useState<string[]>([
        "WEATHER WARS // INITIALIZING...",
        "WAITING FOR DATA STREAM"
    ]);

    useEffect(() => {
        const newItems: string[] = [];

        // 1. ALERTS (High Priority)
        if (alerts && alerts.length > 0) {
            alerts.forEach(a => {
                const headline = (a.headline || "WEATHER ALERT").toUpperCase();
                newItems.push(`⚠️ ${headline}`);

                // THE PROFESSOR'S WIT: Contextual Injection
                if (headline.includes("FIRE") || headline.includes("RED FLAG")) {
                    newItems.push("PROFESSOR: DON'T DROP THAT MIXTAPE. THE WORLD IS GASOLINE.");
                }
                if (headline.includes("FREEZE") || headline.includes("FROST")) {
                    newItems.push("PROFESSOR: PLANTS ARE SCREAMING. COVER THEM.");
                }
                if (headline.includes("HEAT") || headline.includes("HOT")) {
                    newItems.push("PROFESSOR: THE SUN IS A DEADLY LASER. HIDE.");
                }
            });
        }

        // 2. DAILY FORECAST (Today/Tomorrow)
        if (daily && daily.length >= 2) {
            const today = daily[0];
            const tmrw = daily[1];

            // Today
            const t_high = today.high ? Math.round(today.high) : '--';
            const t_low = today.low ? Math.round(today.low) : '--';
            newItems.push(`TODAY: ${today.condition?.toUpperCase() || 'CLEAR'} / H:${t_high}° L:${t_low}°`);

            // Tomorrow
            const tm_high = tmrw.high ? Math.round(tmrw.high) : '--';
            newItems.push(`TOMORROW: ${tmrw.condition?.toUpperCase() || 'CLEAR'} / HIGH ${tm_high}°`);
        }

        // 3. STATIC FILLER (If no data yet)
        if (newItems.length === 0) {
            newItems.push("SYSTEM ONLINE");
            newItems.push("AWAITING NWS FEED");
        } else {
            // Append Golden Hour / UV if we have it (Hardcoded for now as it's not passed yet)
            newItems.push("GOLDEN HOUR: CHECK DASHBOARD");
            newItems.push("UV INDEX: MODERATE");
        }

        setItems(newItems);

    }, [daily, alerts]);

    return (
        <div className="fixed bottom-0 left-0 w-full bg-slate-900/90 border-t border-slate-800 backdrop-blur-md overflow-hidden z-50 h-10 flex items-center">
            <div className="flex animate-marquee whitespace-nowrap gap-12">
                {/* Triple Loop for smoothness */}
                {[...items, ...items, ...items, ...items].map((item, i) => (
                    <span key={i} className="text-xs md:text-sm font-mono font-bold text-emerald-400 tracking-widest uppercase">
                        {item} ::
                    </span>
                ))}
            </div>

            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 60s linear infinite;
                }
            `}</style>
        </div>
    );
}
