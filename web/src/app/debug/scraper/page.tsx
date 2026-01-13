"use client";

import { useState } from "react";
import { testScrapeFn } from "@/app/actions/test-scrape";
import { FadeIn } from "@/components/ui/transitions";

export default function ScraperDebugPage() {
    const [results, setResults] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const runTest = async (id: string) => {
        setLoading(true);
        setResults(null);
        try {
            const data = await testScrapeFn(id);
            setResults(data);
        } catch (e) {
            setResults({ error: "Failed to invoke server action" });
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen p-8 bg-slate-950 font-[family-name:var(--font-geist-sans)]">
            <h1 className="text-3xl font-bold mb-8 font-[family-name:var(--font-space-grotesk)] text-slate-100">
                Scraper Lab 🔬
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Controls */}
                <FadeIn className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                    <h2 className="text-xl font-semibold mb-4 text-slate-300">Target Station</h2>
                    <div className="flex gap-4">
                        <button
                            onClick={() => runTest('kfor')}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                        >
                            Test KFOR (NBC)
                        </button>
                        <button
                            onClick={() => runTest('kwtv')}
                            disabled={loading}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                        >
                            Test KWTV (CBS)
                        </button>
                        <button
                            onClick={() => runTest('nws')}
                            disabled={loading}
                            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                        >
                            Test NWS (Truth)
                        </button>
                        <button
                            onClick={() => runTest('open_meteo')}
                            disabled={loading}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                        >
                            Test Open-Meteo
                        </button>
                        <button
                            onClick={() => runTest('openweathermap')}
                            disabled={loading}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                        >
                            Test OWM
                        </button>
                        <button
                            onClick={() => runTest('weatherapi')}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                        >
                            Test WeatherAPI
                        </button>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-800">
                        <div className="p-4 bg-yellow-950/30 border border-yellow-700/50 rounded-lg">
                            <h3 className="text-yellow-500 font-bold mb-2 text-sm uppercase tracking-wider">
                                🚧 Regarding Missing Sources
                            </h3>
                            <p className="text-slate-400 text-sm leading-relaxed italic">
                                "We attempted to audit every major weather source. However, some providers are simply
                                <span className="text-amber-500 font-bold"> too chicken </span>
                                to allow independent verification, hiding behind anti-bot armor. We have marked them as
                                <span className="text-red-400 font-bold"> DNF</span>.
                                (No offense to actual chickens 🐔)."
                            </p>
                        </div>
                    </div>
                </FadeIn>

                {/* Output */}
                <FadeIn delay={0.1} className="bg-black border border-slate-800 p-6 rounded-xl font-mono text-sm">
                    <h2 className="text-slate-500 mb-4 uppercase tracking-wider text-xs">Console Output</h2>
                    {loading && <div className="text-yellow-400 animate-pulse">Running scraper...</div>}

                    {results && (
                        <pre className={`whitespace-pre-wrap ${results.success ? 'text-green-400' : 'text-red-400'}`}>
                            {JSON.stringify(results, null, 2)}
                        </pre>
                    )}

                    {!loading && !results && (
                        <div className="text-slate-600 italic">Waiting for input...</div>
                    )}
                </FadeIn>
            </div>
        </div>
    );
}
