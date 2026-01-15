'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';

type SoundType = 'soft' | 'thock' | 'bamboo' | 'off';

export default function ZenCounter() {
    const [count, setCount] = useState(0);
    const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
    const [soundType, setSoundType] = useState<SoundType>('soft');
    const [isHovering, setIsHovering] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const rippleIdRef = useRef(0);

    // Load from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('ezzackly-counter');
        if (saved) setCount(parseInt(saved, 10));
        const savedSound = localStorage.getItem('ezzackly-sound') as SoundType;
        if (savedSound) setSoundType(savedSound);
    }, []);

    // Save to localStorage
    useEffect(() => {
        localStorage.setItem('ezzackly-counter', count.toString());
    }, [count]);

    useEffect(() => {
        localStorage.setItem('ezzackly-sound', soundType);
    }, [soundType]);

    // Generate soft click sound using Web Audio API
    const playSound = useCallback(() => {
        if (soundType === 'off') return;

        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            }
            const ctx = audioContextRef.current;

            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Different sounds based on type
            if (soundType === 'soft') {
                oscillator.frequency.setValueAtTime(800, ctx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
                oscillator.type = 'sine';
            } else if (soundType === 'thock') {
                oscillator.frequency.setValueAtTime(150, ctx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.08);
                gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
                oscillator.type = 'triangle';
            } else if (soundType === 'bamboo') {
                oscillator.frequency.setValueAtTime(2000, ctx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);
                gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                oscillator.type = 'sine';
            }

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.2);
        } catch {
            // Audio not available
        }
    }, [soundType]);

    const addRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = rippleIdRef.current++;

        setRipples((prev) => [...prev, { id, x, y }]);
        setTimeout(() => {
            setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 800);
    }, []);

    const increment = (e: React.MouseEvent<HTMLButtonElement>) => {
        setCount((c) => c + 1);
        addRipple(e);
        playSound();
    };

    const decrement = () => {
        setCount((c) => Math.max(0, c - 1));
        playSound();
    };

    const reset = () => {
        if (confirm('Reset counter to zero?')) {
            setCount(0);
        }
    };

    const soundOptions: { type: SoundType; label: string; icon: string }[] = [
        { type: 'soft', label: 'Soft', icon: '🧶' },
        { type: 'thock', label: 'Thock', icon: '⌨️' },
        { type: 'bamboo', label: 'Bamboo', icon: '🎋' },
        { type: 'off', label: 'Off', icon: '🔇' },
    ];

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-[#E8D5D5] overflow-hidden">
            <div className="p-6 border-b border-[#E8D5D5]">
                <h2 className="text-xl font-bold text-[#3C2415] font-['Playfair_Display',serif]">
                    Zen Counter
                </h2>
                <p className="text-[#3C2415]/60 mt-1">Your digital row counter with ASMR feedback</p>
            </div>

            <div className="p-8">
                {/* Main Counter Display */}
                <motion.button
                    onClick={increment}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    whileTap={{ scale: 0.98 }}
                    className="relative w-full aspect-square max-w-xs mx-auto rounded-full flex items-center justify-center cursor-pointer overflow-hidden"
                    style={{
                        background: 'linear-gradient(145deg, #F7E7CE, #E8D5D5)',
                        boxShadow: isHovering
                            ? '0 20px 40px rgba(212, 165, 165, 0.3), inset 0 -2px 10px rgba(255,255,255,0.5)'
                            : '0 10px 30px rgba(212, 165, 165, 0.2), inset 0 -2px 10px rgba(255,255,255,0.5)',
                    }}
                >
                    {/* Ripple Effects */}
                    {ripples.map((ripple) => (
                        <motion.span
                            key={ripple.id}
                            initial={{ scale: 0, opacity: 0.6 }}
                            animate={{ scale: 4, opacity: 0 }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="absolute w-20 h-20 rounded-full bg-[#D4A5A5]/40 pointer-events-none"
                            style={{ left: ripple.x - 40, top: ripple.y - 40 }}
                        />
                    ))}

                    {/* Count Display */}
                    <motion.span
                        key={count}
                        initial={{ scale: 1.1, opacity: 0.7 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-7xl font-bold text-[#3C2415] font-['Playfair_Display',serif] select-none z-10"
                    >
                        {count}
                    </motion.span>
                </motion.button>

                {/* Tap hint */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    className="text-center text-[#3C2415] text-sm mt-4"
                >
                    Tap to count
                </motion.p>

                {/* Sound Selector */}
                <div className="flex justify-center gap-2 mt-6">
                    {soundOptions.map((option) => (
                        <button
                            key={option.type}
                            onClick={() => setSoundType(option.type)}
                            className={`px-3 py-2 rounded-lg text-sm transition-all duration-300 ${soundType === option.type
                                    ? 'bg-[#D4A5A5] text-white shadow-md scale-105'
                                    : 'bg-[#F7E7CE]/50 text-[#3C2415] hover:bg-[#D4A5A5]/20'
                                }`}
                        >
                            <span className="mr-1">{option.icon}</span>
                            {option.label}
                        </button>
                    ))}
                </div>

                {/* Controls */}
                <div className="flex justify-center gap-4 mt-6">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={decrement}
                        className="px-6 py-3 rounded-xl bg-[#F7E7CE] text-[#3C2415] font-medium hover:bg-[#E8D5D5] transition-colors shadow-sm"
                    >
                        − 1
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={reset}
                        className="px-6 py-3 rounded-xl border border-[#E8D5D5] text-[#3C2415]/60 font-medium hover:bg-[#F7E7CE] transition-colors"
                    >
                        Reset
                    </motion.button>
                </div>

                {/* Persistence indicator */}
                <p className="text-center text-[#C5A065] text-xs mt-6 flex items-center justify-center gap-1">
                    <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        ✓
                    </motion.span>
                    Saved automatically
                </p>
            </div>
        </div>
    );
}
