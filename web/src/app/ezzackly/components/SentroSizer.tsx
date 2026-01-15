'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';

const headSizes = [
    { size: 'Preemie', circumference: '9–12"', height: 4 },
    { size: 'Baby', circumference: '14–16"', height: 5 },
    { size: 'Toddler', circumference: '16–18"', height: 5.5 },
    { size: 'Child', circumference: '18–20"', height: 6 },
    { size: 'Tween', circumference: '20–22"', height: 6.5 },
    { size: 'Woman', circumference: '21–23"', height: 7 },
    { size: 'Man', circumference: '22–24"', height: 7.5 },
];

export default function SentroSizer() {
    const [selectedSize, setSelectedSize] = useState(headSizes[5]); // Default: Woman
    const [gaugeRows, setGaugeRows] = useState('10');
    const [gaugeHeight, setGaugeHeight] = useState('2');

    const targetHeight = selectedSize.height;
    const rows = parseFloat(gaugeRows) || 0;
    const height = parseFloat(gaugeHeight) || 1;
    const calculatedRows = Math.ceil((targetHeight / height) * rows);

    return (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-[#D4A5A5]/10 border border-[#E8D5D5]/50 overflow-hidden">
            <div className="p-6 border-b border-[#E8D5D5]/50 bg-gradient-to-r from-[#F7E7CE]/30 to-transparent">
                <h2
                    className="text-2xl font-bold text-[#3C2415]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                    Sentro 48 Hat Sizer
                </h2>
                <p className="text-[#3C2415]/50 mt-1 text-sm">Calculate rows for machine-knit hats</p>
            </div>

            <div className="p-6 space-y-8">
                {/* Size Selector */}
                <div>
                    <label className="block text-sm font-medium text-[#3C2415]/70 mb-3 uppercase tracking-wider">
                        Select Hat Size
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {headSizes.map((s, index) => (
                            <motion.button
                                key={s.size}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                onClick={() => setSelectedSize(s)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`p-4 rounded-xl text-left transition-all duration-300 ${selectedSize.size === s.size
                                        ? 'bg-gradient-to-br from-[#D4A5A5] to-[#C5A065] text-white shadow-lg shadow-[#D4A5A5]/30'
                                        : 'bg-[#F7E7CE]/30 text-[#3C2415] hover:bg-[#D4A5A5]/10 border border-[#E8D5D5]/50'
                                    }`}
                            >
                                <div className="font-semibold">{s.size}</div>
                                <div className={`text-xs mt-1 ${selectedSize.size === s.size ? 'opacity-80' : 'opacity-50'}`}>
                                    {s.circumference}
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Gauge Inputs */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[#3C2415]/70 mb-2 uppercase tracking-wider">
                            Swatch Rows
                        </label>
                        <input
                            type="number"
                            value={gaugeRows}
                            onChange={(e) => setGaugeRows(e.target.value)}
                            className="w-full px-4 py-4 rounded-xl border-2 border-[#E8D5D5] focus:border-[#D4A5A5] focus:ring-4 focus:ring-[#D4A5A5]/10 outline-none transition-all text-[#3C2415] text-xl font-medium bg-white"
                            placeholder="10"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#3C2415]/70 mb-2 uppercase tracking-wider">
                            Swatch Height
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.5"
                                value={gaugeHeight}
                                onChange={(e) => setGaugeHeight(e.target.value)}
                                className="w-full px-4 py-4 pr-14 rounded-xl border-2 border-[#E8D5D5] focus:border-[#D4A5A5] focus:ring-4 focus:ring-[#D4A5A5]/10 outline-none transition-all text-[#3C2415] text-xl font-medium bg-white"
                                placeholder="2"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3C2415]/40 text-sm">
                                inches
                            </span>
                        </div>
                    </div>
                </div>

                {/* Result */}
                <motion.div
                    key={calculatedRows}
                    initial={{ scale: 0.98, opacity: 0.6 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative overflow-hidden rounded-2xl p-8 text-center text-white"
                    style={{
                        background: 'linear-gradient(135deg, #D4A5A5 0%, #C5A065 50%, #D4A5A5 100%)',
                        backgroundSize: '200% 200%',
                    }}
                >
                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/10 translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10">
                        <div className="text-sm uppercase tracking-widest opacity-80 mb-3">
                            {selectedSize.size} hat • {targetHeight}" tall
                        </div>
                        <motion.div
                            key={calculatedRows}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-6xl sm:text-7xl font-bold"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                            {isNaN(calculatedRows) || !isFinite(calculatedRows) ? '—' : calculatedRows}
                        </motion.div>
                        <div className="text-sm opacity-80 mt-3 tracking-wide">rows on your Sentro 48</div>
                    </div>
                </motion.div>

                {/* Formula */}
                <div className="text-center text-[#3C2415]/30 text-sm font-mono">
                    ({targetHeight}" ÷ {gaugeHeight}") × {gaugeRows} = {calculatedRows}
                </div>
            </div>
        </div>
    );
}
