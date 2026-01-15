'use client';
import React, { useState, useEffect } from 'react';
import { TargetingScope, ScopeConfig } from '../../components/trench/TargetingScope';
import { ControlPanel } from '../../components/trench/ControlPanel';
import { CRTEffect } from '../../components/trench/CRTEffect';
import { TRENCH_ASSETS } from '../../components/trench/assets';

export default function TrenchRunPage() {

    // Default Config
    const [config, setConfig] = useState<ScopeConfig>({
        color: '#ffaa00', // Amber
        gridSize: 50,
        rotationSpeed: 2,
        scale: 1,
        isLocked: false,
        asset: TRENCH_ASSETS[0], // X-Wing
        distance: 1200
    });

    const [isCinematic, setIsCinematic] = useState(false);

    // Simulate Distance closing in
    useEffect(() => {
        const interval = setInterval(() => {
            setConfig(prev => {
                if (prev.isLocked) return prev;
                let newDist = prev.distance - 2;
                if (newDist < 0) newDist = 2000;
                return { ...prev, distance: newDist };
            });
        }, 50);
        return () => clearInterval(interval);
    }, []);

    // Exit Cinematic Mode on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsCinematic(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="w-full h-screen flex bg-black overflow-hidden relative">

            {/* CRT Overlay (Global) */}
            <CRTEffect />

            {/* Left: The Targeting Computer */}
            <div className={`flex-grow h-full relative z-10 transition-all duration-500 ${isCinematic ? 'scale-105' : ''}`}>
                <TargetingScope config={config} />
            </div>

            {/* Right: The Controls */}
            {!isCinematic && (
                <div className="w-[350px] h-full relative z-20 shadow-2xl">
                    <ControlPanel
                        config={config}
                        setConfig={setConfig}
                        onCinematic={() => setIsCinematic(true)}
                    />
                </div>
            )}

            {/* Cinematic Hint */}
            {isCinematic && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/20 text-xs font-mono z-50 animate-pulse">
                    PRESS ESC TO EXIT CINEMATIC MODE
                </div>
            )}
        </div>
    );
}
