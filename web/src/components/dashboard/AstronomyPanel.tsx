"use client";

import { Sun, Moon, Sunrise, Sunset } from "lucide-react";

// Placeholder astronomy data - will be replaced with WeatherAPI data
export function AstronomyPanel() {
    // Mock data for now
    const astronomy = {
        sunrise: "7:32 AM",
        sunset: "5:48 PM",
        goldenHourStart: "5:15 PM",
        goldenHourEnd: "5:48 PM",
        moonPhase: "Waxing Gibbous",
        moonIllumination: 78,
    };

    return (
        <div className="bg-slate-900/30 rounded-2xl p-4 border border-slate-800">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3">
                Astronomy
            </h3>

            <div className="grid grid-cols-2 gap-3 text-sm">
                {/* Sunrise */}
                <div className="flex items-center gap-2">
                    <Sunrise className="w-4 h-4 text-orange-400" />
                    <div>
                        <div className="text-xs text-slate-500">Sunrise</div>
                        <div className="text-white font-mono">{astronomy.sunrise}</div>
                    </div>
                </div>

                {/* Sunset */}
                <div className="flex items-center gap-2">
                    <Sunset className="w-4 h-4 text-orange-500" />
                    <div>
                        <div className="text-xs text-slate-500">Sunset</div>
                        <div className="text-white font-mono">{astronomy.sunset}</div>
                    </div>
                </div>

                {/* Golden Hour */}
                <div className="flex items-center gap-2 col-span-2">
                    <Sun className="w-4 h-4 text-yellow-400" />
                    <div>
                        <div className="text-xs text-slate-500">Golden Hour</div>
                        <div className="text-yellow-300 font-mono">
                            {astronomy.goldenHourStart} - {astronomy.goldenHourEnd}
                        </div>
                    </div>
                </div>

                {/* Moon */}
                <div className="flex items-center gap-2 col-span-2">
                    <Moon className="w-4 h-4 text-slate-300" />
                    <div>
                        <div className="text-xs text-slate-500">Moon</div>
                        <div className="text-slate-200 font-mono">
                            {astronomy.moonPhase} ({astronomy.moonIllumination}%)
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
