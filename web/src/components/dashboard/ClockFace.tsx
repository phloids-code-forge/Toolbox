"use client";

import { useEffect, useState } from "react";
import { getLatestSnapshots } from "@/app/actions/db-manage";
import Link from "next/link";
import { Heart } from "lucide-react";

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

// Convert degrees to cardinal direction
function degreesToCardinal(deg: number | undefined): string {
    if (deg === undefined) return '';
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
}

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

    // ==========================================
    // INTERIM COMMANDER LOGIC (Smart Fallback)
    // ==========================================
    // If NWS is missing temp, find the highest-rated alternative to take command.

    // Candidates in order of accuracy (User defined: Open-Meteo -> WeatherAPI -> OpenWeather)
    // KWTV excluded for now per user request.
    const FALLBACK_ORDER = ['open_meteo', 'weatherapi', 'openweathermap'];

    let primarySourceId = 'nws';
    let primaryData = nws;
    let isInterim = false;

    // Check if NWS is valid (has temp)
    if (nws.currentTemp === null || nws.currentTemp === undefined) {
        // NWS is down! Find a leader.
        for (const candidateId of FALLBACK_ORDER) {
            const candidate = data.find(d => d.station_id === candidateId);
            if (candidate?.forecast_data?.currentTemp !== undefined && candidate?.forecast_data?.currentTemp !== null) {
                primarySourceId = candidateId;
                primaryData = candidate.forecast_data;
                isInterim = true;
                break;
            }
        }
    }

    // Determine Theme based on Primary Source
    let themeKey = 'slate';
    if (primarySourceId === 'nws') themeKey = 'emerald'; // NWS is Green
    else if (primarySourceId === 'open_meteo') themeKey = 'purple';
    else if (primarySourceId === 'weatherapi') themeKey = 'blue';
    else if (primarySourceId === 'openweathermap') themeKey = 'orange';

    // Manually map NWS emerald theme since it's not in the shared COLOR_THEMES object (it was hardcoded)
    const activeTheme = themeKey === 'emerald' ? {
        border: "border-emerald-500/20",
        text: "text-emerald-400",
        accent: "bg-emerald-500",
        ring: "ring-emerald-500/10",
        glow: "shadow-[0_20px_50px_-12px_rgba(16,185,129,0.25)]",
        darkGlow: "dark:shadow-[0_0_80px_-20px_rgba(16,185,129,0.15)]",
        textMain: "text-emerald-800 dark:text-emerald-300",
        textSecondary: "text-emerald-900/80 dark:text-emerald-200/90",
        labelBg: "bg-emerald-500/10",
        gradient: "from-emerald-500/5 via-transparent to-emerald-500/5"
    } : {
        // Map standard themes to the main circle style
        border: COLOR_THEMES[themeKey].border,
        text: COLOR_THEMES[themeKey].text,
        accent: COLOR_THEMES[themeKey].accent,
        // Customized glows for other colors
        ring: `ring-${themeKey}-500/10`,
        glow: `shadow-[0_20px_50px_-12px_rgba(var(--${themeKey}-500-rgb),0.25)]`, // Approximate/Fallback since tailwind arbitrary values are tricky dynamically
        // Use simpler safe defaults for dynamic colors if possible, or just hardcode map:
        darkGlow: "",
        textMain: `text-${themeKey}-800 dark:text-${themeKey}-300`,
        textSecondary: `text-${themeKey}-900/80 dark:text-${themeKey}-200/90`,
        labelBg: `bg-${themeKey}-500/10`,
        gradient: `from-${themeKey}-500/5 via-transparent to-${themeKey}-500/5`
    };

    // Helper for non-emerald dynamic colors (Tailwind safe-list might be needed, but we'll try standard keys)
    // Actually, dynamic classes like `text-${themeKey}-400` often fail in Tailwind JIT if not seen.
    // Let's make a precise map for the MAIN circle to be safe.
    const COMMANDER_THEMES: Record<string, any> = {
        nws: {
            borderColor: "border-emerald-500/20",
            textColor: "text-emerald-400",
            labelBg: "bg-emerald-500/10",
            shadow: "shadow-[0_20px_50px_-12px_rgba(16,185,129,0.25)] dark:shadow-[0_0_80px_-20px_rgba(16,185,129,0.15)]",
            ring: "ring-emerald-500/10",
            gradient: "from-emerald-500/5 via-transparent to-emerald-500/5",
            mainText: "text-emerald-800 dark:text-emerald-300",
            subText: "text-emerald-900/80 dark:text-emerald-200/90",
            label: "OFFICIAL NWS"
        },
        open_meteo: {
            borderColor: "border-purple-500/20",
            textColor: "text-purple-400",
            labelBg: "bg-purple-500/10",
            shadow: "shadow-[0_20px_50px_-12px_rgba(168,85,247,0.25)] dark:shadow-[0_0_80px_-20px_rgba(168,85,247,0.15)]",
            ring: "ring-purple-500/10",
            gradient: "from-purple-500/5 via-transparent to-purple-500/5",
            mainText: "text-purple-800 dark:text-purple-300",
            subText: "text-purple-900/80 dark:text-purple-200/90",
            label: "INTERIM COMMAND: OPEN-METEO"
        },
        weatherapi: {
            borderColor: "border-blue-500/20",
            textColor: "text-blue-400",
            labelBg: "bg-blue-500/10",
            shadow: "shadow-[0_20px_50px_-12px_rgba(59,130,246,0.25)] dark:shadow-[0_0_80px_-20px_rgba(59,130,246,0.15)]",
            ring: "ring-blue-500/10",
            gradient: "from-blue-500/5 via-transparent to-blue-500/5",
            mainText: "text-blue-800 dark:text-blue-300",
            subText: "text-blue-900/80 dark:text-blue-200/90",
            label: "INTERIM COMMAND: WEATHER API"
        },
        openweathermap: {
            borderColor: "border-orange-500/20",
            textColor: "text-orange-400",
            labelBg: "bg-orange-500/10",
            shadow: "shadow-[0_20px_50px_-12px_rgba(249,115,22,0.25)] dark:shadow-[0_0_80px_-20px_rgba(249,115,22,0.15)]",
            ring: "ring-orange-500/10",
            gradient: "from-orange-500/5 via-transparent to-orange-500/5",
            mainText: "text-orange-800 dark:text-orange-300",
            subText: "text-orange-900/80 dark:text-orange-200/90",
            label: "INTERIM COMMAND: OPENWEATHER"
        }
    };

    // Fallback scheme if ID not found
    const currentTheme = COMMANDER_THEMES[primarySourceId] || COMMANDER_THEMES['nws'];


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

                <div className="text-5xl md:text-7xl lg:text-8xl font-black bg-clip-text text-transparent bg-gradient-to-b from-[var(--text-primary)] via-[var(--text-secondary)] to-[var(--text-muted)] drop-shadow-[0_10px_20px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_10px_20px_rgba(255,255,255,0.1)] tracking-tighter">
                    <RealTimeClock />
                </div>
            </header>

            {/* CONTENT WRAPPER: Grows to fill available space */}
            <main className="flex-grow flex flex-col w-full mx-auto px-4 md:px-8 xl:px-12 2xl:px-16 gap-6 md:gap-8 pb-20">

                {/* UPPER DECK: Core Data Visibility */}

                <div className="flex flex-col xl:grid xl:grid-cols-12 gap-6 xl:gap-10 items-stretch flex-grow">

                    {/* Left Flank: The Truth (NWS), Astronomy, Green Thumb */}
                    <div className="xl:col-span-3 flex flex-col gap-6 order-1 xl:order-1 sm:flex-row xl:flex-col sm:items-stretch">

                        {/* NWS Truth Circle (OR INTERIM COMMANDER) */}
                        <div className={`flex-1 relative flex flex-col items-center justify-center p-6 rounded-[2rem] aspect-square border ${currentTheme.borderColor} bg-slate-300/50 dark:bg-slate-700/40 backdrop-blur-xl ${currentTheme.shadow} group hover:scale-[1.02] transition-all duration-500 overflow-hidden ring-1 ${currentTheme.ring}`}>


                            <div className={`absolute inset-4 rounded-full border border-current opacity-10 group-hover:scale-105 transition-transform duration-700 ${currentTheme.textColor}`} />
                            <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${currentTheme.gradient} opacity-50`} />

                            <span className={`${currentTheme.labelBg} border border-current ${currentTheme.textColor} bg-opacity-10 text-xs font-bold px-4 py-1.5 rounded-full mb-6 tracking-widest uppercase backdrop-blur-md`}>
                                {currentTheme.label}
                            </span>

                            <div className={`flex items-start justify-center ${currentTheme.mainText} drop-shadow-sm dark:drop-shadow-[0_0_25px_currentColor] scale-100 xl:scale-110 origin-center z-10 my-4`}>
                                <span className="text-[5rem] sm:text-[6rem] lg:text-[7rem] xl:text-[8rem] font-bold tracking-tighter leading-none">
                                    {primaryData.currentTemp ? Math.round(primaryData.currentTemp) : '--'}
                                </span>
                                <span className="text-4xl xl:text-5xl font-light opacity-60 mt-2 sm:mt-4">°</span>
                            </div>

                            <div className={`flex items-center gap-2 mt-6 mb-8 ${currentTheme.subText}`}>
                                <WeatherIcon condition={primaryData.conditionText} className="w-8 h-8" />
                                <p className="font-mono text-lg uppercase tracking-wider font-bold">
                                    {primaryData.conditionText || 'ONLINE'}
                                </p>
                            </div>

                            {/* Detailed Stats */}
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-center w-full max-w-[200px]">
                                <div className="flex flex-col">
                                    <span className={`text-[10px] ${currentTheme.subText} opacity-60 uppercase tracking-widest`}>Feels Like</span>
                                    <span className={`text-xl font-bold ${currentTheme.mainText}`}>
                                        {primaryData.windChill ? Math.round(primaryData.windChill) : (primaryData.currentTemp ? Math.round(primaryData.currentTemp) : '--')}°
                                    </span>
                                </div>
                                <div className={`flex flex-col border-l border-current opacity-80 ${currentTheme.textColor}`}>
                                    <span className={`text-[10px] ${currentTheme.subText} opacity-60 uppercase tracking-widest`}>Wind</span>
                                    <span className={`text-xl font-bold ${currentTheme.mainText}`}>
                                        {primaryData.windDirection !== undefined && <span className="text-sm opacity-80">{degreesToCardinal(primaryData.windDirection)} </span>}
                                        {primaryData.windSpeed ? Math.round(primaryData.windSpeed) : '--'}
                                        {primaryData.windGust && <span className="text-sm opacity-70"> G:{Math.round(primaryData.windGust)}</span>}
                                        <span className="text-xs font-normal opacity-70"> mph</span>
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
                                soilTemp={openMeteo.soilTemp}
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
                            <div key={station.id} className={`relative flex flex-col items-center p-6 rounded-md bg-white/80 dark:bg-slate-900/40 border ${theme.border} transition-all duration-300 hover:bg-white dark:hover:bg-slate-900/80 ${theme.hoverBorder} group overflow-hidden shadow-sm hover:shadow-md min-h-[150px] justify-between`}>
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
                                <div className="text-4xl lg:text-5xl font-bold text-stone-800 dark:text-white tracking-tighter my-2 drop-shadow-sm">
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

            {/* Footer with Ko-fi + secret π link */}
            <footer className="fixed bottom-14 right-4 z-40 flex items-center gap-4">
                <a
                    href="https://ko-fi.com/phloid"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] hover:border-pink-500/50 hover:bg-pink-500/10 transition-all duration-300 group"
                >
                    <Heart className="w-4 h-4 text-pink-500 group-hover:fill-pink-500 transition-all" />
                    <span className="text-xs font-mono text-[var(--text-secondary)] group-hover:text-pink-400 transition-colors">Support</span>
                </a>
                <Link
                    href="/corner"
                    className="text-[var(--text-muted)] hover:text-emerald-500 transition-colors text-lg font-bold opacity-50 hover:opacity-100"
                    title="phloid's Corner"
                >
                    π
                </Link>
            </footer>

        </div>
    );
}
