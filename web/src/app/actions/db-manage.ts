"use server";

import { sql } from '@vercel/postgres';

export async function initDatabase() {
    try {
        // Enable UUID extension if needed (often built-in to modern PG but good to checking)
        // Actually modern PG uses gen_random_uuid() without extension usually, 
        // but "uuid-ossp" is the classic. Let's try native first.

        await sql`
      CREATE TABLE IF NOT EXISTS weather_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        station_id VARCHAR(50) NOT NULL,
        scraped_at TIMESTAMP WITH TIME ZONE NOT NULL,
        forecast_data JSONB, 
        success BOOLEAN DEFAULT TRUE,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

        await sql`
      CREATE INDEX IF NOT EXISTS idx_snapshots_station_time 
      ON weather_snapshots(station_id, scraped_at DESC);
    `;

        // ALERT TABLE (THE SENTINEL)
        await sql`
            CREATE TABLE IF NOT EXISTS nws_alerts (
                id VARCHAR(255) PRIMARY KEY, -- NWS ID
                zone_id VARCHAR(50) NOT NULL,
                event VARCHAR(100) NOT NULL, -- "Tornado Warning"
                severity VARCHAR(50) NOT NULL, -- "Severe", "Extreme"
                headline TEXT,
                description TEXT,
                instruction TEXT,
                effective_at TIMESTAMP WITH TIME ZONE,
                expires_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_alerts_zone_expires ON nws_alerts(zone_id, expires_at);`;

        return { success: true, message: "Schema initialized successfully." };
    } catch (e: any) {
        console.error("DB Init Error:", e);
        return { success: false, error: e.message };
    }
}

// --- ALERT MANAGEMENT (THE SENTINEL) ---
// Note: nws_alerts table creation handled by initDatabase()

export async function saveActiveAlerts(zoneId: string, alerts: any[]) {
    try {
        // 1. Clear old alerts for this zone (We assume the API gives us the complete "Active" list)
        // Or cleaner: Delete anything that is NOT in the new list, or simpler: Delete all for zone and re-insert.
        // NWS IDs are unique. Let's try upsert or simple "Delete inactive".
        // Strategy: "Sync". The feed returns ALL active alerts.
        // If an alert is no longer in the feed, it's expired/cancelled.

        // However, to keep history, maybe we don't delete? 
        // For V1 "Sentinel", we just want the active State.
        // Let's Delete all for this Zone, then Insert Fresh. (Atomic replacement for the zone).

        await sql`DELETE FROM nws_alerts WHERE zone_id = ${zoneId}`;

        for (const alert of alerts) {
            await sql`
                INSERT INTO nws_alerts (
                    id, zone_id, event, severity, headline, description, instruction, effective_at, expires_at
                ) VALUES (
                    ${alert.id}, ${zoneId}, ${alert.properties.event}, ${alert.properties.severity},
                    ${alert.properties.headline}, ${alert.properties.description}, ${alert.properties.instruction},
                    ${alert.properties.effective}, ${alert.properties.expires}
                )
            `;
        }
        return { success: true };
    } catch (e: any) {
        console.error(`Failed to save alerts for ${zoneId}:`, e);
        return { success: false, error: e.message };
    }
}

export async function getActiveAlerts(zoneIds: string[]) {
    try {
        // Fetch alerts for these zones that haven't expired
        // arrays in postgres can be tricky with templating, let's loop or use ANY
        // simple approach:
        const { rows } = await sql`
            SELECT * FROM nws_alerts 
            WHERE zone_id = ANY(${zoneIds as any})
            AND expires_at > NOW()
            ORDER BY severity DESC, expires_at ASC
        `;
        return { success: true, data: rows };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function checkDbStatus() {
    try {
        const { rows } = await sql`
      SELECT count(*) as count FROM weather_snapshots;
    `;
        return { success: true, count: rows[0].count };
    } catch (e: any) {
        if (e.message.includes('does not exist')) {
            return { success: true, count: 'Table missing' };
        }
        return { success: false, error: e.message };
    }
}

import { WeatherSnapshot } from '@/lib/scraper/types';

export async function saveSnapshot(data: WeatherSnapshot) {
    try {
        await sql`
            INSERT INTO weather_snapshots (
                station_id, 
                scraped_at, 
                forecast_data, 
                success, 
                error_message
            ) VALUES (
                ${data.sourceId}, 
                ${data.scrapedAt}, 
                ${JSON.stringify(data.forecast || {})}, 
                ${data.success}, 
                ${data.error || null}
            )
        `;
        return { success: true };
    } catch (e: any) {
        console.error("Failed to save snapshot:", e);
        return { success: false, error: e.message };
    }
}
// Fetch the single most recent snapshot for EACH station
export async function getLatestSnapshots() {
    try {
        // Postgres "DISTINCT ON" is perfect for "get latest row per group"
        const { rows } = await sql`
            SELECT DISTINCT ON (station_id) *
            FROM weather_snapshots
            WHERE success = true
            ORDER BY station_id, scraped_at DESC;
        `;
        return { success: true, data: rows };
    } catch (e: any) {
        console.error("Failed to fetch latest snapshots:", e);
        return { success: false, error: e.message };
    }
}

// Fetch active alerts for dashboard (uses TARGET_ZONES from config)
import { TARGET_ZONES } from '@/config/app';

export async function getActiveAlertsForDashboard() {
    try {
        const { rows } = await sql`
            SELECT *
            FROM nws_alerts
            WHERE zone_id = ANY(${TARGET_ZONES as any})
            AND expires_at > NOW()
            ORDER BY 
                CASE 
                    WHEN event ILIKE '%tornado%' THEN 1
                    WHEN event ILIKE '%severe%' THEN 2
                    WHEN severity = 'Extreme' THEN 3
                    ELSE 4
                END,
                effective_at DESC;
        `;
        return { success: true, data: rows };
    } catch (e: any) {
        console.error("Failed to fetch active alerts:", e);
        return { success: false, error: e.message, data: [] };
    }
}

