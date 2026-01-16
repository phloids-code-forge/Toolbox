"use client";

import { Sprout, Droplets, ThermometerSun } from "lucide-react";

interface GreenThumbProps {
    soilTemp?: number;
    soilMoisture?: number;
    daily?: any[];
}

export function GreenThumbPanel({ soilTemp, soilMoisture, daily, onExplain }: {
    soilTemp?: number;
    soilMoisture?: number;
    daily?: any[];
    onExplain: (topic: string) => void;
}) {

    // Logic: Morel Hunting (50-58F)
    const sTemp = soilTemp; // Undefined if missing
    const isMorelSeason = sTemp !== undefined && sTemp >= 50 && sTemp <= 60;

    // Logic: Watering
    const moisture = soilMoisture ?? 0;
    const isDry = moisture < 0.25;

    // console.log("[GreenThumb] Props:", { soilTemp, soilMoisture });

    return (
        <div className="flex flex-col gap-3 h-full bg-slate-900/30 border border-slate-800/50 rounded-2xl p-4 overflow-hidden">
            <div className="flex items-center gap-2 mb-1">
                <Sprout className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Green Thumb</h3>
            </div>

            {/* MOREL METER */}
            <div
                onClick={() => onExplain('soil_temp')}
                className={`relative flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer group active:scale-95 ${isMorelSeason
                    ? "bg-emerald-900/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                    : "bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600"
                    }`}>
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Morel Radar</span>
                    <span className={`text-sm font-bold ${isMorelSeason ? "text-emerald-300" : "text-slate-400"}`}>
                        {(sTemp !== undefined && sTemp !== null) ? `${sTemp.toFixed(1)}°F` : '--'}
                    </span>
                </div>
                {isMorelSeason ? (
                    <div className="animate-pulse text-xs font-bold text-emerald-400 border border-emerald-400/50 px-2 py-1 rounded bg-emerald-400/10">
                        GO HUNT!
                    </div>
                ) : (
                    <span className="text-[10px] text-slate-600">Target: 50°-58°</span>
                )}
            </div>

            {/* SOIL MOISTURE */}
            <div
                onClick={() => onExplain('soil_moisture')}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 cursor-pointer hover:bg-slate-800/50 hover:border-slate-600 transition-all active:scale-95 group">
                <div className="p-2 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition-colors">
                    <Droplets className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-slate-300 transition-colors">Soil Moisture ℹ️</span>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-300">{moisture > 0 ? `${(moisture * 100).toFixed(0)}%` : '--'}</span>
                        {isDry && <span className="text-[10px] text-orange-400 font-bold">NEEDS WATER</span>}
                    </div>
                </div>
            </div>

            {/* FROST CHECK (Tomorrow Low) */}
            {daily && daily.length > 1 && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/50">
                    <div className="p-2 bg-red-500/10 rounded-full">
                        <ThermometerSun className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Frost Risk (yest/tom)</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-300">
                                L: {daily[1].low ? Math.round(daily[1].low) : '--'}°
                            </span>
                            {daily[1].low && daily[1].low <= 32 && (
                                <span className="text-[10px] text-red-300 font-bold break-words">COVER PLANTS!</span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
