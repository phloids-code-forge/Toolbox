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
        <Link href="/voidtyper" className="group relative flex-1 hover:flex-[1.1] transition-all duration-300 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-black group-hover:bg-neutral-950 transition-colors duration-500" />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-10">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <span className="text-white/30 tracking-[0.2em] text-[10px] font-bold uppercase mb-2 block">Catharsis Engine</span>
              <h2 className="text-xl md:text-2xl font-black text-white/80 group-hover:scale-105 transition-transform duration-300" style={{ fontFamily: "'Playfair Display', serif" }}>void typer</h2>
              <div className="mt-3 px-4 py-1.5 border border-white/20 text-white/50 rounded-full text-[10px] font-bold bg-white/5 group-hover:bg-white group-hover:text-black transition-all">
                RELEASE
              </div>
            </motion.div>
          </div>

          {/* Breathing guide hint */}
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.1, 0.05] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-32 h-32 rounded-full border border-white/10" />
          </motion.div>
        </Link>
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
