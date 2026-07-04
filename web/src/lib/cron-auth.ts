import { NextResponse } from 'next/server';

/**
 * Shared guard for scheduled cron endpoints.
 *
 * In production, CRON_SECRET must be configured and the request must include
 * Authorization: Bearer <CRON_SECRET>. Local development remains callable when
 * CRON_SECRET is unset so developers can run smoke checks intentionally.
 */
export function authorizeCronRequest(request: Request): NextResponse | null {
    const cronSecret = process.env.CRON_SECRET;
    const isProduction = process.env.NODE_ENV === 'production';

    if (!cronSecret) {
        if (isProduction) {
            return NextResponse.json(
                { error: 'Cron secret is not configured.' },
                { status: 500 }
            );
        }

        return null;
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return null;
}
