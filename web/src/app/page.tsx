'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="w-full h-screen flex flex-col md:flex-row bg-black overflow-hidden font-sans">

      {/* LEFT: Weather Wars (Civilian) */}
      <Link href="/weatherwars" className="group relative flex-grow h-1/2 md:h-full md:w-1/2 border-r-0 md:border-r border-slate-800 hover:w-[55%] transition-all duration-500 ease-out overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-slate-900 group-hover:bg-slate-800 transition-colors duration-500">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:16px_16px]" />
        </div>

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-10">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <span className="text-blue-400 tracking-[0.3em] text-xs font-bold uppercase mb-4 block">Operation Skywatch</span>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-2 group-hover:scale-105 transition-transform duration-300">WEATHER WARS</h2>
            <p className="text-slate-400 max-w-sm mx-auto mt-4 text-sm leading-relaxed">
              The War Room. Four forecasts enter, one truth leaves. Track accuracy, reliability, and bias in real-time.
            </p>
            <div className="mt-8 px-6 py-2 border border-blue-500/30 text-blue-400 rounded-full text-xs font-bold bg-blue-500/10 group-hover:bg-blue-500 group-hover:text-white transition-all">
              ENTER DASHBOARD
            </div>
          </motion.div>
        </div>

        {/* Decoration */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-transparent opacity-50" />
      </Link>

      {/* CENTER: Phloid Identity */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
        <div className="w-16 h-16 bg-black rounded-full border-2 border-slate-700 flex items-center justify-center shadow-xl">
          <span className="text-slate-500 font-bold text-xs lowercase">phloid</span>
        </div>
      </div>

      {/* RIGHT: Trench Run (Military) */}
      <Link href="/trench-run" className="group relative flex-grow h-1/2 md:h-full md:w-1/2 hover:w-[55%] transition-all duration-500 ease-out overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-black group-hover:bg-neutral-900 transition-colors duration-500">
          <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-10">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-amber-500 tracking-[0.3em] text-xs font-bold uppercase mb-4 block">Targeting Computer</span>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-2 group-hover:scale-105 transition-transform duration-300 font-mono tracking-tighter">TRENCH RUN</h2>
            <p className="text-neutral-500 max-w-sm mx-auto mt-4 text-sm leading-relaxed font-mono">
              Retro UI Generator. Vector targeting systems, CRT simulation, and customizable motion graphics.
            </p>
            <div className="mt-8 px-6 py-2 border border-amber-500/30 text-amber-500 rounded text-xs font-bold bg-amber-500/10 group-hover:bg-amber-500 group-hover:text-black transition-all font-mono">
              INITIATE SEQUENCE
            </div>
          </motion.div>
        </div>

        {/* Decoration */}
        <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-amber-500 via-red-500 to-transparent opacity-50" />
      </Link>

    </div>
  );
}
