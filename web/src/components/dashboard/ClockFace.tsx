"use client";

import { useEffect, useState } from "react";
import { getLatestSnapshots } from "@/app/actions/db-manage";
import Link from "next/link";

import { RealTimeClock } from "./RealTimeClock";
import { WeatherIcon } from "./WeatherIcon";
import { ForecastTicker } from "./ForecastTicker";
import { ForecastGrid } from "./ForecastGrid";
import { RadarEmbed } from "./RadarEmbed";
import { AstronomyPanel } from "./AstronomyPanel";
import { TestAlertButton } from "./TestAlertButton";
import { AlertBanner } from "./AlertBanner";
import { GreenThumbPanel } from "./GreenThumbPanel";
import { UniversityModal } from "./UniversityModal";
import { ThemeToggle } from "@/components/ThemeToggle";

// Friendly display names for sources
const SOURCE_NAMES: Record<string, string> = {
    'kwtv': 'News 9',
    'open_meteo': 'Open-Meteo',
    'openweathermap': 'OpenWeather',
    'weatherapi': 'WeatherAPI',
};

// Placeholder accuracy scores (will be calculated from historical data later)
const ACCURACY_SCORES: Record<string, number> = {
    'open_meteo': 94,
    'weatherapi': 91,
    'openweathermap': 88,
    'kwtv': 85,
};

// Mapped Colors
const COLOR_THEMES: Record<string, { border: string; text: string; hoverBorder: string; accent: string }> = {
    slate: { border: "border-slate-500/20", text: "text-slate-400", hoverBorder: "hover:border-slate-500/50", accent: "bg-slate-500" },
    red: { border: "border-red-500/20", text: "text-red-400", hoverBorder: "hover:border-red-500/50", accent: "bg-red-500" },
    purple: { border: "border-purple-500/20", text: "text-purple-400", hoverBorder: "hover:border-purple-500/50", accent: "bg-purple-500" },
    orange: { border: "border-orange-500/20", text: "text-orange-400", hoverBorder: "hover:border-orange-500/50", accent: "bg-orange-500" },
    blue: { border: "border-blue-500/20", text: "text-blue-400", hoverBorder: "hover:border-blue-500/50", accent: "bg-blue-500" },
};

