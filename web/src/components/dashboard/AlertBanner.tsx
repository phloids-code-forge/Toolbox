"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { getActiveAlertsForDashboard } from "@/app/actions/db-manage";

interface NWSAlert {
    id: string;
    event: string;
    severity: string;
    headline: string;
    description: string;
    instruction: string;
    expires_at: string;
}

// Map event types to styles
const getAlertStyle = (event: string) => {
    const lower = event.toLowerCase();
    if (lower.includes('tornado')) {
        return { bg: 'bg-red-600', border: 'border-red-500', icon: '🌪️' };
    }
    if (lower.includes('severe thunderstorm')) {
        return { bg: 'bg-orange-600', border: 'border-orange-500', icon: '⛈️' };
    }
    if (lower.includes('winter') || lower.includes('blizzard') || lower.includes('ice')) {
        return { bg: 'bg-blue-600', border: 'border-blue-500', icon: '❄️' };
    }
    if (lower.includes('flood')) {
        return { bg: 'bg-cyan-600', border: 'border-cyan-500', icon: '🌊' };
    }
    if (lower.includes('heat')) {
        return { bg: 'bg-amber-600', border: 'border-amber-500', icon: '🔥' };
    }
    // Default warning style
    return { bg: 'bg-yellow-600', border: 'border-yellow-500', icon: '⚠️' };
};

export function AlertBanner() {
    const [alerts, setAlerts] = useState<NWSAlert[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        async function fetchAlerts() {
            const res = await getActiveAlertsForDashboard();
            if (res.success && res.data) {
                setAlerts(res.data as NWSAlert[]);
            }
        }

        // Initial fetch
        fetchAlerts();

        // Poll every 30 seconds
        const interval = setInterval(fetchAlerts, 30000);
        return () => clearInterval(interval);
    }, []);

    // Filter out dismissed alerts
    const activeAlerts = alerts.filter(a => !dismissed.has(a.id));

    if (activeAlerts.length === 0) return null;

    // Show the most severe alert at top
    const topAlert = activeAlerts[0];
    const style = getAlertStyle(topAlert.event);

    return (
        <div className={`fixed top-0 left-0 right-0 z-50 ${style.bg} border-b-4 ${style.border}`}>
            <div className="max-w-6xl mx-auto p-3 md:p-4">
                {/* Main alert */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 text-white animate-pulse flex-shrink-0 mt-0.5" />
                        <div className="flex-grow">
                            <div className="text-white font-black text-sm md:text-lg tracking-wide flex items-center gap-2">
                                <span>{style.icon}</span>
                                <span>{topAlert.event.toUpperCase()}</span>
                            </div>
                            <div className="text-white/90 text-xs md:text-sm mt-1">
                                {topAlert.headline}
                            </div>

                            {/* Expandable details */}
                            {expanded === topAlert.id && (
                                <div className="mt-3 text-white/80 text-xs leading-relaxed max-h-40 overflow-y-auto">
                                    {topAlert.instruction && (
                                        <p className="font-bold mb-2">⚡ {topAlert.instruction}</p>
                                    )}
                                    <p>{topAlert.description}</p>
                                </div>
                            )}

                            <button
                                onClick={() => setExpanded(expanded === topAlert.id ? null : topAlert.id)}
                                className="text-white/70 text-xs mt-2 hover:text-white underline"
                            >
                                {expanded === topAlert.id ? 'Hide details' : 'Show details'}
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => setDismissed(prev => new Set(prev).add(topAlert.id))}
                        className="p-2 bg-black/30 rounded-lg hover:bg-black/50 flex-shrink-0"
                        title="Dismiss this alert"
                    >
                        <X className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </button>
                </div>

                {/* Additional alerts count */}
                {activeAlerts.length > 1 && (
                    <div className="mt-2 pt-2 border-t border-white/20 text-white/70 text-xs">
                        +{activeAlerts.length - 1} more alert{activeAlerts.length > 2 ? 's' : ''} active
                    </div>
                )}
            </div>
        </div>
    );
}
