'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function GaugeConverter() {
    const [inches, setInches] = useState('4');
    const [stitches, setStitches] = useState('20');

    const inchesNum = parseFloat(inches) || 0;
    const stitchesNum = parseFloat(stitches) || 0;

    const cm = (inchesNum * 2.54).toFixed(2);
    const stitchesPer10cm = inchesNum > 0 ? ((stitchesNum / inchesNum) * (10 / 2.54)).toFixed(1) : '—';
    const stitchesPerInch = inchesNum > 0 ? (stitchesNum / inchesNum).toFixed(1) : '—';

    return (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-[#D4A5A5]/10 border border-[#E8D5D5]/50 overflow-hidden">
            <div className="p-6 border-b border-[#E8D5D5]/50 bg-gradient-to-r from-[#F7E7CE]/30 to-transparent">
                <h2
                    className="text-2xl font-bold text-[#3C2415]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                    Gauge Converter
                </h2>
                <p className="text-[#3C2415]/50 mt-1 text-sm">Convert between measurement systems</p>
            </div>

            <div className="p-6 space-y-8">
                {/* Inputs */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[#3C2415]/70 mb-2 uppercase tracking-wider">
                            Swatch Width
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.5"
                                value={inches}
                                onChange={(e) => setInches(e.target.value)}
                                className="w-full px-4 py-4 pr-16 rounded-xl border-2 border-[#E8D5D5] focus:border-[#D4A5A5] focus:ring-4 focus:ring-[#D4A5A5]/10 outline-none transition-all text-[#3C2415] text-xl font-medium bg-white"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3C2415]/40 text-sm">
                                inches
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#3C2415]/70 mb-2 uppercase tracking-wider">
                            Stitches
                        </label>
                        <input
                            type="number"
                            value={stitches}
                            onChange={(e) => setStitches(e.target.value)}
                            className="w-full px-4 py-4 rounded-xl border-2 border-[#E8D5D5] focus:border-[#D4A5A5] focus:ring-4 focus:ring-[#D4A5A5]/10 outline-none transition-all text-[#3C2415] text-xl font-medium bg-white"
                        />
                    </div>
                </div>

                {/* Results */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="p-5 rounded-2xl bg-gradient-to-br from-[#F7E7CE]/50 to-white text-center border border-[#E8D5D5]/30 hover:shadow-lg hover:shadow-[#D4A5A5]/10 transition-all duration-300"
                    >
                        <motion.div
                            key={cm}
                            initial={{ scale: 0.9, opacity: 0.5 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-3xl font-bold text-[#D4A5A5]"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                            {cm}
                        </motion.div>
                        <div className="text-sm text-[#3C2415]/50 mt-1">centimeters</div>
                    </motion.div>

                    <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="p-5 rounded-2xl bg-gradient-to-br from-[#F7E7CE]/50 to-white text-center border border-[#E8D5D5]/30 hover:shadow-lg hover:shadow-[#D4A5A5]/10 transition-all duration-300"
                    >
                        <motion.div
                            key={stitchesPerInch}
                            initial={{ scale: 0.9, opacity: 0.5 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-3xl font-bold text-[#D4A5A5]"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                            {stitchesPerInch}
                        </motion.div>
                        <div className="text-sm text-[#3C2415]/50 mt-1">stitches/inch</div>
                    </motion.div>

                    <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="p-5 rounded-2xl bg-gradient-to-br from-[#F7E7CE]/50 to-white text-center border border-[#E8D5D5]/30 hover:shadow-lg hover:shadow-[#D4A5A5]/10 transition-all duration-300"
                    >
                        <motion.div
                            key={stitchesPer10cm}
                            initial={{ scale: 0.9, opacity: 0.5 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-3xl font-bold text-[#D4A5A5]"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                            {stitchesPer10cm}
                        </motion.div>
                        <div className="text-sm text-[#3C2415]/50 mt-1">stitches/10cm</div>
                    </motion.div>
                </div>

                {/* Quick Reference */}
                <div className="text-center text-[#3C2415]/30 text-sm font-mono">
                    1 inch = 2.54 cm
                </div>
            </div>
        </div>
    );
}
