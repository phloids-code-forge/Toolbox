'use client';
import React from 'react';
import { ScopeConfig } from './TargetingScope';
import { TRENCH_ASSETS } from './assets';

interface ControlPanelProps {
    config: ScopeConfig;
    setConfig: React.Dispatch<React.SetStateAction<ScopeConfig>>;
    onCinematic: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ config, setConfig, onCinematic }) => {

    const handleChange = (key: keyof ScopeConfig, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="p-6 bg-slate-900 border-l border-slate-700 h-full overflow-y-auto text-slate-300 font-mono text-sm">
            <h2 className="text-xl font-bold mb-6 text-white border-b border-slate-600 pb-2">SYSTEM CONTROLS</h2>

            {/* --- Color --- */}
            <div className="mb-6 space-y-2">
                <label className="block text-xs uppercase tracking-wider text-slate-500">Theme Color</label>
                <div className="flex gap-2">
                    {['#ffaa00', '#ff0000', '#00ff00', '#00ffff', '#ffffff'].map(c => (
                        <button
                            key={c}
                            className={`w-8 h-8 rounded-full border-2 ${config.color === c ? 'border-white' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                            onClick={() => handleChange('color', c)}
                        />
                    ))}
                    <input
                        type="color"
                        value={config.color}
                        onChange={(e) => handleChange('color', e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent"
                    />
                </div>
            </div>

            {/* --- Asset Selector --- */}
            <div className="mb-6 space-y-2">
                <label className="block text-xs uppercase tracking-wider text-slate-500">Target Asset</label>
                <select
                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white"
                    value={config.asset.id}
                    onChange={(e) => {
                        const selected = TRENCH_ASSETS.find(a => a.id === e.target.value);
                        if (selected) handleChange('asset', selected);
                    }}
                >
                    {TRENCH_ASSETS.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                </select>
            </div>

            {/* --- Sliders --- */}
            <div className="mb-6 space-y-4">

                {/* Rotation */}
                <div>
                    <div className="flex justify-between mb-1">
                        <label>Rotation Speed</label>
                        <span>{config.rotationSpeed}</span>
                    </div>
                    <input
                        type="range" min="0" max="20" step="0.5"
                        value={config.rotationSpeed}
                        className="w-full accent-slate-500"
                        onChange={(e) => handleChange('rotationSpeed', parseFloat(e.target.value))}
                    />
                </div>

                {/* Grid Size */}
                <div>
                    <div className="flex justify-between mb-1">
                        <label>Grid Density</label>
                        <span>{config.gridSize}px</span>
                    </div>
                    <input
                        type="range" min="20" max="200" step="10"
                        value={config.gridSize}
                        className="w-full accent-slate-500"
                        onChange={(e) => handleChange('gridSize', parseFloat(e.target.value))}
                    />
                </div>

                {/* Scale */}
                <div>
                    <div className="flex justify-between mb-1">
                        <label>Target Scale</label>
                        <span>{config.scale.toFixed(1)}x</span>
                    </div>
                    <input
                        type="range" min="0.5" max="3" step="0.1"
                        value={config.scale}
                        className="w-full accent-slate-500"
                        onChange={(e) => handleChange('scale', parseFloat(e.target.value))}
                    />
                </div>

            </div>

            {/* --- Toggles --- */}
            <div className="mb-6 space-y-2">
                <label className="flex items-center gap-3 p-3 bg-slate-800 rounded border border-slate-600 cursor-pointer hover:bg-slate-700 transition">
                    <input
                        type="checkbox"
                        checked={config.isLocked}
                        onChange={(e) => handleChange('isLocked', e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className={`font-bold ${config.isLocked ? 'text-red-500' : 'text-slate-400'}`}>
                        {config.isLocked ? 'SYSTEM LOCKED' : 'ACQUIRING...'}
                    </span>
                </label>
            </div>

            {/* --- Distance Sim --- */}
            <div className="text-xs text-slate-500 mt-10 mb-6">
                * Distance auto-simulates when not paused.
            </div>

            {/* --- Actions --- */}
            <div className="border-t border-slate-700 pt-6">
                <button
                    onClick={onCinematic}
                    className="w-full py-3 bg-red-900/50 border border-red-500/50 text-red-200 rounded font-bold hover:bg-red-500 hover:text-white transition flex items-center justify-center gap-2"
                >
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    CINEMATIC MODE
                </button>
                <p className="text-center text-[10px] text-slate-500 mt-2 uppercase">Hides UI for Screen Recording</p>
            </div>

        </div>
    );
};
