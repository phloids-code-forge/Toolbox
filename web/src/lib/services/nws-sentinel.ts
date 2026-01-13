import { saveActiveAlerts } from "@/app/actions/db-manage";
import { TARGET_ZONES } from "@/config/app";

// Re-export for backwards compatibility
export { TARGET_ZONES };

export async function checkZoneAlerts(zoneId: string) {
    const url = `https://api.weather.gov/alerts/active?zone=${zoneId}`;

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': '(weather-wars-app, contact@phloid.com)', // NWS requires strict User-Agent
                'Accept': 'application/geo+json'
            },
            next: { revalidate: 0 } // No cache for alerts!
        });

        if (!res.ok) {
            throw new Error(`NWS API Error: ${res.statusText}`);
        }

        const data = await res.json();
        const features = data.features || [];

        // Save to DB (Sync)
        const saveRes = await saveActiveAlerts(zoneId, features);

        return {
            zone: zoneId,
            count: features.length,
            success: saveRes.success,
            error: saveRes.error
        };

    } catch (e: any) {
        console.error(`Sentinel Error [${zoneId}]:`, e);
        return { zone: zoneId, success: false, error: e.message };
    }
}

export async function runSentinel() {
    const results = [];
    for (const zone of TARGET_ZONES) {
        const res = await checkZoneAlerts(zone);
        results.push(res);
    }
    return results;
}
