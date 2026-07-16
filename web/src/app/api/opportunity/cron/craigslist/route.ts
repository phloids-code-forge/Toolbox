import { NextResponse } from 'next/server';

import { FastmailCraigslistMailbox, readCraigslistImapConfig } from '@/lib/opportunity/craigslist-mailbox';
import { runCraigslistEmailIntake } from '@/lib/opportunity/craigslist-intake';
import { authorizeOpportunityCron } from '@/lib/opportunity/cron-auth';
import { initializeOpportunityCore } from '@/lib/opportunity/runtime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 45;

export async function GET(request: Request) {
  if (!authorizeOpportunityCron(request.headers.get('authorization'))) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const repository = await initializeOpportunityCore();
    const mailbox = new FastmailCraigslistMailbox(readCraigslistImapConfig());
    const result = await runCraigslistEmailIntake({
      repository,
      mailbox,
      clientSlug: process.env.OPPORTUNITY_CLIENT_SLUG ?? 'mike-rapp',
    });
    const status = result.status === 'failed' ? 503 : result.status === 'partial' ? 207 : 200;
    return NextResponse.json({
      success: result.status === 'ok',
      status: result.status,
      processedMessages: result.processedMessages,
      failedMessages: result.failedMessages,
      listings: result.listings,
      cursor: result.cursor,
      alertsSent: 0,
    }, { status });
  } catch {
    return NextResponse.json({
      success: false,
      status: 'failed',
      error: 'intake_unavailable',
      alertsSent: 0,
    }, { status: 503 });
  }
}
