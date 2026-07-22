import { NextResponse } from 'next/server';

import { FastmailCraigslistMailbox, readCraigslistImapConfig } from '@/lib/opportunity/craigslist-mailbox';
import { runCraigslistEmailIntake } from '@/lib/opportunity/craigslist-intake';
import { authorizeOpportunityCron } from '@/lib/opportunity/cron-auth';
import {
  createFastmailEmailTransport,
  readOpportunityEmailConfig,
} from '@/lib/opportunity/email-delivery';
import { initializeOpportunityCore } from '@/lib/opportunity/runtime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!authorizeOpportunityCron(request.headers.get('authorization'))) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  let emailDelivery: Parameters<typeof runCraigslistEmailIntake>[0]['emailDelivery'];
  try {
    const config = readOpportunityEmailConfig();
    emailDelivery = {
      config,
      transport: createFastmailEmailTransport(config),
    };
  } catch {
    return NextResponse.json({ error: 'delivery_unavailable' }, { status: 503 });
  }

  try {
    const repository = await initializeOpportunityCore();
    const mailbox = new FastmailCraigslistMailbox(readCraigslistImapConfig());
    const result = await runCraigslistEmailIntake({
      repository,
      mailbox,
      clientSlug: process.env.OPPORTUNITY_CLIENT_SLUG ?? 'mike-rapp',
      deadlineAt: Date.now() + 35_000,
      emailDelivery,
    });
    const status = result.status === 'failed'
      ? 503
      : result.status === 'partial'
        ? 207
        : result.status === 'busy' ? 202 : 200;
    return NextResponse.json({
      success: result.status === 'ok' || result.status === 'busy',
      status: result.status,
      processedMessages: result.processedMessages,
      failedMessages: result.failedMessages,
      quarantinedMessages: result.quarantinedMessages,
      deferredMessages: result.deferredMessages,
      listings: result.listings,
      cursor: result.cursor,
      alertsQueued: result.alertsQueued,
      alertsSent: result.alertsSent,
      alertsFailed: result.alertsFailed,
      alertsUnknown: result.alertsUnknown,
    }, { status });
  } catch {
    return NextResponse.json({
      success: false,
      status: 'failed',
      error: 'intake_unavailable',
      alertsQueued: 0,
      alertsSent: 0,
      alertsFailed: 0,
      alertsUnknown: 0,
    }, { status: 503 });
  }
}
