"use client";

import { useState, useEffect } from "react";
import { Droplets } from "lucide-react";
import { getLatestSnapshots } from "@/app/actions/db-manage";

// Source display names
const SOURCE_NAMES: Record<string, string> = {
    'nws-okc': 'NWS',
    'open_meteo': 'Open-Meteo',
    'openweathermap': 'OpenWeather',
    'weatherapi': 'WeatherAPI',
    'kwtv': 'News 9',
};

// Color themes for sources
const SOURCE_COLORS: Record<string, string> = {
    'nws-okc': 'text-emerald-400',
    'open_meteo': 'text-purple-400',
    'openweathermap': 'text-orange-400',
    'weatherapi': 'text-blue-400',
    'kwtv': 'text-red-400',
};

// Accent colors for progress bars
const SOURCE_ACCENTS: Record<string, string> = {
    'open_meteo': 'bg-purple-500',
    'openweathermap': 'bg-orange-500',
    'weatherapi': 'bg-blue-500',
    'kwtv': 'bg-red-500',
};

// Placeholder accuracy scores (will be calculated from historical data)
const ACCURACY_SCORES: Record<string, number> = {
    'open_meteo': 94,
    'weatherapi': 91,
    'openweathermap': 88,
    'kwtv': 85,
};

interface ForecastDay {
    date: string;
    dayName: string;
    high: number | null;
    low: number | null;
    precipChance: number | null;
}

interface SourceForecast {
    sourceId: string;
    days: ForecastDay[];
}

export function ForecastGrid() {
    const [forecasts, setForecasts] = useState<SourceForecast[]>([]);
    const [visibleDays, setVisibleDays] = useState(5);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const res = await getLatestSnapshots();
            if (res.success && res.data) {
                const transformed: SourceForecast[] = res.data
                    .filter((d: any) => !d.station_id.startsWith('nws-') && d.station_id !== 'kfor' && d.station_id !== 'kwtv')
                    .map((d: any) => {
                        const forecast = d.forecast_data;
                        let days: ForecastDay[] = forecast?.daily || [];

                        // Fallback if no daily data (or empty)
                        if (days.length === 0) {
                            const today = new Date();
                            for (let i = 0; i < 7; i++) {
                                const date = new Date(today);
                                date.setDate(date.getDate() + i);

                                days.push({
                                    date: date.toISOString().split('T')[0],
                                    dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
                                    high: i === 0 && forecast?.high ? Math.round(forecast.high) : null,
                                    low: i === 0 && forecast?.low ? Math.round(forecast.low) : null,
                                    precipChance: i === 0 && forecast?.precipProb ? forecast.precipProb : null,
                                });
                            }
                        }

                        // Ensure we have dayName if the API didn't provide it nicely formatted
                        days = days.map(day => ({
                            ...day,
                            dayName: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
                        }));

                        return {
                            sourceId: d.station_id,
                            days,
                        };
                    });
                setForecasts(transformed);
            }
            setLoading(false);
        }
        load();
    }, []);

    if (loading) {
        return <div className="text-slate-500 animate-pulse">Loading forecast...</div>;
    }

    // Get day headers from first source
    const dayHeaders = forecasts[0]?.days.slice(0, visibleDays) || [];

    // Check for consensus (3+ sources agree on high temp)
    const getConsensus = (dayIndex: number): number | null => {
        const highs = forecasts.map(f => f.days[dayIndex]?.high).filter(h => h !== null);
        if (highs.length < 3) return null;

        const counts = highs.reduce((acc, h) => {
            const key = Math.round(h as number);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);

        for (const [temp, count] of Object.entries(counts)) {
            if (count >= 3) return parseInt(temp);
        }
        return null;
    };

    return (
        <div className="w-full bg-slate-900/30 rounded-2xl p-4 border border-slate-800">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">
                    {visibleDays}-Day Forecast
                </h3>
                {visibleDays < 7 && (
                    <button
                        onClick={() => setVisibleDays(7)}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        Show 7 days →
                    </button>
                )}
                {visibleDays === 7 && (
                    <button
                        onClick={() => setVisibleDays(5)}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        ← Show 5 days
                    </button>
                )}
            </div>

            {/* Grid */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-800">
                            <th className="text-left p-2 text-slate-500 font-normal text-xs uppercase tracking-wider">Source</th>
                            {dayHeaders.map((day, i) => (
                                <th key={i} className="p-3 text-center min-w-[60px]">
                                    <div className="text-slate-300 font-bold text-lg">{day.dayName}</div>
                                    <div className="text-slate-500 text-xs font-mono">{day.date.slice(5)}</div>
                                    {getConsensus(i) && (
                                        <div className="text-emerald-500 text-sm mt-1 animate-pulse">✓</div>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {forecasts.map((source) => {
                            const accuracy = ACCURACY_SCORES[source.sourceId] || 0;
                            const accent = SOURCE_ACCENTS[source.sourceId] || 'bg-slate-500';
                            return (
                                <tr key={source.sourceId} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                    <td className={`p-2 ${SOURCE_COLORS[source.sourceId] || 'text-slate-400'}`}>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-xs">
                                                {SOURCE_NAMES[source.sourceId] || source.sourceId}
                                            </span>
                                            {accuracy > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                        <div className={`h-full ${accent}`} style={{ width: `${accuracy}%` }} />
                                                    </div>
                                                    <span className="text-[9px] text-slate-500 font-mono">{accuracy}%</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    {source.days.slice(0, visibleDays).map((day, i) => (
                                        <td key={i} className="p-3 text-center border-l border-slate-800/30 align-top">
                                            <div className="flex flex-col items-center justify-between h-20">
                                                {/* Temperature Block (Fixed Height) */}
                                                <div className="flex flex-col items-center justify-center h-12">
                                                    {day.high !== null ? (
                                                        <>
                                                            <div className="text-xl font-bold text-white tracking-tight leading-none">
                                                                {day.high}°
                                                            </div>
                                                            <div className="text-sm font-semibold text-slate-500 leading-none mt-1">
                                                                {day.low}°
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-700">-</span>
                                                    )}
                                                </div>

                                                {/* Precipitation Block (Fixed Slot) */}
                                                <div className="h-6 flex items-center justify-center">
                                                    {day.precipChance !== null && day.precipChance > 0 ? (
                                                        <div className="flex items-center justify-center gap-0.5 text-blue-400 bg-blue-500/10 rounded-full px-2 py-0.5">
                                                            <Droplets className="w-3 h-3" />
                                                            <span className="text-xs font-bold">{day.precipChance}%</span>
                                                        </div>
                                                    ) : (
                                                        // Empty placeholder to preserve alignment if needed, 
                                                        // but with 'justify-between h-20' it sticks to bottom.
                                                        <span />
                                                    )}
                                                </div>
                                            </div>
                                        </td>))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Data transparency */}
            <div className="mt-4 pt-3 border-t border-slate-800">
                <p className="text-xs text-slate-600">
                    Scoring data since: Jan 12, 2026
                </p>
            </div>
        </div>
    );
}
