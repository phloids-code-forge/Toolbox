'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';

const hookSizes = [
    { mm: 2.0, us: 'A-0', uk: '14' },
    { mm: 2.25, us: 'B-1', uk: '13' },
    { mm: 2.75, us: 'C-2', uk: '12' },
    { mm: 3.25, us: 'D-3', uk: '10' },
    { mm: 3.5, us: 'E-4', uk: '9' },
    { mm: 3.75, us: 'F-5', uk: '—' },
    { mm: 4.0, us: 'G-6', uk: '8' },
    { mm: 4.5, us: '7', uk: '7' },
    { mm: 5.0, us: 'H-8', uk: '6' },
    { mm: 5.5, us: 'I-9', uk: '5' },
    { mm: 6.0, us: 'J-10', uk: '4' },
    { mm: 6.5, us: 'K-10.5', uk: '3' },
    { mm: 8.0, us: 'L-11', uk: '0' },
    { mm: 9.0, us: 'M/N-13', uk: '00' },
    { mm: 10.0, us: 'N/P-15', uk: '000' },
];

export default function HookChart() {
    const [search, setSearch] = useState('');
    const [highlight, setHighlight] = useState<number | null>(null);

    const filtered = hookSizes.filter(
        (h) =>
            h.mm.toString().includes(search) ||
            h.us.toLowerCase().includes(search.toLowerCase()) ||
            h.uk.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-[#D4A5A5]/10 border border-[#E8D5D5]/50 overflow-hidden">
            <div className="p-6 border-b border-[#E8D5D5]/50 bg-gradient-to-r from-[#F7E7CE]/30 to-transparent">
                <h2
                    className="text-2xl font-bold text-[#3C2415]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                    Crochet Hook Sizes
                </h2>
                <p className="text-[#3C2415]/50 mt-1 text-sm">Quick reference for US, UK, and Metric</p>

                <div className="mt-4 relative">
                    <input
                        type="text"
                        placeholder="Search sizes..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-4 py-3 pl-10 rounded-xl border-2 border-[#E8D5D5] focus:border-[#D4A5A5] focus:ring-4 focus:ring-[#D4A5A5]/10 outline-none transition-all text-[#3C2415] bg-white"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3C2415]/30">🔍</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gradient-to-r from-[#F7E7CE]/50 to-[#F7E7CE]/30">
                            <th className="px-6 py-4 text-left text-xs font-bold text-[#3C2415]/60 uppercase tracking-wider">
                                mm
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-[#3C2415]/60 uppercase tracking-wider">
                                US
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-[#3C2415]/60 uppercase tracking-wider">
                                UK
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8D5D5]/50">
                        {filtered.map((hook, idx) => (
                            <motion.tr
                                key={hook.mm}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.02 }}
                                onClick={() => setHighlight(highlight === hook.mm ? null : hook.mm)}
                                className={`cursor-pointer transition-all duration-300 ${highlight === hook.mm
                                        ? 'bg-gradient-to-r from-[#D4A5A5]/20 to-transparent'
                                        : 'hover:bg-[#F7E7CE]/30'
                                    }`}
                            >
                                <td className="px-6 py-4">
                                    <span className={`font-semibold ${highlight === hook.mm ? 'text-[#D4A5A5]' : 'text-[#3C2415]'}`}>
                                        {hook.mm}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-[#3C2415]">{hook.us}</td>
                                <td className="px-6 py-4 text-[#3C2415]">{hook.uk}</td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filtered.length === 0 && (
                <div className="text-center text-[#3C2415]/40 py-12">
                    No matching hook sizes found
                </div>
            )}
        </div>
    );
}
