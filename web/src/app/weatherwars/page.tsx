"use client";

import { useState } from "react";
import { SplashScreen } from "@/components/dashboard/SplashScreen";
import { ClockFace } from "@/components/dashboard/ClockFace";

// Metadata removed - handled in layout.tsx

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden selection:bg-emerald-500/30">

      {/* 1. The Intro */}
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      {/* 2. The App (Always mounted in background or mounts after? 
             Let's mount after to avoid heavy load animation during splash if desired.
             Or mount hidden to prefetch. Simple conditional is fine for V1. 
      */}

      {!showSplash && (
        <div className="animate-in fade-in duration-1000 slide-in-from-bottom-4">
          <div className="py-12">
            <ClockFace />
          </div>
        </div>
      )}

    </main>
  );
}

