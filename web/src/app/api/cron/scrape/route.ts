import { NextResponse } from 'next/server';
import { runAllScrapers } from '@/lib/scraper/engine';
import { saveSnapshot, checkDbStatus } from '@/app/actions/db-manage';
import { runSentinel } from "@/lib/services/nws-sentinel";


// Prevent Vercel from caching this route (it must run fresh every time)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // 1. Authorization Check (Basic Security)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const startTime = Date.now();

        // 2. PARALLEL EXECUTION: Scrape Data AND Check Alerts
        // Since we are on Pro (60s limit), parallel is safer to save time.
        const [scrapeResults, sentinelResults] = await Promise.all([
            runAllScrapers(),
            runSentinel()
        ]);

        const saveResults: any[] = [];

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

    } catch (error: any) {
        console.error("Cron Fatal Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
