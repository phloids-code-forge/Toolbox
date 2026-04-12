'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="w-full h-screen flex flex-col md:flex-row bg-black overflow-hidden font-sans">

      {/* LEFT: Weather Wars */}
      <Link href="/weatherwars" className="group relative flex-1 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-slate-800 hover:flex-[1.2] transition-all duration-500 ease-out overflow-hidden">
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

      {/* RIGHT: Coming Soon */}
      <div className="group relative flex-1 h-1/2 md:h-full hover:flex-[1.2] transition-all duration-500 ease-out overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-black group-hover:bg-zinc-950 transition-colors duration-500">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] group-hover:opacity-20 transition-opacity duration-500" />
        </div>

        {/* Subtle glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 rounded-full bg-blue-500/5 blur-3xl group-hover:bg-blue-500/10 transition-all duration-700" />
        </div>

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span className="text-zinc-600 tracking-[0.3em] text-xs font-bold uppercase mb-3 block">Transmitting</span>
            <h2 className="text-3xl md:text-5xl font-black text-zinc-700 mb-2 group-hover:text-zinc-500 transition-colors duration-500">. . .</h2>
            <p className="text-zinc-700 max-w-xs mx-auto mt-3 text-sm leading-relaxed hidden md:block">
              Something is waking up.
            </p>
            <div className="mt-6 px-5 py-2 border border-zinc-800 text-zinc-600 rounded-full text-xs font-bold bg-zinc-900/50 cursor-default">
              COMING SOON
            </div>
          </motion.div>
        </div>

        {/* Decoration */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/30 via-cyan-500/10 to-transparent opacity-30" />
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
