import { NextResponse } from 'next/server';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { runSentinel } from "@/lib/services/nws-sentinel";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authError = authorizeCronRequest(request);
    if (authError) return authError;

    // 1. Run The Sentinel (Checks all 3 zones)
    const results = await runSentinel();

    return NextResponse.json({
        message: "Sentinel Scan Completed",
        timestamp: new Date().toISOString(),
        details: results
    });
}
