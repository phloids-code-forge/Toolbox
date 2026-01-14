"use client";

import Link from "next/link";
import { Zap, Heart } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center relative overflow-hidden selection:bg-red-500/30 transition-colors duration-300">

      {/* Background Ambience - Dark only */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900/50 via-transparent to-transparent z-0 pointer-events-none dark:from-slate-900/50 dark:via-black dark:to-black" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 dark:opacity-20 z-0 pointer-events-none mix-blend-overlay" />

      {/* Header / Brand + Theme Toggle */}
      <div className="absolute top-8 left-8 z-10">
        <h1 className="text-[var(--text-muted)] font-mono text-sm tracking-[0.3em] uppercase opacity-70">
          Phloid // OS
        </h1>
      </div>
      <div className="absolute top-8 right-8 z-10">
        <ThemeToggle />
      </div>

      <div className="z-10 flex flex-col items-center gap-12">

        {/* The Portal Grid */}
        <div className="grid grid-cols-1 gap-8">

          {/* GIANT RED BUTTON */}
          <Link href="/weatherwars" className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />
            <div className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px] bg-[var(--background)] border border-red-500/20 rounded-2xl flex flex-col items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-[0_0_50px_-10px_rgba(220,38,38,0.15)] group-hover:shadow-[0_0_100px_-20px_rgba(220,38,38,0.5)]">

              <div className="bg-red-600 text-white rounded-full p-6 shadow-xl group-hover:animate-pulse">
                <Zap className="w-12 h-12 md:w-16 md:h-16" fill="currentColor" />
              </div>

              <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-[var(--text-primary)] to-[var(--text-muted)] group-hover:to-[var(--text-primary)] transition-all duration-500 uppercase">
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
          <div className="w-24 h-24 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center">
            <span className="text-4xl text-[var(--text-muted)]">+</span>
          </div>
          <div className="w-24 h-24 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center">
            <span className="text-4xl text-[var(--text-muted)]">+</span>
          </div>
        </div>

      </div>

      {/* Footer System Status + Ko-fi */}
      <div className="absolute bottom-6 w-full flex flex-col items-center gap-3 z-10">
        <a
          href="https://ko-fi.com/phloid"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface)] border border-[var(--border)] hover:border-pink-500/50 hover:bg-pink-500/10 transition-all duration-300 group"
        >
          <Heart className="w-4 h-4 text-pink-500 group-hover:fill-pink-500 transition-all" />
          <span className="text-xs font-mono text-[var(--text-secondary)] group-hover:text-pink-400 transition-colors">Support</span>
        </a>
        <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">
          System Online • v2.0.0
        </p>
      </div>

    </main>
  );
}


