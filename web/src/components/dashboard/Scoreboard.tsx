"use client";

// Scoreboard showing ranked accuracy of sources
// For now, uses placeholder data - will be calculated from historical forecasts later

interface ScoreEntry {
    sourceId: string;
    name: string;
    accuracy: number;
    color: string;
}

const PLACEHOLDER_SCORES: ScoreEntry[] = [
    { sourceId: 'open_meteo', name: 'Open-Meteo', accuracy: 94, color: 'text-purple-400' },
    { sourceId: 'weatherapi', name: 'WeatherAPI', accuracy: 91, color: 'text-blue-400' },
    { sourceId: 'openweathermap', name: 'OpenWeather', accuracy: 88, color: 'text-orange-400' },
    { sourceId: 'kwtv', name: 'News 9', accuracy: 85, color: 'text-red-400' },
];

export function Scoreboard() {
    return (
        <div className="bg-slate-900/30 rounded-2xl p-4 border border-slate-800">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-4">
                Accuracy Ranking
            </h3>

            <div className="space-y-2">
                {PLACEHOLDER_SCORES.map((score, i) => (
                    <div key={score.sourceId} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-600 font-mono text-sm w-5">{i + 1}.</span>
                            <span className={`font-bold ${score.color}`}>{score.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${score.accuracy >= 90 ? 'bg-emerald-500' :
                                            score.accuracy >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                    style={{ width: `${score.accuracy}%` }}
                                />
                            </div>
                            <span className="text-white font-mono text-sm w-10 text-right">
                                {score.accuracy}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <p className="text-xs text-slate-600 mt-4 pt-3 border-t border-slate-800">
                Based on high/low forecast vs. observed
            </p>
        </div>
    );
}
