'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="w-full h-screen flex flex-col md:flex-row bg-black overflow-hidden font-sans">

      {/* LEFT: Weather Wars */}
      <Link href="/weatherwars" className="group relative flex-1 h-1/3 md:h-full border-b md:border-b-0 md:border-r border-slate-800 hover:flex-[1.2] transition-all duration-500 ease-out overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-slate-900 group-hover:bg-slate-800 transition-colors duration-500">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:16px_16px]" />
        </div>

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <span className="text-blue-400 tracking-[0.3em] text-xs font-bold uppercase mb-3 block">Operation Skywatch</span>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-2 group-hover:scale-105 transition-transform duration-300">WEATHER WARS</h2>
            <p className="text-slate-400 max-w-xs mx-auto mt-3 text-sm leading-relaxed hidden md:block">
              The War Room. Four forecasts enter, one truth leaves.
            </p>
            <div className="mt-6 px-5 py-2 border border-blue-500/30 text-blue-400 rounded-full text-xs font-bold bg-blue-500/10 group-hover:bg-blue-500 group-hover:text-white transition-all">
              ENTER DASHBOARD
            </div>
          </motion.div>
        </div>

        {/* Decoration */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-transparent opacity-50" />
      </Link>

      {/* CENTER: ezzackly */}
      <Link href="/ezzackly" className="group relative flex-1 h-1/3 md:h-full border-b md:border-b-0 md:border-r border-slate-800 hover:flex-[1.2] transition-all duration-500 ease-out overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-[#F9F7F2] group-hover:bg-[#F7E7CE] transition-colors duration-500">
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#D4A5A5_1.5px,transparent_1.5px)] [background-size:20px_20px]" />
        </div>

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-[#C5A065] tracking-[0.3em] text-xs font-bold uppercase mb-3 block">fiber arts + gaming</span>
            <h2 className="text-3xl md:text-5xl font-black text-[#3C2415] mb-2 group-hover:scale-105 transition-transform duration-300" style={{ fontFamily: "'Playfair Display', serif" }}>ezzackly</h2>
            <p className="text-[#3C2415]/60 max-w-xs mx-auto mt-3 text-sm leading-relaxed hidden md:block" style={{ fontFamily: "'Lato', sans-serif" }}>
              Knitting calculators. Crochet tools. Cozy utilities.
            </p>
            <div className="mt-6 px-5 py-2 border border-[#D4A5A5]/50 text-[#3C2415] rounded-full text-xs font-bold bg-[#D4A5A5]/20 group-hover:bg-[#D4A5A5] group-hover:text-white transition-all">
              ENTER STUDIO
            </div>
          </motion.div>
        </div>

        {/* Decoration */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-[#D4A5A5] via-[#C5A065] to-transparent opacity-50" />
      </Link>

      {/* RIGHT: Junk Drawer (Trench Run + Void Typer) */}
      <div className="relative flex-1 h-1/3 md:h-full flex flex-col overflow-hidden">
        {/* Top: Trench Run */}
        <Link href="/trench-run" className="group relative flex-1 border-b border-slate-800 hover:flex-[1.1] transition-all duration-300 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-black group-hover:bg-neutral-900 transition-colors duration-500">
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] [background-size:24px_24px]" />
          </div>

          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-10">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <span className="text-amber-500 tracking-[0.2em] text-[10px] font-bold uppercase mb-2 block">Targeting Computer</span>
              <h2 className="text-xl md:text-2xl font-black text-white group-hover:scale-105 transition-transform duration-300 font-mono tracking-tighter">TRENCH RUN</h2>
              <div className="mt-3 px-4 py-1.5 border border-amber-500/30 text-amber-500 rounded text-[10px] font-bold bg-amber-500/10 group-hover:bg-amber-500 group-hover:text-black transition-all font-mono">
                INITIATE
              </div>
            </motion.div>
          </div>

          {/* Decoration */}
          <div className="absolute top-0 right-0 w-full h-0.5 bg-gradient-to-l from-amber-500 via-red-500 to-transparent opacity-50" />
        </Link>

        {/* Bottom: Void Typer */}
        <div className="group relative flex-1 hover:flex-[1.1] transition-all duration-300 overflow-hidden flex items-center justify-center p-6">
          {/* JUNK DRAWER panel */}
          <div className="flex-1 bg-zinc-900/50 rounded-2xl p-6 border border-white/5 relative group overflow-hidden">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none" />
            <h2 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Junk Drawer</h2>
            <ul className="space-y-3">
              <li>
                <Link href="/trenchrun" className="flex items-center justify-between group/link">
                  <span className="text-zinc-300 font-mono text-sm group-hover/link:text-[#FF5E5B] transition-colors">TRENCH_RUN.exe</span>
                  <span className="text-xs text-zinc-600">v1.0</span>
                </Link>
              </li>
              <li>
                <Link href="/voidtyper" className="flex items-center justify-between group/link">
                  <span className="text-zinc-300 font-mono text-sm group-hover/link:text-white transition-colors">VOID_TYPER</span>
                  <span className="text-xs text-zinc-600">v1.0</span>
                </Link>
              </li>
              <li>
                <Link href="/chronicles" className="flex items-center justify-between group/link">
                  <span className="text-zinc-500 font-mono text-sm group-hover/link:text-green-500 transition-colors">CHRONICLES.log</span>
                  <span className="text-[10px] text-zinc-700 border border-zinc-800 px-1 rounded">LOCKED</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* CENTER: Phloid Identity */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none hidden md:flex">
        <div className="w-14 h-14 bg-black rounded-full border-2 border-slate-700 flex items-center justify-center shadow-xl">
          <span className="text-slate-500 font-bold text-xs lowercase">phloid</span>
        </div>
      </div>

    </div>
  );
}
