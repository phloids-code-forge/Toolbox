'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';

const abbreviations = [
    { abbr: 'ch', meaning: 'chain' },
    { abbr: 'sl st', meaning: 'slip stitch' },
    { abbr: 'sc', meaning: 'single crochet' },
    { abbr: 'hdc', meaning: 'half double crochet' },
    { abbr: 'dc', meaning: 'double crochet' },
    { abbr: 'tr', meaning: 'treble crochet' },
    { abbr: 'dtr', meaning: 'double treble crochet' },
    { abbr: 'sk', meaning: 'skip' },
    { abbr: 'sp', meaning: 'space' },
    { abbr: 'st(s)', meaning: 'stitch(es)' },
    { abbr: 'yo', meaning: 'yarn over' },
    { abbr: 'inc', meaning: 'increase' },
    { abbr: 'dec', meaning: 'decrease' },
    { abbr: 'BLO', meaning: 'back loop only' },
    { abbr: 'FLO', meaning: 'front loop only' },
    { abbr: 'RS', meaning: 'right side' },
    { abbr: 'WS', meaning: 'wrong side' },
    { abbr: 'rep', meaning: 'repeat' },
    { abbr: 'tog', meaning: 'together' },
    { abbr: 'PM', meaning: 'place marker' },
    { abbr: 'MC', meaning: 'main color' },
    { abbr: 'CC', meaning: 'contrasting color' },
    { abbr: 'rnd', meaning: 'round' },
    { abbr: 'beg', meaning: 'beginning' },
    { abbr: 'alt', meaning: 'alternate' },
    { abbr: 'approx', meaning: 'approximately' },
    { abbr: 'cont', meaning: 'continue' },
    { abbr: 'rem', meaning: 'remaining' },
    { abbr: 'tch', meaning: 'turning chain' },
    { abbr: 'WIP', meaning: 'work in progress' },
];

export default function AbbrevDecoder() {
    const [search, setSearch] = useState('');

    const filtered = abbreviations.filter(
        (a) =>
            a.abbr.toLowerCase().includes(search.toLowerCase()) ||
            a.meaning.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-[#D4A5A5]/10 border border-[#E8D5D5]/50 overflow-hidden">
            <div className="p-6 border-b border-[#E8D5D5]/50 bg-gradient-to-r from-[#F7E7CE]/30 to-transparent">
                <h2
                    className="text-2xl font-bold text-[#3C2415]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                    Pattern Abbreviations
                </h2>
                <p className="text-[#3C2415]/50 mt-1 text-sm">Decode crochet and knitting shorthand</p>

                <div className="mt-4 relative">
                    <input
                        type="text"
                        placeholder="Search abbreviations..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-4 py-3 pl-10 rounded-xl border-2 border-[#E8D5D5] focus:border-[#D4A5A5] focus:ring-4 focus:ring-[#D4A5A5]/10 outline-none transition-all text-[#3C2415] bg-white"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3C2415]/30">🔍</span>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((item, idx) => (
                    <motion.div
                        key={item.abbr}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="p-4 rounded-2xl bg-gradient-to-br from-[#F7E7CE]/50 to-white hover:from-[#D4A5A5]/10 hover:to-white transition-all duration-300 border border-[#E8D5D5]/30 hover:border-[#D4A5A5]/30 hover:shadow-lg hover:shadow-[#D4A5A5]/10 cursor-default"
                    >
                        <span
                            className="text-lg font-bold text-[#D4A5A5]"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                            {item.abbr}
                        </span>
                        <span className="text-[#C5A065] mx-2">→</span>
                        <span className="text-[#3C2415]/80">{item.meaning}</span>
                    </motion.div>
                ))}
                {filtered.length === 0 && (
                    <div className="col-span-full text-center text-[#3C2415]/40 py-12">
                        No abbreviations found
                    </div>
                )}
            </div>
        </div>
    );
}
