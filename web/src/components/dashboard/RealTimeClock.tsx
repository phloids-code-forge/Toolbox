"use client";

import { useState, useEffect } from "react";

export function RealTimeClock() {
    const [time, setTime] = useState<string>("--:-- --");
    const [date, setDate] = useState<string>("");

    useEffect(() => {
        const update = () => {
            const now = new Date();

            // Time: "8:52 PM" (no leading zero, no seconds)
            setTime(now.toLocaleTimeString('en-US', {
                hour12: true,
                hour: 'numeric',  // 'numeric' removes leading zero
                minute: '2-digit'
            }));

            // Date: "Sun, Jan 12, 2026"
            setDate(now.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }));
        };

        update(); // Init
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center">
            <div className="font-mono tracking-widest font-bold">
                {time}
            </div>
            <div className="text-slate-400 text-lg md:text-xl font-bold mt-2 md:mt-4 tracking-wide opacity-80">
                {date}
            </div>
        </div>
    );
}
