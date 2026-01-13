"use client";

export function ForecastTicker() {
    // TODO: In Phase 6b, wire this up to real Open-Meteo Daily Forecast data
    // For now, static placeholders to establish layout
    const items = [
        "TODAY: HIGH 68° / LOW 45°",
        "TOMORROW: SUNNY / HIGH 72°",
        "WEDNESDAY: CHANCE OF RAIN 30%",
        "GOLDEN HOUR: 5:45 PM",
        "UV INDEX: MODERATE (4)",
        "WIND: N 10 MPH"
    ];

    return (
        <div className="fixed bottom-0 left-0 w-full bg-slate-900/90 border-t border-slate-800 backdrop-blur-md overflow-hidden z-50">
            <div className="flex items-center h-10">
                <div className="flex animate-marquee whitespace-nowrap gap-12">
                    {/* Double the list for seamless loop */}
                    {[...items, ...items, ...items].map((item, i) => (
                        <span key={i} className="text-sm font-mono font-bold text-emerald-400 tracking-widest uppercase">
                            {item}
                        </span>
                    ))}
                </div>
            </div>

            {/* Tailwind Helper for animation (needs to be in global.css really, but we can hack it here or rely on animate-pulse if lazy, but let's try to be clean)
                Actually, standard Tailwind doesn't have 'marquee'. 
                We might need to rely on a simple transform or just use 'overflow-x-auto' if animation is hard without config.
                Let's use a simpler static grid for now if animation fails, or just CSS keyframes.
            */}
            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                }
            `}</style>
        </div>
    );
}
