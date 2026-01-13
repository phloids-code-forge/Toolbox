"use client";

import { useState, useEffect } from "react";
import { initDatabase, checkDbStatus } from "@/app/actions/db-manage";
import { FadeIn } from "@/components/ui/transitions";

export default function DbDebugPage() {
    const [status, setStatus] = useState<string>("Checking...");
    const [loading, setLoading] = useState(false);

    const refreshStatus = async () => {
        const res = await checkDbStatus();
        if (res.success) {
            setStatus(`Row Count: ${res.count}`);
        } else {
            setStatus(`Error: ${res.error}`);
        }
    };

    useEffect(() => {
        refreshStatus();
    }, []);

    const handleInit = async () => {
        setLoading(true);
        const res = await initDatabase();
        if (res.success) {
            alert(res.message);
        } else {
            alert("Failed: " + res.error);
        }
        await refreshStatus();
        setLoading(false);
    };

    return (
        <div className="min-h-screen p-8 bg-slate-950 font-[family-name:var(--font-geist-sans)] text-slate-100">
            <h1 className="text-3xl font-bold mb-8 font-[family-name:var(--font-space-grotesk)]">
                Database Control 🛢️
            </h1>

            <FadeIn className="max-w-xl mx-auto bg-slate-900 border border-slate-800 p-8 rounded-xl">
                <div className="flex items-center justify-between mb-8">
                    <span className="text-slate-400">Current Status:</span>
                    <span className="text-xl font-mono text-blue-400">{status}</span>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={handleInit}
                        disabled={loading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-bold transition-all"
                    >
                        {loading ? "Initializing..." : "Initialize Schema (Create Tables)"}
                    </button>

                    <p className="text-xs text-slate-500 text-center">
                        This will create the tables if they don't exist. It will NOT delete existing data.
                    </p>
                </div>
            </FadeIn>
        </div>
    );
}
