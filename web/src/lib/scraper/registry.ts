/**
 * Scraper Registry
 * Dynamic registration system for weather data sources.
 */

import { ScraperDefinition } from './types';
import { ENABLED_SOURCES, FEATURES } from '@/config/app';

// The registry map
const SCRAPER_REGISTRY = new Map<string, ScraperDefinition>();

/**
 * Register a parser with the system.
 * Call this at the bottom of each parser file.
 */
export function registerParser(parser: ScraperDefinition): void {
    SCRAPER_REGISTRY.set(parser.id, parser);

    if (FEATURES.debugMode) {
        console.log(`[Registry] Registered: ${parser.id} (${parser.sourceType})`);
    }
}

/**
 * Get all registered scrapers.
 */
export function getAllScrapers(): ScraperDefinition[] {
    return Array.from(SCRAPER_REGISTRY.values());
}

/**
 * Get only the scrapers that are enabled in config.
 */
export function getActiveScrapers(): ScraperDefinition[] {
    return Array.from(SCRAPER_REGISTRY.values())
        .filter(s => ENABLED_SOURCES.includes(s.id));
}

/**
 * Get a specific scraper by ID.
 */
export function getScraperById(id: string): ScraperDefinition | undefined {
    return SCRAPER_REGISTRY.get(id);
}

/**
 * Check if a scraper is enabled.
 */
export function isScraperEnabled(id: string): boolean {
    return ENABLED_SOURCES.includes(id);
}

/**
 * List all registered scraper IDs.
 */
export function listRegisteredIds(): string[] {
    return Array.from(SCRAPER_REGISTRY.keys());
}
