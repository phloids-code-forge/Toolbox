"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export function DashboardHeader() {
    return (
        <header className="flex items-center justify-between px-4 py-4 md:px-8 border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-sm z-50">

            {/* Left: Interactive Branding / Home Link */}
            <Link href="/" className="group flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 border border-slate-800 group-hover:border-emerald-500/50 transition-all duration-300">
                    <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-emerald-400 transition-colors">
                        Return to
                    </span>
                    <span className="text-sm font-black text-slate-300 uppercase tracking-tighter group-hover:text-white transition-colors">
                        War Room
                    </span>
                </div>
            </Link>

            {/* Right: Controls */}
            <div className="flex items-center gap-4">
                <div className="hidden md:flex flex-col items-end mr-4">
                    <span className="text-[10px] font-mono text-emerald-500/80 uppercase tracking-widest animate-pulse">
                        Secure Uplink Active
                    </span>
                </div>
                <ThemeToggle />
            </div>

        </header>
    );
}
