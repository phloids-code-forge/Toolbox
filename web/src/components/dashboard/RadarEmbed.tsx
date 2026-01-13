"use client";

import { useState } from "react";
import { X, Maximize2 } from "lucide-react";
import { ACTIVE_CITY } from "@/config/app";

export function RadarEmbed() {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const { lat, lng } = ACTIVE_CITY.coords;
    const embedUrl = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=in&metricTemp=°F&metricWind=mph&zoom=7&overlay=radar&product=radar&level=surface&lat=${lat}&lon=${lng}&detailLat=${lat}&detailLon=${lng}&marker=true&message=true`;

    // Compact thumbnail view
    if (!isFullscreen) {
        return (
            <div
                onClick={() => setIsFullscreen(true)}
                className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-800 bg-slate-900/30 cursor-pointer group hover:border-slate-600 transition-all"
            >
                <div className="absolute top-2 left-3 z-10 bg-black/70 px-2 py-1 rounded text-[10px] text-slate-400 font-bold uppercase tracking-wide flex items-center gap-1">
                    <span>Live Radar</span>
                    <Maximize2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-[5] group-hover:opacity-50 transition-opacity" />
                <iframe
                    src={embedUrl}
                    className="w-full h-full pointer-events-none"
                    frameBorder="0"
                    title="Weather Radar Preview"
                />
            </div>
        );
    }

    // Fullscreen overlay
    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-black border-b border-slate-800">
                <span className="text-slate-400 font-bold uppercase tracking-wide text-sm">
                    Live Radar — {ACTIVE_CITY.name}
                </span>
                <button
                    onClick={() => setIsFullscreen(false)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                    <X className="w-5 h-5 text-slate-300" />
                </button>
            </div>

            {/* Full radar */}
            <div className="flex-grow">
                <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    frameBorder="0"
                    title="Weather Radar"
                    allowFullScreen
                />
            </div>
        </div>
    );
}
