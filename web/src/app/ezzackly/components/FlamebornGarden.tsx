'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Crop data from Enshrouded
const CROPS = [
    { id: 'berry', name: 'Berry Bush', time: 3, icon: '🫐', color: '#8B5CF6' },
    { id: 'tree', name: 'Broadleaf', time: 3, icon: '🌳', color: '#22C55E' },
    { id: 'flax', name: 'Flax', time: 5, icon: '💠', color: '#3B82F6' },
    { id: 'mushroom', name: 'Red Mushroom', time: 5, icon: '🍄', color: '#EF4444' },
    { id: 'indigo', name: 'Indigo', time: 10, icon: '🪻', color: '#6366F1' },
    { id: 'strawberry', name: 'Strawberry', time: 10, icon: '🍓', color: '#F43F5E' },
    { id: 'corn', name: 'Corn', time: 15, icon: '🌽', color: '#EAB308' },
    { id: 'tomato', name: 'Tomato', time: 15, icon: '🍅', color: '#DC2626' },
    { id: 'wheat', name: 'Wheat', time: 20, icon: '🌾', color: '#CA8A04' },
    { id: 'pumpkin', name: 'Pumpkin', time: 70, icon: '🎃', color: '#F97316' },
];

interface PlantedCrop {
    cropId: string;
    plantedAt: number;
    harvested: boolean;
}

interface GardenState {
    plots: (PlantedCrop | null)[];
    inventory: Record<string, number>;
    soundEnabled: boolean;
}

const STORAGE_KEY = 'ezzackly-garden';
const NUM_PLOTS = 8;

