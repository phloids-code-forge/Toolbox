import { NextResponse } from 'next/server';
import { saveSnapshot } from '@/app/actions/db-manage';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { runAllScrapers } from '@/lib/scraper/engine';
import { runSentinel } from "@/lib/services/nws-sentinel";

// Prevent Vercel from caching this route (it must run fresh every time)
export const dynamic = 'force-dynamic';

type SaveResult = {
    id: string;
    saved: boolean;
    error?: string;
    scrape_error?: string;
};

export async function GET(request: Request) {
    const authError = authorizeCronRequest(request);
    if (authError) return authError;

    try {
        const startTime = Date.now();

        // 2. PARALLEL EXECUTION: Scrape Data AND Check Alerts
        // Since we are on Pro (60s limit), parallel is safer to save time.
        const [scrapeResults, sentinelResults] = await Promise.all([
            runAllScrapers(),
            runSentinel()
        ]);

        const saveResults: SaveResult[] = [];

        // 3. Save Scraper Data
        for (const result of scrapeResults) {
            if (result.success) {
                const save = await saveSnapshot(result);
                saveResults.push({ id: result.sourceId, saved: save.success, error: save.error });
            } else {
                saveResults.push({ id: result.sourceId, saved: false, scrape_error: result.error });
            }
        }

        const duration = Date.now() - startTime;

        return NextResponse.json({
            message: "Unified Cycle Completed (10-min)",
            duration_ms: duration,
            scrapers: saveResults,
            sentinel: sentinelResults
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown cron error';
        console.error("Cron Fatal Error:", error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
