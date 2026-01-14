"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Map as MapIcon, ShieldAlert, Radio } from "lucide-react";
import { CITIES } from "@/config/cities";

export default function NationwidePage() {
    // US Center Coordinates (approximate) for default view
    const US_CENTER = { lat: 39.8283, lng: -98.5795 };

    return (
        <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-emerald-500/30">

            {/* Header / Navigation Bar */}
            <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <Link
                        href="/weatherwars"
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-mono text-sm tracking-wider">RETURN TO FRONT</span>
                    </Link>
                    <div className="h-6 w-px bg-slate-800 mx-2" />
                    <h1 className="text-xl md:text-2xl font-black tracking-tighter text-emerald-500 uppercase flex items-center gap-3">
                        <MapIcon className="w-6 h-6" />
                        Command Center // NATIONWIDE
                    </h1>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 animate-pulse">
                        <Radio className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-bold text-red-400 tracking-widest uppercase">Live Uplink</span>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex flex-grow overflow-hidden relative">

                {/* Left Sidebar: Active Fronts */}
                <aside className="w-80 bg-slate-900/50 border-r border-slate-800 flex flex-col backdrop-blur-sm z-10 absolute md:relative h-full -translate-x-full md:translate-x-0 transition-transform duration-300">
                    <div className="p-5 border-b border-slate-800">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Active Fronts</h2>
                        <p className="text-[10px] text-slate-600 font-mono">MONITORING {CITIES.length} STRATEGIC ZONES</p>
                    </div>

                    <div className="flex-col overflow-y-auto custom-scrollbar p-3 gap-2 flex">
                        {CITIES.map((city) => (
                            <div
                                key={city.id}
                                className="group flex flex-col p-4 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-800 hover:border-emerald-500/30 transition-all cursor-not-allowed opacity-75 hover:opacity-100"
                                title="Local Uplink Coming Soon"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-lg text-slate-200 tracking-tight group-hover:text-emerald-400 transition-colors">
                                        {city.name}
                                    </span>
                                    {city.id === 'okc' && (
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wide border border-emerald-500/20">
                                            HQ
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                                    <span>LAT: {city.coords.lat.toFixed(2)}</span>
                                    <span className="text-slate-700">|</span>
                                    <span>LON: {city.coords.lng.toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto p-5 border-t border-slate-800 bg-slate-900/80">
                        <div className="flex items-center gap-3 text-slate-500">
                            <ShieldAlert className="w-8 h-8 opacity-50" />
                            <div className="flex flex-col">
                                <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">System Status</span>
                                <span className="text-[10px] font-mono text-emerald-500/80">ALL SENSORS ONLINE</span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Map Viewport */}
                <main className="flex-grow relative bg-black">
                    <iframe
                        src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=in&metricTemp=°F&metricWind=mph&zoom=4&overlay=radar&product=radar&level=surface&lat=${US_CENTER.lat}&lon=${US_CENTER.lng}&detailLat=${US_CENTER.lat}&detailLon=${US_CENTER.lng}&marker=false&message=true`}
                        className="w-full h-full border-none"
                        title="Nationwide Radar"
                        allowFullScreen
                    />

                    {/* Overlay Grid Effect */}
                    <div className="absolute inset-0 pointer-events-none bg-[url('/grid-pattern.svg')] opacity-5" />
                    <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />
                </main>

            </div>
        </div>
    );
}
