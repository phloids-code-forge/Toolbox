import { randomUUID } from 'node:crypto';

import { NextResponse, type NextRequest } from 'next/server';

import { fixtureSourceAdapter } from '@/lib/opportunity/fixtures';
import { isFixtureExecutionAllowed } from '@/lib/opportunity/fixture-policy';
import { trustedMutationOrigin } from '@/lib/opportunity/request-security';
import { initializeOpportunityCore } from '@/lib/opportunity/runtime';
import { readAuthorizedClientSession } from '@/lib/opportunity/session';
import { runOpportunityWorker } from '@/lib/opportunity/worker';

type FixtureRouteContext = {
  params: Promise<{ clientSlug: string }>;
};

function workspaceUrl(origin: string, clientSlug: string, state: string): URL {
  const url = new URL(`/portal/${clientSlug}`, origin);
  url.searchParams.set('run', state);
  return url;
}

export async function POST(
  request: NextRequest,
  { params }: FixtureRouteContext,
): Promise<NextResponse> {
  const origin = trustedMutationOrigin(request);
  if (!origin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { clientSlug } = await params;
  const session = await readAuthorizedClientSession(clientSlug);
  if (!session) {
    const login = new URL('/portal/login', origin);
    login.searchParams.set('next', `/portal/${clientSlug}`);
    return NextResponse.redirect(login, 303);
  }
  if (!isFixtureExecutionAllowed(origin)) {
    return NextResponse.redirect(workspaceUrl(origin, clientSlug, 'disabled'), 303);
  }

  try {
    const repository = await initializeOpportunityCore();
    const result = await runOpportunityWorker({
      repository,
      clientSlug,
      runKey: `fixture-preview-${randomUUID()}`,
      adapters: [fixtureSourceAdapter],
    });
    const state = result.status === 'ok' || result.status === 'partial' ? 'complete' : 'failed';
    return NextResponse.redirect(workspaceUrl(origin, clientSlug, state), 303);
  } catch {
    return NextResponse.redirect(workspaceUrl(origin, clientSlug, 'failed'), 303);
  }
}
