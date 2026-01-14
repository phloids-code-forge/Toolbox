"use client";

import { X, GraduationCap } from "lucide-react";

interface UniversityModalProps {
    topic: string; // "soil_temp", "soil_moisture", "uv_index", "pressure"
    onClose: () => void;
}

// THE CURRICULUM (Hardcoded for now, essentially "The Professor's" Brain)
const CURRICULUM: Record<string, { title: string; def: string; take: string }> = {
    'soil_temp': {
        title: "Soil Temperature",
        def: "Simple measurement of how warm the earth is at a depth of 2-6 inches.",
        take: "Listen up! It's not dirt, it's a living lasagna. Right now, that lasagna is either frozen or ready to party. Morels wake up at 50°F. If it's colder than that, stay inside and read a book."
    },
    'soil_moisture': {
        title: "Soil Moisture",
        def: "Volumetric water content in the soil. 0.0 is dust, 0.5 is mud.",
        take: "Your tomatoes are screaming. Can you hear them? They desire hydration. If this number is low, your garden is basically the Sahara. Go fix it."
    },
    'uv_index': {
        title: "UV Index",
        def: "International standard measurement of the strength of sunburn-producing ultraviolet radiation.",
        take: "The sun is a deadly laser. Level 1-2 is fine. Level 8+ means you turn into bacon. Wear the hat. Wear the screen. Don't be a hero."
    },
    'pressure': {
        title: "Barometric Pressure",
        def: "The weight of the atmosphere pressing down on the earth's surface.",
        take: "It's just the air hugging you. Low pressure means the hug is loose and storms can sneak in (and your knees might hurt). High pressure means the sky is heavy and happy."
    }
};

export function UniversityModal({ topic, onClose }: UniversityModalProps) {
    const lesson = CURRICULUM[topic] || {
        title: "Unknown Variable",
        def: "Data not found.",
        take: "I have no idea what this is. Good luck."
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border-2 border-slate-700/50 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="bg-slate-800/50 p-6 flex items-start gap-4 border-b border-slate-700/50">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                        <GraduationCap className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div className="flex-grow">
                        <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">The University</h4>
                        <h2 className="text-2xl font-bold text-white tracking-tight">{lesson.title}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Definition */}
                    <div className="space-y-2">
                        <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest"> The Textbook Definition</h5>
                        <p className="text-slate-300 font-serif italic text-lg leading-relaxed border-l-2 border-slate-700 pl-4">
                            "{lesson.def}"
                        </p>
                    </div>

                    {/* The Professor's Take */}
                    <div className="bg-emerald-900/10 rounded-xl p-4 border border-emerald-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <GraduationCap className="w-24 h-24 text-emerald-500" />
                        </div>
                        <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2 relative z-10">The Professor's Take</h5>
                        <p className="text-emerald-100 font-medium leading-relaxed relative z-10">
                            {lesson.take}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-black/20 p-4 text-center">
                    <span className="text-[10px] text-slate-600 font-mono">CLASS DISMISSED // CLICK TO CLOSE</span>
                </div>
            </div>

            {/* Backdrop click to close */}
            <div className="absolute inset-0 z-[-1]" onClick={onClose} />
        </div>
    );
}
