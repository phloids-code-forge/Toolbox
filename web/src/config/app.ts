/**
 * Centralized App Configuration
 * The single source of truth for Weather Wars settings.
 */

import { CITIES, CityConfig } from './cities';

// ============================================
// ACTIVE LOCATION
// ============================================
const ACTIVE_CITY_ID = 'okc';

export const ACTIVE_CITY: CityConfig = CITIES.find(c => c.id === ACTIVE_CITY_ID) || CITIES[0];

// ============================================
// NWS ZONES (For Sentinel alert monitoring)
// These zones triangulate around the active city
// ============================================
export const NWS_ZONES: Record<string, string[]> = {
    okc: ['OKZ025', 'OKZ030', 'OKZ031'],    // Oklahoma, Pottawatomie, Seminole
    tulsa: ['OKZ060', 'OKZ061', 'OKZ062'],   // Tulsa area (placeholder)
    atl: ['GAZ044', 'GAZ045'],               // Atlanta area (placeholder)
    kearney: ['NEZ050', 'NEZ051'],           // Kearney area (placeholder)
};

export const TARGET_ZONES = NWS_ZONES[ACTIVE_CITY_ID] || NWS_ZONES['okc'];

// ============================================
// TIMING
// ============================================
export const REFRESH_INTERVALS = {
    snapshots: 5 * 60 * 1000,   // 5 minutes
    alerts: 60 * 1000,          // 1 minute (critical)
    dashboard: 30 * 1000,       // 30 seconds UI refresh
};

// ============================================
// FEATURE FLAGS
// ============================================
export const FEATURES = {
    enableScraping: true,
    enableAlerts: true,
    debugMode: process.env.NODE_ENV === 'development',
};

// ============================================
// SOURCES CONFIGURATION
// Which data sources are active
// ============================================
export const ENABLED_SOURCES = [
    'nws-okc',
    'kwtv',
    // 'kfor',  // Disabled - 403 blocks
    'open_meteo',
    'openweathermap',
    'weatherapi',
];

// ============================================
// API ENDPOINTS (for reference/documentation)
// ============================================
export const API_ENDPOINTS = {
    nws: 'https://api.weather.gov',
    openMeteo: 'https://api.open-meteo.com/v1',
    openWeatherMap: 'https://api.openweathermap.org/data/2.5',
    weatherApi: 'https://api.weatherapi.com/v1',
};
