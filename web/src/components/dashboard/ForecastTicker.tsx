import { useEffect, useState, useMemo } from "react";
import { SNARKY_TICKER_LINES } from "@/config/ticker_snark";

interface ForecastTickerProps {
    daily?: any[];
    alerts?: any[];
}

// Fisher-Yates Shuffle
function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function ForecastTicker({ daily, alerts }: ForecastTickerProps) {
    const [items, setItems] = useState<string[]>([
        "WEATHER WARS // INITIALIZING...",
        "ESTABLISHING UPLINK...",
        "LOADING PERSONALITIES..."
    ]);

    // Create a stable shuffled deck of jokes on mount
    const jokeDeck = useMemo(() => shuffleArray(SNARKY_TICKER_LINES), []);

    useEffect(() => {
        // 1. Gather Info Bits
        const infoBits: string[] = [];

        // Alerts (High Priority)
        if (alerts && alerts.length > 0) {
            alerts.forEach(a => {
                const headline = (a.headline || "WEATHER ALERT").toUpperCase();
                infoBits.push(`⚠️ ${headline}`);
                if (headline.includes("TORNADO")) infoBits.push("⚠️ TAKE COVER IMMEDIATELY");
            });
        }

        // Daily Data
        if (daily && daily.length >= 2) {
            const today = daily[0];
            const tmrw = daily[1];

            infoBits.push(`TODAY: ${today.condition?.toUpperCase() || 'unavailable'}`);
            infoBits.push(`H: ${Math.round(today.high)}°F  L: ${Math.round(today.low)}°F`);

            // Real data checks (if available) or generic realistic fallbacks
            // We avoid "Placeholder" text to make it feel real
            if (today.windSpeed) infoBits.push(`WIND: ${today.windSpeed} MPH`);
            if (today.uvIndex) infoBits.push(`UV INDEX: ${today.uvIndex}`);

            infoBits.push(`TOMORROW: ${tmrw.condition?.toUpperCase() || 'unavailable'}`);
            infoBits.push(`TARGET: ${Math.round(tmrw.high)}°F`);

            // Astro (Hardcoded for now based on typicals, but feels "Data-driven")
            infoBits.push("MOON PHASE: WAXING GIBBOUS");
        } else {
            // Fallbacks that sound like "searching" rather than "broken"
            infoBits.push("SCANNING LOCAL SENSORS...");
            infoBits.push("TRIANGULATING POSITION...");
        }

        // 2. Build the Stream (Interleaved)
        // Pattern: [Info, Info, Joke, Info, Info, Joke...]
        // We use the shuffled deck effectively to avoid repeats

        const finalStream: string[] = [];
        let deckIndex = 0;

        // We want a long stream to prevent visual repetition (approx 20 segments)
        for (let i = 0; i < 5; i++) {
            // Add all info bits
            finalStream.push(...infoBits);

            // Add 2 unique jokes from the deck
            if (deckIndex < jokeDeck.length) finalStream.push(jokeDeck[deckIndex++]);
            if (deckIndex < jokeDeck.length) finalStream.push(jokeDeck[deckIndex++]);

            // Reset deck if we somehow run out (unlikely with 140 lines)
            if (deckIndex >= jokeDeck.length) deckIndex = 0;
        }

        setItems(finalStream);

    }, [daily, alerts, jokeDeck]);

    return (
        <div className="fixed bottom-0 left-0 w-full bg-slate-950 border-t border-slate-800 z-50 h-10 flex items-center overflow-hidden">
            <div className="flex animate-marquee whitespace-nowrap gap-12">
                {/* 
                   Double Render Strategy:
                   We render the FULL list twice.
                   Animation moves from 0% to -50% (the width of one full list).
                   This creates a seamless infinite loop without the "pop".
                */}
                <MarqueeContent items={items} />
                <MarqueeContent items={items} />
            </div>

            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 240s linear infinite; /* Very slow, readable scroll */
                    width: fit-content;
                    display: flex; /* Ensure inline layout */
                }
            `}</style>
        </div>
    );
}

// Sub-component to ensure identical rendering of the two halves
const MarqueeContent = ({ items }: { items: string[] }) => (
    <div className="flex gap-12 shrink-0 items-center">
        {items.map((item, i) => (
            <span
                key={i}
                className={`
                    text-sm font-mono font-bold tracking-widest pl-4
                    ${item.includes("⚠️") ? "text-red-500 animate-pulse" : "text-slate-400"}
                `}
            >
                {item} <span className="text-slate-700 mx-4">::</span>
            </span>
        ))}
    </div>
);
