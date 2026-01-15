'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import HookChart from './components/HookChart';
import AbbrevDecoder from './components/AbbrevDecoder';
import SentroSizer from './components/SentroSizer';
import ZenCounter from './components/ZenCounter';
import GaugeConverter from './components/GaugeConverter';

type Tool = 'hook' | 'abbrev' | 'sentro' | 'counter' | 'gauge';

const tools: { id: Tool; name: string; icon: string; desc: string }[] = [
    { id: 'hook', name: 'Hook Chart', icon: '🪝', desc: 'Size conversions' },
    { id: 'abbrev', name: 'Abbreviations', icon: '📖', desc: 'Pattern decoder' },
    { id: 'sentro', name: 'Sentro Sizer', icon: '🧢', desc: 'Hat calculator' },
    { id: 'counter', name: 'Zen Counter', icon: '🔢', desc: 'ASMR counter' },
    { id: 'gauge', name: 'Gauge', icon: '📏', desc: 'Converter' },
];

export default function EzzacklyStudio() {
    const [activeTool, setActiveTool] = useState<Tool>('sentro');

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F9F7F2] via-[#FBF9F6] to-[#F7E7CE]">
            {/* Decorative background pattern */}
            <div
                className="fixed inset-0 opacity-[0.02] pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(#D4A5A5 1px, transparent 1px)`,
                    backgroundSize: '32px 32px',
                }}
            />

            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#F9F7F2]/80 border-b border-[#E8D5D5]/50">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link
                        href="/"
                        className="text-[#3C2415]/40 hover:text-[#D4A5A5] transition-colors text-sm flex items-center gap-2"
                    >
                        <motion.span whileHover={{ x: -3 }}>←</motion.span>
                        <span className="hidden sm:inline">phloid.com</span>
                    </Link>

                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-center"
                    >
                        <h1
                            className="text-2xl sm:text-3xl font-bold text-[#3C2415]"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                            ezzackly
                        </h1>
                        <p className="text-[#C5A065] text-[10px] tracking-[0.3em] uppercase">fiber arts studio</p>
                    </motion.div>

                    <div className="w-16" /> {/* Spacer for centering */}
                </div>
            </header>

            {/* Tool Navigation */}
            <nav className="max-w-4xl mx-auto px-4 py-6">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide justify-center flex-wrap"
                >
                    {tools.map((tool, index) => (
                        <motion.button
                            key={tool.id}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                            onClick={() => setActiveTool(tool.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`flex-shrink-0 px-4 py-3 rounded-2xl transition-all duration-300 flex items-center gap-2 ${activeTool === tool.id
                                    ? 'bg-gradient-to-br from-[#D4A5A5] to-[#C5A065] text-white shadow-lg shadow-[#D4A5A5]/30'
                                    : 'bg-white/80 text-[#3C2415] hover:bg-white border border-[#E8D5D5]/50 hover:border-[#D4A5A5]/30 hover:shadow-md'
                                }`}
                        >
                            <span className="text-lg">{tool.icon}</span>
                            <span className="font-medium text-sm">{tool.name}</span>
                        </motion.button>
                    ))}
                </motion.div>
            </nav>

            {/* Tool Content */}
            <main className="max-w-4xl mx-auto px-4 pb-16">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTool}
                        initial={{ opacity: 0, y: 30, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.98 }}
                        transition={{
                            duration: 0.4,
                            ease: [0.23, 1, 0.32, 1]
                        }}
                    >
                        {activeTool === 'hook' && <HookChart />}
                        {activeTool === 'abbrev' && <AbbrevDecoder />}
                        {activeTool === 'sentro' && <SentroSizer />}
                        {activeTool === 'counter' && <ZenCounter />}
                        {activeTool === 'gauge' && <GaugeConverter />}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Footer */}
            <footer className="border-t border-[#E8D5D5]/50 py-8 bg-white/30 backdrop-blur-sm">
                <div className="text-center">
                    <p className="text-[#3C2415]/30 text-sm">
                        made with <span className="text-[#D4A5A5]">🧶</span> for ezzackly
                    </p>
                    <p className="text-[#C5A065]/50 text-xs mt-1">
                        part of the phloid workshop
                    </p>
                </div>
            </footer>
        </div>
    );
}