export function ClockFace() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [explainTopic, setExplainTopic] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            const res = await getLatestSnapshots();
            if (res.success) {
                setData(res.data || []);
            }
            setLoading(false);
        }
        load();
    }, []);

    if (loading) return <div className="text-slate-500 animate-pulse p-8">Loading War Room...</div>;

    // Organize Data
    const nwsData = data.find(d => d.station_id.startsWith('nws-'));
    const nws = nwsData?.forecast_data || {};
    const openMeteoData = data.find(d => d.station_id === 'open_meteo');
    const openMeteo = openMeteoData?.forecast_data || {};
    const competitors = data.filter(d =>
        !d.station_id.startsWith('nws-') &&
        d.station_id !== 'kfor'
    );

    return (
        // MAIN CONTAINER: Full viewport height, flex column
        <div className="flex flex-col w-full min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans selection:bg-emerald-500/30 transition-colors duration-300">

            {/* Real NWS Alert Banner (polls DB every 30s) */}
            <AlertBanner />

            {/* Header: Compact to maximize content space */}
            <header className="flex flex-col items-center pt-4 pb-4 md:pt-6 md:pb-4 relative z-10 shrink-0">
                <div className="hidden md:flex items-center gap-3 absolute top-4 right-4 md:top-6 md:right-8">
                    <ThemeToggle />
                    <TestAlertButton />
                </div>

                <h2 className="text-[10px] md:text-xs font-bold tracking-[0.4em] text-slate-500 uppercase mb-2 md:mb-3 opacity-80">
                    Weather Wars // Battle for Accuracy
                </h2>

                <div className="text-5xl md:text-7xl lg:text-8xl font-black bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-200 to-slate-500/50 drop-shadow-[0_10px_20px_rgba(255,255,255,0.1)] tracking-tighter">
                    <RealTimeClock />
                </div>
            </header>

            {/* CONTENT WRAPPER: Grows to fill available space */}
            <main className="flex-grow flex flex-col w-full mx-auto px-4 md:px-8 xl:px-12 2xl:px-16 gap-6 md:gap-8 pb-20">

                {/* UPPER DECK: Core Data Visibility */}
                <div className="flex flex-col xl:grid xl:grid-cols-12 gap-6 xl:gap-10 items-stretch flex-grow">

                    {/* Left Flank: The Truth (NWS), Astronomy, Green Thumb */}
                    <div className="xl:col-span-3 flex flex-col gap-6 order-1 xl:order-1 sm:flex-row xl:flex-col sm:items-stretch">

                        {/* NWS Truth Circle */}
                        <div className="flex-1 relative flex flex-col items-center justify-center p-8 rounded-[2rem] aspect-square border border-emerald-500/20 bg-slate-900/20 backdrop-blur-sm shadow-[0_0_80px_-20px_rgba(16,185,129,0.15)] group hover:border-emerald-500/40 hover:bg-emerald-950/20 transition-all duration-500">
                            <div className="absolute inset-4 rounded-full border border-emerald-500/10 group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-b from-emerald-500/5 to-transparent opacity-50" />

                            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold px-4 py-1.5 rounded-full mb-6 tracking-widest uppercase backdrop-blur-md">
                                Official NWS
                            </span>

                            <div className="flex items-start justify-center text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.5)] scale-110 xl:scale-125 origin-bottom">
                                <span className="text-8xl xl:text-9xl font-bold tracking-tighter leading-none">
                                    {nws.currentTemp ? Math.round(nws.currentTemp) : '--'}
                                </span>
                                <span className="text-4xl xl:text-5xl font-light opacity-60 mt-4">°</span>
                            </div>

                            <div className="flex items-center gap-2 mt-6 mb-8 text-emerald-200/90">
                                <WeatherIcon condition={nws.conditionText} className="w-8 h-8" />
                                <p className="font-mono text-lg uppercase tracking-wider font-bold">
                                    {nws.conditionText || 'ONLINE'}
                                </p>
                            </div>

                            {/* Detailed Stats */}
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-center w-full max-w-[200px]">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-emerald-500/60 uppercase tracking-widest">Feels Like</span>
                                    <span className="text-xl font-bold text-emerald-300">
                                        {nws.windChill ? Math.round(nws.windChill) : (nws.currentTemp ? Math.round(nws.currentTemp) : '--')}°
                                    </span>
                                </div>
                                <div className="flex flex-col border-l border-emerald-500/20">
                                    <span className="text-[10px] text-emerald-500/60 uppercase tracking-widest">Wind</span>
                                    <span className="text-xl font-bold text-emerald-300">
                                        {nws.windSpeed ? Math.round(nws.windSpeed) : '--'} <span className="text-xs font-normal opacity-70">mph</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Astronomy Panel */}
                        <div className="flex-none">
                            <AstronomyPanel />
                        </div>

                        {/* Green Thumb Panel */}
                        <div className="flex-none">
                            <GreenThumbPanel
                                soilTemp={openMeteo.soilTemperature}
                                soilMoisture={openMeteo.soilMoisture}
                                daily={openMeteo.daily}
                                onExplain={(topic) => setExplainTopic(topic)}
                            />
                        </div>
                    </div>

                    {/* Center Stage: The Map */}
                    <div className="xl:col-span-6 order-3 xl:order-2 flex flex-col min-h-[300px] md:min-h-[400px] xl:min-h-full">
                        <RadarEmbed />
                    </div>

                    {/* Right Flank: The Future (Forecast) */}
                    <div className="xl:col-span-3 order-2 xl:order-3">
                        <ForecastGrid />
                    </div>
                </div>

                {/* LOWER DECK: The Participants (Cards) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pt-4 border-t border-slate-800/50 shrink-0">
                    {competitors.map((station) => {
                        const s = station.forecast_data;
                        const accuracy = ACCURACY_SCORES[station.station_id] || 0;

                        // Theme Colors
                        let colorKey = "slate";
                        if (station.station_id === 'kwtv') colorKey = "red";
                        if (station.station_id === 'open_meteo') colorKey = "purple";
                        if (station.station_id === 'openweathermap') colorKey = "orange";
                        if (station.station_id === 'weatherapi') colorKey = "blue";

                        const theme = COLOR_THEMES[colorKey];

                        return (
                            <div key={station.id} className={`relative flex flex-col items-center p-6 rounded-2xl bg-slate-900/40 border ${theme.border} transition-all duration-300 hover:bg-slate-900/80 ${theme.hoverBorder} group`}>
                                {/* Station Name + Score */}
                                <div className="flex items-center justify-between w-full mb-3">
                                    <h3 className={`text-sm font-bold tracking-widest uppercase ${theme.text}`}>
                                        {SOURCE_NAMES[station.station_id] || station.station_id}
                                    </h3>
                                    {accuracy > 0 && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full ${theme.accent}`} style={{ width: `${accuracy}%` }} />
                                            </div>
                                            <span className="text-xs text-slate-400 font-mono">{accuracy}%</span>
                                        </div>
                                    )}
                                </div>

                                {/* Current Temp */}
                                <div className="text-5xl font-bold text-white tracking-tighter my-1 drop-shadow-lg">
                                    {s.currentTemp ? Math.round(s.currentTemp) : '--'}°
                                </div>

                                {/* Condition */}
                                <div className="flex items-center gap-1.5 mb-3">
                                    <WeatherIcon condition={s.conditionText} className={`w-5 h-5 ${theme.text}`} />
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                        {s.conditionText || 'N/A'}
                                    </span>
                                </div>

                                {/* High / Low */}
                                <div className="flex items-center gap-4 text-xs font-mono text-slate-500 bg-black/20 px-3 py-1 rounded-full">
                                    <span>H: <span className="text-slate-300 font-bold">{s.high ? Math.round(s.high) : '--'}°</span></span>
                                    <span className="w-px h-3 bg-slate-700" />
                                    <span>L: <span className="text-slate-300 font-bold">{s.low ? Math.round(s.low) : '--'}°</span></span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Ticker */}
            <ForecastTicker daily={nws.daily} alerts={nws.alerts} />

            {/* The University Modal (triggered by GreenThumb clicks) */}
            {explainTopic && (
                <UniversityModal topic={explainTopic} onClose={() => setExplainTopic(null)} />
            )}

            {/* Footer with secret π link */}
            <footer className="fixed bottom-12 right-4 z-40">
                <Link
                    href="/corner"
                    className="text-slate-800 hover:text-emerald-500 transition-colors text-lg font-bold opacity-50 hover:opacity-100"
                    title="Phloid's Corner"
                >
                    π
                </Link>
            </footer>

        </div>
    );
}
