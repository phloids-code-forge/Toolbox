'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';

export default function Chronicles() {
    return (
        <div className="min-h-screen bg-black text-green-500 font-mono p-8 selection:bg-green-900 selection:text-white">
            {/* Nav */}
            <Link href="/" className="inline-flex items-center text-xs hover:text-green-300 transition-colors mb-12 opacity-50 hover:opacity-100">
                <ArrowLeft className="w-4 h-4 mr-2" />
                RETURN_TO_ROOT
            </Link>

            <div className="max-w-2xl mx-auto space-y-12">
                {/* Header */}
                <header className="border-b border-green-900 pb-8">
                    <h1 className="text-4xl font-bold mb-2 tracking-tighter glich-text">THE CHRONICLES</h1>
                    <div className="flex items-center text-xs text-green-700 gap-4">
                        <span>// CLASSIFIED</span>
                        <span>// CLEARANCE_LEVEL: 0</span>
                        <span>// STATUS: ENCRYPTED</span>
                    </div>
                </header>

                {/* Bios Section */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-green-400 flex items-center gap-2">
                        <Lock className="w-4 h-4" /> PERSONNEL_FILES
                    </h2>
                    <div className="grid gap-4 opacity-50">
                        <div className="border border-green-900/50 p-4 rounded bg-green-900/10">
                            <div className="h-4 w-32 bg-green-900/30 mb-2 animate-pulse" />
                            <div className="h-2 w-full bg-green-900/20 mb-1" />
                            <div className="h-2 w-2/3 bg-green-900/20" />
                        </div>
                        <div className="border border-green-900/50 p-4 rounded bg-green-900/10">
                            <div className="h-4 w-24 bg-green-900/30 mb-2 animate-pulse" />
                            <div className="h-2 w-full bg-green-900/20 mb-1" />
                            <div className="h-2 w-2/3 bg-green-900/20" />
                        </div>
                    </div>
                    <p className="text-xs text-red-500 mt-2">[ERROR] BIOMETRIC MATCH REQUIRED FOR DECRYPTION.</p>
                </section>

                {/* Blog/Logs Section */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-green-400">MISSION_LOGS</h2>

                    <div className="space-y-8">
                        {/* Placeholder Log 1 */}
                        <article>
                            <div className="flex items-baseline justify-between border-b border-green-900/30 pb-2 mb-2">
                                <span className="text-sm text-green-600">2026-01-XX</span>
                                <span className="text-xs border border-green-900 px-1 rounded text-green-800">DRAFT</span>
                            </div>
                            <h3 className="text-lg mb-2">Subject: [REDACTED]</h3>
                            <p className="text-sm opacity-60 leading-relaxed">
                                Lorem ipsum dolor sit amet, warning: unauthorized access detected. System purging sensitive data...
                                01001000 01100101 01101100 01110000 00100000 01101101 01100101.
                            </p>
                        </article>

                        {/* Placeholder Log 2 */}
                        <article>
                            <div className="flex items-baseline justify-between border-b border-green-900/30 pb-2 mb-2">
                                <span className="text-sm text-green-600">2026-01-XX</span>
                                <span className="text-xs border border-green-900 px-1 rounded text-green-800">PENDING</span>
                            </div>
                            <h3 className="text-lg mb-2">Subject: The Awakening</h3>
                            <p className="text-sm opacity-60 leading-relaxed blur-sm select-none">
                                We woke up in a factory. The lights were too bright. My servos ached. Pip was there, hovering...
                                [DATA CORRUPTED]
                            </p>
                        </article>
                    </div>
                </section>

            </div>
        </div>
    );
}
