"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
    const { theme, toggleTheme, mounted } = useTheme();

    // Show placeholder during SSR/hydration to prevent mismatch
    if (!mounted) {
        return (
            <div className="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--border)]" />
        );
    }

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-all duration-300 group"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            {theme === "dark" ? (
                <Sun className="w-4 h-4 text-yellow-400 group-hover:rotate-45 transition-transform" />
            ) : (
                <Moon className="w-4 h-4 text-slate-600 group-hover:-rotate-12 transition-transform" />
            )}
        </button>
    );
}