export default function FlamebornGarden() {
    const [state, setState] = useState<GardenState>({
        plots: Array(NUM_PLOTS).fill(null),
        inventory: {},
        soundEnabled: true,
    });
    const [selectedSeed, setSelectedSeed] = useState<string | null>(null);
    const [now, setNow] = useState(Date.now());
    const [showInventory, setShowInventory] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Load from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setState(prev => ({ ...prev, ...parsed }));
            } catch {
                // Invalid data
            }
        }
    }, []);

    // Save to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, [state]);

    // Timer tick
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Get current weather based on time
    const getWeather = (): 'sun' | 'moon' | 'rain' => {
        const hour = new Date().getHours();
        // 10% chance of rain during any hour
        if (Math.random() < 0.001) return 'rain'; // Very low per tick to avoid flicker
        if (hour >= 6 && hour < 18) return 'sun';
        return 'moon';
    };

    const [weather] = useState(getWeather);

    // Play sound effect
    const playSound = useCallback((type: 'plant' | 'harvest' | 'ready') => {
        if (!state.soundEnabled) return;
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            }
            const ctx = audioContextRef.current;
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            if (type === 'plant') {
                oscillator.frequency.setValueAtTime(150, ctx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
                oscillator.type = 'triangle';
            } else if (type === 'harvest') {
                oscillator.frequency.setValueAtTime(400, ctx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
                oscillator.type = 'sine';
            } else if (type === 'ready') {
                oscillator.frequency.setValueAtTime(880, ctx.currentTime);
                oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                oscillator.type = 'sine';
            }

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.3);
        } catch {
            // Audio not available
        }
    }, [state.soundEnabled]);

    // Plant a crop in a plot
    const plantCrop = (plotIndex: number) => {
        if (!selectedSeed || state.plots[plotIndex]) return;

        playSound('plant');
        setState(prev => {
            const newPlots = [...prev.plots];
            newPlots[plotIndex] = {
                cropId: selectedSeed,
                plantedAt: Date.now(),
                harvested: false,
            };
            return { ...prev, plots: newPlots };
        });
        setSelectedSeed(null);
    };

    // Harvest a ready crop
    const harvestCrop = (plotIndex: number) => {
        const plot = state.plots[plotIndex];
        if (!plot) return;

        const crop = CROPS.find(c => c.id === plot.cropId);
        if (!crop) return;

        const elapsed = (now - plot.plantedAt) / 1000 / 60;
        if (elapsed < crop.time) return; // Not ready

        playSound('harvest');
        setState(prev => {
            const newPlots = [...prev.plots];
            newPlots[plotIndex] = null;
            const newInventory = { ...prev.inventory };
            newInventory[crop.id] = (newInventory[crop.id] || 0) + 1;
            return { ...prev, plots: newPlots, inventory: newInventory };
        });
    };

    // Get growth progress for a plot
    const getProgress = (plot: PlantedCrop | null): number => {
        if (!plot) return 0;
        const crop = CROPS.find(c => c.id === plot.cropId);
        if (!crop) return 0;
        const elapsed = (now - plot.plantedAt) / 1000 / 60;
        return Math.min(1, elapsed / crop.time);
    };

    // Format remaining time
    const formatTime = (plot: PlantedCrop | null): string => {
        if (!plot) return '';
        const crop = CROPS.find(c => c.id === plot.cropId);
        if (!crop) return '';
        const elapsed = (now - plot.plantedAt) / 1000 / 60;
        const remaining = Math.max(0, crop.time - elapsed);
        if (remaining <= 0) return 'READY';
        const mins = Math.floor(remaining);
        const secs = Math.floor((remaining - mins) * 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Get growth stage (0-2)
    const getStage = (progress: number): number => {
        if (progress < 0.33) return 0;
        if (progress < 0.99) return 1;
        return 2;
    };

    // Total inventory count
    const totalInventory = Object.values(state.inventory).reduce((a, b) => a + b, 0);

    return (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-[#D4A5A5]/10 border border-[#E8D5D5]/50 overflow-hidden relative">
            {/* Weather Layer */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                {weather === 'sun' && (
                    <div className="absolute top-4 right-4 w-16 h-16">
                        <motion.div
                            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                            transition={{ rotate: { duration: 20, repeat: Infinity, ease: 'linear' }, scale: { duration: 2, repeat: Infinity } }}
                            className="text-4xl"
                        >
                            ☀️
                        </motion.div>
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-200/20 to-transparent rounded-full blur-xl" />
                    </div>
                )}
                {weather === 'moon' && (
                    <>
                        <div className="absolute top-4 right-4 text-3xl">🌙</div>
                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/10 to-transparent" />
                        {/* Stars - using fixed positions to avoid hydration mismatch */}
                        {[
                            { x: 15, y: 8, d: 2.1, delay: 0 },
                            { x: 28, y: 12, d: 2.5, delay: 0.3 },
                            { x: 42, y: 6, d: 2.8, delay: 0.6 },
                            { x: 55, y: 15, d: 2.2, delay: 0.9 },
                            { x: 68, y: 9, d: 3.0, delay: 0.2 },
                            { x: 78, y: 18, d: 2.4, delay: 0.8 },
                            { x: 35, y: 22, d: 2.7, delay: 0.5 },
                            { x: 62, y: 25, d: 2.3, delay: 1.1 },
                            { x: 22, y: 28, d: 2.9, delay: 0.4 },
                            { x: 85, y: 10, d: 2.6, delay: 0.7 },
                            { x: 48, y: 20, d: 2.0, delay: 1.0 },
                            { x: 72, y: 30, d: 3.2, delay: 0.1 },
                        ].map((star, i) => (
                            <motion.div
                                key={i}
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: star.d, repeat: Infinity, delay: star.delay }}
                                className="absolute w-1 h-1 bg-white rounded-full"
                                style={{ left: `${star.x}%`, top: `${star.y}%` }}
                            />
                        ))}
                    </>
                )}
                {weather === 'rain' && (
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-100/30 to-transparent">
                        {[...Array(20)].map((_, i) => (
                            <motion.div
                                key={i}
                                animate={{ y: ['-10%', '110%'] }}
                                transition={{ duration: 0.5 + Math.random() * 0.5, repeat: Infinity, delay: Math.random() * 0.5 }}
                                className="absolute w-0.5 h-4 bg-blue-300/50 rounded-full"
                                style={{ left: `${Math.random() * 100}%` }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Header */}
            <div className="p-6 border-b border-[#E8D5D5]/50 bg-gradient-to-r from-[#F7E7CE]/30 to-transparent relative z-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h2
                            className="text-2xl font-bold text-[#3C2415]"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                            🌱 Flameborn Garden
                        </h2>
                        <p className="text-[#3C2415]/50 mt-1 text-sm">Grow crops in real-time (Enshrouded timers)</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setState(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                            className={`p-2 rounded-lg transition-all ${state.soundEnabled ? 'bg-[#D4A5A5]/20 text-[#D4A5A5]' : 'bg-gray-100 text-gray-400'}`}
                        >
                            {state.soundEnabled ? '🔊' : '🔇'}
                        </button>
                        <button
                            onClick={() => setShowInventory(!showInventory)}
                            className="p-2 rounded-lg bg-[#F7E7CE]/50 text-[#3C2415] relative"
                        >
                            🎒
                            {totalInventory > 0 && (
                                <span className="absolute -top-1 -right-1 bg-[#D4A5A5] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                    {totalInventory}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6 relative z-10">
                {/* Inventory Panel */}
                <AnimatePresence>
                    {showInventory && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="bg-[#F7E7CE]/50 rounded-xl p-4 border border-[#E8D5D5]/50">
                                <h3 className="text-sm font-bold text-[#3C2415] mb-3">🎒 Harvest Inventory</h3>
                                {totalInventory === 0 ? (
                                    <p className="text-[#3C2415]/40 text-sm">No harvests yet. Plant some crops!</p>
                                ) : (
                                    <div className="flex flex-wrap gap-3">
                                        {CROPS.filter(c => state.inventory[c.id] > 0).map(crop => (
                                            <div key={crop.id} className="flex items-center gap-1 bg-white/80 px-3 py-1 rounded-full">
                                                <span>{crop.icon}</span>
                                                <span className="text-sm font-medium text-[#3C2415]">×{state.inventory[crop.id]}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Garden Plots */}
                <div className="grid grid-cols-4 gap-3">
                    {state.plots.map((plot, index) => {
                        const crop = plot ? CROPS.find(c => c.id === plot.cropId) : null;
                        const progress = getProgress(plot);
                        const stage = getStage(progress);
                        const isReady = progress >= 1;
                        const timeStr = formatTime(plot);

                        return (
                            <motion.button
                                key={index}
                                onClick={() => {
                                    if (plot && isReady) {
                                        harvestCrop(index);
                                    } else if (!plot && selectedSeed) {
                                        plantCrop(index);
                                    }
                                }}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                className={`relative aspect-square rounded-xl border-2 transition-all flex flex-col items-center justify-center ${!plot && selectedSeed
                                    ? 'border-dashed border-[#D4A5A5] bg-[#D4A5A5]/10 cursor-pointer'
                                    : plot
                                        ? isReady
                                            ? 'border-[#22C55E] bg-[#22C55E]/10 cursor-pointer'
                                            : 'border-[#E8D5D5] bg-[#F7E7CE]/30'
                                        : 'border-[#E8D5D5]/50 bg-[#F7E7CE]/20'
                                    }`}
                            >
                                {plot && crop ? (
                                    <>
                                        {/* Growth animation */}
                                        <motion.div
                                            animate={isReady ? { scale: [1, 1.1, 1] } : {}}
                                            transition={{ duration: 0.5, repeat: isReady ? Infinity : 0 }}
                                            className={`text-3xl ${stage === 0 ? 'opacity-50 scale-75' : stage === 1 ? 'opacity-75 scale-90' : 'opacity-100 scale-100'}`}
                                        >
                                            {crop.icon}
                                        </motion.div>
                                        {/* Timer or Ready */}
                                        <div className={`text-xs font-mono mt-1 ${isReady ? 'text-[#22C55E] font-bold' : 'text-[#3C2415]/60'}`}>
                                            {timeStr}
                                        </div>
                                        {/* Progress bar */}
                                        {!isReady && (
                                            <div className="absolute bottom-1 left-1 right-1 h-1 bg-[#E8D5D5] rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full rounded-full"
                                                    style={{ backgroundColor: crop.color, width: `${progress * 100}%` }}
                                                />
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-[#3C2415]/20 text-2xl">
                                        {selectedSeed ? '+' : '·'}
                                    </span>
                                )}
                            </motion.button>
                        );
                    })}
                </div>

                {/* Seed Drawer */}
                <div className="bg-[#F7E7CE]/30 rounded-xl p-4 border border-[#E8D5D5]/50">
                    <h3 className="text-sm font-bold text-[#3C2415] mb-3">🌱 Seeds — tap to select, then tap a plot</h3>
                    <div className="flex flex-wrap gap-2">
                        {CROPS.map(crop => (
                            <motion.button
                                key={crop.id}
                                onClick={() => setSelectedSeed(selectedSeed === crop.id ? null : crop.id)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${selectedSeed === crop.id
                                    ? 'bg-gradient-to-r from-[#D4A5A5] to-[#C5A065] text-white shadow-md'
                                    : 'bg-white/80 text-[#3C2415] border border-[#E8D5D5]/50 hover:border-[#D4A5A5]/30'
                                    }`}
                            >
                                <span className="text-xl">{crop.icon}</span>
                                <div className="text-left">
                                    <div className="text-sm font-medium">{crop.name}</div>
                                    <div className={`text-xs ${selectedSeed === crop.id ? 'opacity-80' : 'opacity-50'}`}>
                                        {crop.time} min
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Hint */}
                {selectedSeed && (
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center text-[#D4A5A5] text-sm"
                    >
                        Tap an empty plot to plant {CROPS.find(c => c.id === selectedSeed)?.name}
                    </motion.p>
                )}
            </div>
        </div>
    );
}
