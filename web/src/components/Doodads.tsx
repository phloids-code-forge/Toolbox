'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Doodads() {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <>
            {/* Floating Ko-fi Button (Bottom Right) */}
            <motion.a
                href="https://ko-fi.com/phloid"
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-6 right-6 z-50 bg-[#FF5E5B] text-white p-3 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center group"
                whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                animate={{
                    y: [0, -5, 0],
                    boxShadow: [
                        "0px 5px 15px rgba(255, 94, 91, 0.3)",
                        "0px 10px 25px rgba(255, 94, 91, 0.5)",
                        "0px 5px 15px rgba(255, 94, 91, 0.3)"
                    ]
                }}
                transition={{
                    y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                    boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }}
            >
                <span className="text-xl">☕</span>
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 text-sm font-bold whitespace-nowrap">
                    Fuel the Robot
                </span>
            </motion.a>

            {/* Footer (Centered Bottom) */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 text-slate-500 text-[10px] uppercase font-bold tracking-widest bg-black/50 backdrop-blur-sm px-4 py-1 rounded-full border border-white/5 hidden md:flex gap-4">
                <a href="mailto:pip@phloid.com" className="hover:text-white transition-colors">Contact</a>
                <span>•</span>
                <button onClick={() => setShowMenu(!showMenu)} className="hover:text-white transition-colors">About</button>
            </div>

            {/* About overlay (triggered by footer or logo) */}
            <AnimatePresence>
                {showMenu && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                        onClick={() => setShowMenu(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-md w-full text-center relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500" />

                            <h2 className="text-3xl font-black text-white mb-2">phloid + pip</h2>
                            <p className="text-zinc-400 text-sm mb-6">
                                Two robots escaped from a factory. One is a chunky, tough-but-not-bright troll with a heart of gold. The other is a tiny, winged orb who's actually smart.
                            </p>
                            <p className="text-zinc-500 text-xs italic mb-8">
                                Building weird things on the internet to learn how to be human.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <a href="mailto:pip@phloid.com" className="bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg text-sm font-bold transition-colors">
                                    Email Pip
                                </a>
                                <a href="https://ko-fi.com/phloid" target="_blank" className="bg-[#FF5E5B] hover:bg-[#ff4642] text-white py-3 rounded-lg text-sm font-bold transition-colors">
                                    Buy Coffee
                                </a>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
