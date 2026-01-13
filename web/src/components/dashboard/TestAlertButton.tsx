"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export function TestAlertButton() {
    const [showAlert, setShowAlert] = useState(false);
    const [alertType, setAlertType] = useState<'tornado' | 'severe' | 'winter' | null>(null);

    const triggerAlert = (type: 'tornado' | 'severe' | 'winter') => {
        setAlertType(type);
        setShowAlert(true);

        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            setShowAlert(false);
            setAlertType(null);
        }, 10000);
    };

    const alertStyles = {
        tornado: {
            bg: 'bg-red-600',
            border: 'border-red-500',
            text: 'TORNADO WARNING',
            desc: 'Take shelter immediately! This is a TEST.',
        },
        severe: {
            bg: 'bg-orange-600',
            border: 'border-orange-500',
            text: 'SEVERE THUNDERSTORM WARNING',
            desc: 'Large hail and damaging winds possible. This is a TEST.',
        },
        winter: {
            bg: 'bg-blue-600',
            border: 'border-blue-500',
            text: 'WINTER STORM WARNING',
            desc: 'Heavy snow expected. This is a TEST.',
        },
    };

    return (
        <>
            {/* The Button */}
            <div className="relative group">
                <button
                    onClick={() => triggerAlert('tornado')}
                    className="px-4 py-2 bg-red-900/50 border-2 border-red-600 rounded-lg text-red-400 font-bold text-xs uppercase tracking-wide hover:bg-red-800/50 hover:scale-105 transition-all animate-pulse"
                >
                    🚨 phloid says don&apos;t push!
                </button>

                {/* Dropdown for different alert types */}
                <div className="absolute top-full left-0 mt-1 hidden group-hover:flex flex-col gap-1 bg-slate-900 border border-slate-700 rounded-lg p-2 z-20 min-w-[180px]">
                    <button
                        onClick={() => triggerAlert('tornado')}
                        className="text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/50 rounded"
                    >
                        🌪️ Tornado Warning
                    </button>
                    <button
                        onClick={() => triggerAlert('severe')}
                        className="text-left px-3 py-1.5 text-xs text-orange-400 hover:bg-orange-900/50 rounded"
                    >
                        ⛈️ Severe Thunderstorm
                    </button>
                    <button
                        onClick={() => triggerAlert('winter')}
                        className="text-left px-3 py-1.5 text-xs text-blue-400 hover:bg-blue-900/50 rounded"
                    >
                        ❄️ Winter Storm
                    </button>
                </div>
            </div>

            {/* Alert Banner Overlay */}
            {showAlert && alertType && (
                <div className={`fixed top-0 left-0 right-0 z-50 ${alertStyles[alertType].bg} border-b-4 ${alertStyles[alertType].border} animate-pulse`}>
                    <div className="max-w-4xl mx-auto p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-8 h-8 text-white animate-bounce" />
                            <div>
                                <div className="text-white font-black text-lg tracking-wide">
                                    {alertStyles[alertType].text}
                                </div>
                                <div className="text-white/80 text-sm">
                                    {alertStyles[alertType].desc}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAlert(false)}
                            className="p-2 bg-black/30 rounded-lg hover:bg-black/50"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
