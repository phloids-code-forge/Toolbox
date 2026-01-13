"use client";

import Link from "next/link";
import { Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden selection:bg-red-500/30">

      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900/50 via-black to-black z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 pointer-events-none mix-blend-overlay" />

      {/* Header / Brand */}
      <div className="absolute top-8 left-8 z-10">
        <h1 className="text-slate-500 font-mono text-sm tracking-[0.3em] uppercase opacity-50">
          Phloid // OS
        </h1>
      </div>

      <div className="z-10 flex flex-col items-center gap-12">

        {/* The Portal Grid */}
        <div className="grid grid-cols-1 gap-8">

          {/* GIANT RED BUTTON */}
          <Link href="/weatherwars" className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />
            <div className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px] bg-black border border-red-500/20 rounded-2xl flex flex-col items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-[0_0_50px_-10px_rgba(220,38,38,0.15)] group-hover:shadow-[0_0_100px_-20px_rgba(220,38,38,0.5)]">

              <div className="bg-red-600 text-white rounded-full p-6 shadow-xl group-hover:animate-pulse">
                <Zap className="w-12 h-12 md:w-16 md:h-16" fill="currentColor" />
              </div>

              <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 group-hover:to-white transition-all duration-500 uppercase">
                Weather Wars
              </h2>

              <span className="text-xs font-mono text-red-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                Enter War Room &rarr;
              </span>
            </div>
          </Link>

        </div>

        {/* Future Apps Placeholder */}
        <div className="flex gap-4 opacity-30 pointer-events-none grayscale">
          <div className="w-24 h-24 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center justify-center">
            <span className="text-4xl text-slate-700">+</span>
          </div>
          <div className="w-24 h-24 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center justify-center">
            <span className="text-4xl text-slate-700">+</span>
          </div>
        </div>

      </div>

      {/* Footer System Status */}
      <div className="absolute bottom-6 w-full text-center z-10">
        <p className="text-[10px] font-mono text-slate-700 uppercase tracking-widest">
          System Online • v2.0.0
        </p>
      </div>

    </main>
  );
}
