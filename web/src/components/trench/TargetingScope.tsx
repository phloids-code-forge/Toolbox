'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrenchAsset } from './assets';

export type ScopeConfig = {
    color: string;
    gridSize: number;
    rotationSpeed: number;
    scale: number;
    isLocked: boolean;
    asset: TrenchAsset;
    distance: number;
};

interface TargetingScopeProps {
    config: ScopeConfig;
}

export const TargetingScope: React.FC<TargetingScopeProps> = ({ config }) => {
    const { color, gridSize, rotationSpeed, scale, isLocked, asset, distance } = config;

    // Pulse effect for Lock
    const lockColor = isLocked ? '#ff0000' : color;

    return (
        <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden font-mono border-2" style={{ borderColor: color }}>

            {/* Grid Background */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
                    backgroundSize: `${gridSize}px ${gridSize}px`,
                    backgroundPosition: 'center center'
                }}
            />

            {/* Rotating Circle Reticle */}
            <motion.div
                className="absolute rounded-full border-2 border-dashed opacity-50"
                style={{ width: '400px', height: '400px', borderColor: color }}
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 60 / rotationSpeed, ease: "linear" }}
            />

            {/* Counter-Rotating Outer Ring */}
            <motion.div
                className="absolute rounded-full border border-dotted opacity-30"
                style={{ width: '500px', height: '500px', borderColor: color }}
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 90 / rotationSpeed, ease: "linear" }}
            />

            {/* Target Asset */}
            <motion.div
                animate={{
                    scale: isLocked ? [scale, scale * 1.05, scale] : scale,
                }}
                transition={{ repeat: Infinity, duration: 0.5 }}
            >
                <svg
                    width="200"
                    height="200"
                    viewBox={asset.viewBox || "0 0 100 100"}
                    className="drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                >
                    <path
                        d={asset.path}
                        fill="none"
                        stroke={lockColor}
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
            </motion.div>

            {/* Crosshairs */}
            <div className="absolute w-[20px] h-[2px]" style={{ backgroundColor: lockColor }} />
            <div className="absolute w-[2px] h-[20px]" style={{ backgroundColor: lockColor }} />

            {/* Locking Brackets */}
            {isLocked && (
                <motion.div
                    className="absolute w-[250px] h-[250px] border-4"
                    style={{ borderColor: 'red' }}
                    initial={{ scale: 2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* Text readout */}
                    <div className="absolute -top-8 left-0 text-red-500 font-bold tracking-widest">
                        TARGET LOCKED
                    </div>
                </motion.div>
            )}

            {/* Distance Readout */}
            <div className="absolute bottom-10 right-10 text-xl font-bold tracking-wider font-aurebesh" style={{ color: color }}>
                DIST: {distance.toFixed(0)}
            </div>
            <div className="absolute top-10 left-10 text-xl font-bold tracking-wider opacity-70 font-aurebesh" style={{ color: color }}>
                SYS: {asset.name.toUpperCase()}
            </div>

        </div>
    );
};
