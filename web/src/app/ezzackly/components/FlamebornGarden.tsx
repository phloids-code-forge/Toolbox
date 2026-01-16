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
    const getWeather = (): 'sun' | 'moon' => {
        const hour = new Date().getHours();
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
        if (elapsed < crop.time) return;
        playSound('harvest');
        setState(prev => {
            const newPlots = [...prev.plots];
            newPlots[plotIndex] = null;
            const newInventory = { ...prev.inventory };
            newInventory[crop.id] = (newInventory[crop.id] || 0) + 1;
            return { ...prev, plots: newPlots, inventory: newInventory };
        });
    };

    const getProgress = (plot: PlantedCrop | null): number => {
        if (!plot) return 0;
        const crop = CROPS.find(c => c.id === plot.cropId);
        if (!crop) return 0;
        const elapsed = (now - plot.plantedAt) / 1000 / 60;
        return Math.min(1, elapsed / crop.time);
    };

    const formatTime = (plot: PlantedCrop | null): string => {
        if (!plot) return '';
        const crop = CROPS.find(c => c.id === plot.cropId);
        if (!crop) return '';
        const elapsed = (now - plot.plantedAt) / 1000 / 60;
        const remaining = Math.max(0, crop.time - elapsed);
        if (remaining <= 0) return '✨';
        const mins = Math.floor(remaining);
        const secs = Math.floor((remaining - mins) * 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getStage = (progress: number): number => {
        if (progress < 0.33) return 0;
        if (progress < 0.99) return 1;
        return 2;
    };

    const totalInventory = Object.values(state.inventory).reduce((a, b) => a + b, 0);

    return (
        <div className="rounded-3xl overflow-hidden shadow-xl border-4 border-[#5D4037]" style={{ background: 'linear-gradient(180deg, #87CEEB 0%, #98D8C8 30%, #7CB342 100%)' }}>
            {/* Sky with weather */}
            <div className="relative h-24 overflow-hidden">
                {/* Clouds */}
                <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                    className="absolute top-4 left-0 text-5xl opacity-80"
                >
                    ☁️
                </motion.div>
                <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 45, repeat: Infinity, ease: 'linear', delay: 10 }}
                    className="absolute top-8 left-0 text-3xl opacity-60"
                >
                    ☁️
                </motion.div>

                {/* Sun or Moon */}
                <div className="absolute top-3 right-6">
                    {weather === 'sun' ? (
                        <motion.div
                            animate={{ rotate: 360, scale: [1, 1.05, 1] }}
                            transition={{ rotate: { duration: 20, repeat: Infinity, ease: 'linear' }, scale: { duration: 2, repeat: Infinity } }}
                            className="text-5xl drop-shadow-lg"
                        >
                            ☀️
                        </motion.div>
                    ) : (
                        <>
                            <div className="text-4xl">🌙</div>
                            {/* Stars */}
                            {[
                                { x: -60, y: 10 }, { x: -40, y: -5 }, { x: -20, y: 15 },
                                { x: 40, y: 5 }, { x: 60, y: -10 }, { x: -80, y: 0 },
                            ].map((star, i) => (
                                <motion.div
                                    key={i}
                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                    transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
                                    className="absolute w-1.5 h-1.5 bg-yellow-100 rounded-full"
                                    style={{ left: star.x, top: star.y }}
                                />
                            ))}
                        </>
                    )}
                </div>

                {/* Header overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-green-600/80 to-transparent">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white drop-shadow-md" style={{ fontFamily: "'Fredoka One', cursive, 'Playfair Display', serif" }}>
                                🌱 Flameborn Farm
                            </h2>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setState(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                                className={`p-2 rounded-full transition-all shadow-md ${state.soundEnabled ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-400 text-gray-600'}`}
                            >
                                {state.soundEnabled ? '🔊' : '🔇'}
                            </button>
                            <button
                                onClick={() => setShowInventory(!showInventory)}
                                className="p-2 rounded-full bg-amber-600 text-white relative shadow-md hover:bg-amber-700 transition-all"
                            >
                                🎒
                                {totalInventory > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                                        {totalInventory}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Farm area */}
            <div className="p-4" style={{ background: 'linear-gradient(180deg, #7CB342 0%, #689F38 100%)' }}>
                {/* Inventory Panel */}
                <AnimatePresence>
                    {showInventory && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mb-4"
                        >
                            <div className="bg-amber-100 rounded-xl p-4 border-4 border-amber-800/30 shadow-inner">
                                <h3 className="text-sm font-bold text-amber-900 mb-3">🎒 Barn Storage</h3>
                                {totalInventory === 0 ? (
                                    <p className="text-amber-700/60 text-sm">Your barn is empty. Harvest some crops!</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {CROPS.filter(c => state.inventory[c.id] > 0).map(crop => (
                                            <div key={crop.id} className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full border-2 border-amber-300 shadow-sm">
                                                <span className="text-lg">{crop.icon}</span>
                                                <span className="text-sm font-bold text-amber-900">×{state.inventory[crop.id]}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Fence border around plots */}
                <div className="relative">
                    {/* Wooden fence posts */}
                    <div className="absolute -inset-2 border-4 border-amber-800 rounded-2xl" style={{ background: 'repeating-linear-gradient(90deg, #8B4513 0px, #8B4513 8px, #A0522D 8px, #A0522D 16px)' }} />

                    {/* Garden plots on grass */}
                    <div className="relative bg-gradient-to-b from-green-500 to-green-600 rounded-xl p-4 border-4 border-green-700">
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
                                        whileHover={{ scale: 1.05, y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="relative aspect-square rounded-xl shadow-lg transition-all overflow-hidden"
                                        style={{
                                            background: plot
                                                ? 'linear-gradient(180deg, #5D4037 0%, #4E342E 50%, #3E2723 100%)'
                                                : 'linear-gradient(180deg, #6D4C41 0%, #5D4037 50%, #4E342E 100%)',
                                            boxShadow: isReady
                                                ? '0 0 20px 5px rgba(255, 215, 0, 0.6), inset 0 2px 4px rgba(0,0,0,0.3)'
                                                : 'inset 0 2px 4px rgba(0,0,0,0.3), 0 4px 6px rgba(0,0,0,0.3)',
                                        }}
                                    >
                                        {/* Soil texture lines */}
                                        <div className="absolute inset-0 opacity-30">
                                            {[...Array(3)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="absolute h-0.5 bg-amber-900/50 rounded-full"
                                                    style={{ top: `${25 + i * 25}%`, left: '10%', right: '10%' }}
                                                />
                                            ))}
                                        </div>

                                        {plot && crop ? (
                                            <div className="relative z-10 flex flex-col items-center justify-center h-full">
                                                {/* Plant with growth stages */}
                                                <motion.div
                                                    animate={isReady ? { scale: [1, 1.15, 1], y: [0, -3, 0] } : {}}
                                                    transition={{ duration: 0.6, repeat: isReady ? Infinity : 0 }}
                                                    className="relative"
                                                    style={{
                                                        fontSize: stage === 0 ? '1.5rem' : stage === 1 ? '2rem' : '2.5rem',
                                                        opacity: stage === 0 ? 0.7 : stage === 1 ? 0.85 : 1,
                                                        filter: isReady ? 'drop-shadow(0 0 8px gold)' : 'none'
                                                    }}
                                                >
                                                    {crop.icon}
                                                    {isReady && (
                                                        <motion.span
                                                            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                                                            transition={{ duration: 0.5, repeat: Infinity }}
                                                            className="absolute -top-1 -right-1 text-sm"
                                                        >
                                                            ✨
                                                        </motion.span>
                                                    )}
                                                </motion.div>
                                                {/* Timer */}
                                                <div className={`text-xs font-bold mt-1 px-2 py-0.5 rounded-full ${isReady
                                                        ? 'bg-yellow-400 text-yellow-900'
                                                        : 'bg-black/40 text-white'
                                                    }`}>
                                                    {timeStr}
                                                </div>
                                                {/* Progress bar */}
                                                {!isReady && (
                                                    <div className="absolute bottom-1 left-1 right-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
                                                        <motion.div
                                                            className="h-full rounded-full"
                                                            style={{
                                                                background: `linear-gradient(90deg, ${crop.color}, ${crop.color}dd)`,
                                                                width: `${progress * 100}%`
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full">
                                                <span className={`text-2xl ${selectedSeed ? 'text-green-400' : 'text-amber-700/40'}`}>
                                                    {selectedSeed ? '➕' : '🌱'}
                                                </span>
                                                {selectedSeed && (
                                                    <span className="text-[10px] text-green-300 font-bold mt-1">TAP</span>
                                                )}
                                            </div>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Seed drawer styled like a wooden cart */}
                <div className="mt-4 bg-amber-100 rounded-xl p-4 border-4 border-amber-800/40 shadow-lg" style={{ background: 'linear-gradient(180deg, #DEB887 0%, #D2B48C 100%)' }}>
                    <h3 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
                        <span className="text-lg">🌱</span> Seed Cart — tap to select
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {CROPS.map(crop => (
                            <motion.button
                                key={crop.id}
                                onClick={() => setSelectedSeed(selectedSeed === crop.id ? null : crop.id)}
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${selectedSeed === crop.id
                                        ? 'bg-green-500 text-white shadow-lg ring-2 ring-yellow-400'
                                        : 'bg-white/90 text-amber-900 border-2 border-amber-400 hover:border-green-500'
                                    }`}
                            >
                                <span className="text-xl">{crop.icon}</span>
                                <div className="text-left">
                                    <div className="text-sm font-bold">{crop.name}</div>
                                    <div className={`text-xs ${selectedSeed === crop.id ? 'text-green-100' : 'text-amber-600'}`}>
                                        ⏱️ {crop.time}m
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Hint */}
                {selectedSeed && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 text-center py-2 px-4 bg-yellow-400 rounded-full text-yellow-900 font-bold text-sm shadow-md"
                    >
                        🌱 Tap a dirt plot to plant {CROPS.find(c => c.id === selectedSeed)?.name}!
                    </motion.div>
                )}
            </div>
        </div>
    );
}
