import { useEffect, useState } from "react";
import { SNARKY_TICKER_LINES } from "@/config/ticker_snark";

interface ForecastTickerProps {
    daily?: any[];
    alerts?: any[];
}

export function ForecastTicker({ daily, alerts }: ForecastTickerProps) {
    const [items, setItems] = useState<string[]>([
        "WEATHER WARS // INITIALIZING...",
        "WAITING FOR DATA STREAM"
    ]);

    useEffect(() => {
        const newItems: string[] = [];

        // 1. Gather all "Info" bits first
        const infoBits: string[] = [];

        // Alerts (High Priority)
        if (alerts && alerts.length > 0) {
            alerts.forEach(a => {
                const headline = (a.headline || "WEATHER ALERT").toUpperCase();
                infoBits.push(`⚠️ ${headline}`);
                if (headline.includes("TORNADO")) infoBits.push("DO NOT GO OUTSIDE TO FILM IT. SERIOUSLY.");
            });
        }

        // Decompose Daily Forecast
        if (daily && daily.length >= 2) {
            const today = daily[0];
            const tmrw = daily[1];

            // Today's chunks
            infoBits.push(`TODAY: ${today.condition?.toUpperCase() || 'CLEAR'}`);
            infoBits.push(`HIGH: ${Math.round(today.high)}°F`);
            infoBits.push(`LOW: ${Math.round(today.low)}°F`);
            // Add randomness for boring bits if available in data, else placeholders
            infoBits.push("UV INDEX: MODERATE"); // Placeholder until real data
            infoBits.push("WIND: NORTH 12 MPH"); // Placeholder until real data

            // Tomorrow's chunks
            infoBits.push(`TOMORROW: ${tmrw.condition?.toUpperCase() || 'CLEAR'}`);
            infoBits.push(`TARGET HIGH: ${Math.round(tmrw.high)}°F`);

            // Astro (Static for now, can be dynamic later)
            infoBits.push("MOON: WAXING GIBBOUS");
            infoBits.push("SUNRISE: 07:12 AM");
            infoBits.push("SUNSET: 05:48 PM");
        } else {
            // Filler info if no data
            infoBits.push("SYSTEM ONLINE");
            infoBits.push("MONITORING FREQUENCIES");
            infoBits.push("SATELLITE UPLINK ESTABLISHED");
        }

        // 2. Interleave Logic (1 Joke : 3 Info)
        // [Joke, Info, Info, Info, Joke, Info, Info, Info...]

        let infoIndex = 0;
        let protectionCount = 0; // Prevent infinite loops

        while (infoIndex < infoBits.length && protectionCount < 100) {
            protectionCount++;

            // Add a Joke
            const randomJoke = SNARKY_TICKER_LINES[Math.floor(Math.random() * SNARKY_TICKER_LINES.length)];
            newItems.push(randomJoke);

            // Add up to 3 Info bits
            for (let i = 0; i < 3; i++) {
                if (infoIndex < infoBits.length) {
                    newItems.push(infoBits[infoIndex]);
                    infoIndex++;
                }
            }
        }

        // If we ran out of info but the list is short, add more jokes
        if (newItems.length < 10) {
            newItems.push(...SNARKY_TICKER_LINES.sort(() => 0.5 - Math.random()).slice(0, 5));
        }

        setItems(newItems);

    }, [daily, alerts]);

    return (
        <div className="fixed bottom-0 left-0 w-full bg-slate-900/90 border-t border-slate-800 backdrop-blur-md overflow-hidden z-50 h-10 flex items-center">
            <div className="flex animate-marquee whitespace-nowrap gap-12">
                {/* Triple Loop for smoothness */}
                {[...items, ...items, ...items, ...items].map((item, i) => (
                    <span key={i} className={`text-xs md:text-sm font-mono font-bold tracking-widest pl-10 ${item.includes("⚠️") ? "text-red-500 animate-pulse" : item.length > 50 ? "text-emerald-400" : "text-slate-300"}`}>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{item} ::
                    </span>
                ))}
            </div>

            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 120s linear infinite; /* Slowed down for readability */
                }
            `}</style>
        </div>
    );
}
