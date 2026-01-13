import { NextResponse } from 'next/server';
import { runSentinel } from "@/lib/services/nws-sentinel";

export const dynamic = 'force-dynamic';

export async function GET() {
    // 1. Run The Sentinel (Checks all 3 zones)
    const results = await runSentinel();

    return NextResponse.json({
        message: "Sentinel Scan Completed",
        timestamp: new Date().toISOString(),
        details: results
    });
}
