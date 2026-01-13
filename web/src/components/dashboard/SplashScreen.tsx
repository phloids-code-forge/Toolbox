"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Show splash for 1.5 seconds, then fade out
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onComplete, 500); // Trigger data load/app view after fade finishes
        }, 1500);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black"
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="flex flex-col items-center gap-4"
                    >
                        {/* Simple Logo Placeholder */}
                        <div className="w-20 h-20 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/30">
                            <span className="text-3xl">P</span>
                        </div>
                        <h1 className="text-4xl font-bold text-white tracking-[0.2em] font-[family-name:var(--font-space-grotesk)]">
                            phloid
                        </h1>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
