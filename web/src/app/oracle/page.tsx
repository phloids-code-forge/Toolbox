'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface SystemStatus {
  name: string;
  status: 'online' | 'offline' | 'unknown';
  detail?: string;
  link?: string;
}

export default function OracleDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Random glitch effect
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.95) {
        setGlitch(true);
        setTimeout(() => setGlitch(false), 100);
      }
    }, 500);
    return () => clearInterval(glitchInterval);
  }, []);

  const systems: SystemStatus[] = [
    { name: 'Weather Wars v3', status: 'online', detail: 'Feature Complete', link: '/weatherwars' },
    { name: 'Brain 4.0', status: 'online', detail: '1196 files indexed' },
    { name: 'Clawdbot', status: 'online', detail: 'Discord Active' },
    { name: 'Antigravity', status: 'unknown', detail: 'Check Tailscale' },
    { name: 'Void Typer', status: 'online', link: '/voidtyper' },
    { name: 'Chronicles', status: 'offline', detail: 'LOCKED' },
  ];

  const quickLinks = [
    { name: 'Weather Wars', path: '/weatherwars', icon: '⚡' },
    { name: 'Void Typer', path: '/voidtyper', icon: '🕳️' },
    { name: 'Trench Run', path: '/trench-run', icon: '🎯' },
    { name: 'ezzackly', path: '/ezzackly', icon: '🧶' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-emerald-400';
      case 'offline': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'online': return 'bg-emerald-400 shadow-emerald-400/50';
      case 'offline': return 'bg-red-400 shadow-red-400/50';
      default: return 'bg-yellow-400 shadow-yellow-400/50';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono overflow-hidden">
      {/* Scanlines overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]" 
           style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.1) 2px, rgba(0,255,0,0.1) 4px)' }} />
      
      {/* Grid background */}
      <div className="fixed inset-0 opacity-10"
           style={{ backgroundImage: 'linear-gradient(rgba(0,255,136,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

      <div className="relative z-10 max-w-4xl mx-auto p-6">
        
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-block">
            <h1 className={`text-4xl md:text-6xl font-bold tracking-wider mb-2 ${glitch ? 'translate-x-1 text-red-500' : 'text-emerald-400'}`}
                style={{ textShadow: '0 0 30px rgba(16, 185, 129, 0.5)' }}>
              ORACLE
            </h1>
            <div className="h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
          </div>
          <p className="text-emerald-600 mt-4 tracking-[0.5em] text-xs">PIP OS COMMAND CENTER</p>
        </motion.header>

        {/* Time Display */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-12"
        >
          <div className="text-5xl md:text-7xl font-bold text-emerald-300 tracking-widest"
               style={{ textShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }}>
            {currentTime.toLocaleTimeString('en-US', { hour12: false })}
          </div>
          <div className="text-emerald-600 text-sm mt-2 tracking-wider">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </motion.div>

        {/* System Status Grid */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <h2 className="text-emerald-500 text-xs tracking-[0.3em] mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            SYSTEM STATUS
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {systems.map((system, i) => (
              <motion.div 
                key={system.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                className="bg-emerald-950/30 border border-emerald-900/50 rounded-lg p-4 hover:border-emerald-500/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full shadow-lg ${getStatusDot(system.status)}`} />
                  <span className="text-emerald-100 text-sm font-medium truncate">{system.name}</span>
                </div>
                <div className={`text-xs ${getStatusColor(system.status)}`}>
                  {system.detail || system.status.toUpperCase()}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Quick Links */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-emerald-500 text-xs tracking-[0.3em] mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            QUICK ACCESS
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickLinks.map((link, i) => (
              <Link key={link.path} href={link.path}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                  whileHover={{ scale: 1.02, borderColor: 'rgba(16, 185, 129, 0.8)' }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-black/50 border border-emerald-900/30 rounded-lg p-4 text-center cursor-pointer hover:bg-emerald-950/20 transition-all"
                >
                  <div className="text-2xl mb-2">{link.icon}</div>
                  <div className="text-emerald-300 text-sm">{link.name}</div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* Model Stack */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-12"
        >
          <h2 className="text-emerald-500 text-xs tracking-[0.3em] mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            MODEL STACK
          </h2>
          <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-emerald-400">Primary</span>
              <span className="text-emerald-100 font-medium">Claude Opus 4.5</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-emerald-400">Massive Context</span>
              <span className="text-emerald-100 font-medium">Gemini 3 Pro</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-emerald-400">Backup</span>
              <span className="text-emerald-100 font-medium">OpenRouter</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-emerald-400">Quick Tasks</span>
              <span className="text-emerald-100 font-medium">Haiku 4.5</span>
            </div>
          </div>
        </motion.section>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center text-emerald-800 text-xs tracking-wider"
        >
          <p>PIP OS v1.0 • ORACLE INTERFACE</p>
          <p className="mt-1">"I am listening. I am alive."</p>
        </motion.footer>

      </div>
    </div>
  );
}
