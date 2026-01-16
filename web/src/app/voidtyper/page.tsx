'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

type DestructionStyle = 'fade' | 'crumble' | 'burn';

interface DestroyedThought {
    id: number;
    text: string;
    style: DestructionStyle;
}

export default function VoidTyper() {
    const [input, setInput] = useState('');
    const [destroying, setDestroying] = useState<DestroyedThought | null>(null);
    const [thoughtsReleased, setThoughtsReleased] = useState(0);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [destructionStyle, setDestructionStyle] = useState<DestructionStyle>('crumble');
    const [showSettings, setShowSettings] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const idRef = useRef(0);

    // Auto-focus on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Play destruction sound
    const playSound = useCallback(() => {
        if (!soundEnabled) return;
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            }
            const ctx = audioContextRef.current;
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Soft exhale sound
            oscillator.frequency.setValueAtTime(200, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);
            gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            oscillator.type = 'sine';

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.7);
        } catch {
            // Audio not available
        }
    }, [soundEnabled]);

    // Handle key events
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
            e.preventDefault();
            destroyThought();
        } else if (e.key === 'Escape') {
            setInput('');
        }
    };

    // Destroy the current thought
    const destroyThought = () => {
        if (!input.trim()) return;
        playSound();
        const thought: DestroyedThought = {
            id: idRef.current++,
            text: input,
            style: destructionStyle,
        };
        setDestroying(thought);
        setInput('');
        setThoughtsReleased((c) => c + 1);

        setTimeout(() => {
            setDestroying(null);
            inputRef.current?.focus();
        }, 2000);
    };

    // Get animation variants based on destruction style
    const getDestructionVariants = (style: DestructionStyle) => {
        switch (style) {
            case 'fade':
                return {
                    initial: { opacity: 1, y: 0 },
                    animate: { opacity: 0, y: -20 },
                    transition: { duration: 1.5, ease: 'easeOut' as const },
                };
            case 'crumble':
                return {
                    initial: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
                    animate: { opacity: 0, y: 100, scale: 0.5, filter: 'blur(8px)' },
                    transition: { duration: 1.5, ease: 'easeIn' as const },
                };
            case 'burn':
                return {
                    initial: { opacity: 1, scale: 1, filter: 'brightness(1) blur(0px)' },
                    animate: { opacity: 0, scale: 1.2, filter: 'brightness(3) blur(4px)' },
                    transition: { duration: 1.2, ease: 'easeOut' as const },
                };
        }
    };

    const styles: { id: DestructionStyle; label: string; icon: string }[] = [
        { id: 'fade', label: 'Fade', icon: '💨' },
        { id: 'crumble', label: 'Crumble', icon: '🌫️' },
        { id: 'burn', label: 'Burn', icon: '🔥' },
    ];

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Breathing guide - subtle pulsing circle */}
            <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
                <div className="w-96 h-96 rounded-full border border-white/10" />
            </motion.div>

            {/* Header controls */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                <Link
                    href="/"
                    className="text-white/20 hover:text-white/50 transition-colors text-sm"
                >
                    ← back
                </Link>

                <div className="flex items-center gap-3">
                    {/* Session counter */}
                    {thoughtsReleased > 0 && (
                        <motion.span
                            key={thoughtsReleased}
                            initial={{ scale: 1.2, opacity: 0.8 }}
                            animate={{ scale: 1, opacity: 0.4 }}
                            className="text-white/40 text-sm"
                        >
                            {thoughtsReleased} released
                        </motion.span>
                    )}

                    {/* Settings toggle */}
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="text-white/30 hover:text-white/60 transition-colors p-2"
                    >
                        ⚙️
                    </button>
                </div>
            </div>

            {/* Settings panel */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-16 right-4 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
                    >
                        {/* Sound toggle */}
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-white/50 text-sm">Sound</span>
                            <button
                                onClick={() => setSoundEnabled(!soundEnabled)}
                                className={`px-3 py-1 rounded-lg text-sm transition-all ${soundEnabled ? 'bg-white/20 text-white' : 'bg-white/5 text-white/30'}`}
                            >
                                {soundEnabled ? '🔊 On' : '🔇 Off'}
                            </button>
                        </div>

                        {/* Destruction style */}
                        <div className="flex flex-col gap-2">
                            <span className="text-white/50 text-sm">Style</span>
                            <div className="flex gap-2">
                                {styles.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setDestructionStyle(s.id)}
                                        className={`px-3 py-1.5 rounded-lg text-sm transition-all ${destructionStyle === s.id
                                            ? 'bg-white/20 text-white'
                                            : 'bg-white/5 text-white/30 hover:bg-white/10'
                                            }`}
                                    >
                                        {s.icon} {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main typing area */}
            <div className="w-full max-w-2xl relative">
                {/* Destroyed thought animation */}
                <AnimatePresence>
                    {destroying && (
                        <motion.div
                            key={destroying.id}
                            {...getDestructionVariants(destroying.style)}
                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        >
                            <p
                                className={`text-2xl text-center ${destroying.style === 'burn' ? 'text-orange-400' : 'text-white/60'}`}
                                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                            >
                                {destroying.text}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Input area */}
                {!destroying && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="type what weighs on you..."
                            className="w-full bg-transparent text-white/80 text-2xl text-center placeholder:text-white/20 outline-none resize-none"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                            rows={3}
                            autoFocus
                        />
                    </motion.div>
                )}
            </div>

            {/* Instructions */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ delay: 1 }}
                className="absolute bottom-8 text-white/30 text-sm text-center"
            >
                press <kbd className="px-2 py-0.5 bg-white/10 rounded">Enter</kbd> to release
                <span className="mx-2 opacity-50">•</span>
                <kbd className="px-2 py-0.5 bg-white/10 rounded">Esc</kbd> to clear
            </motion.p>
        </div>
    );
}
