import { NextResponse, type NextRequest } from 'next/server';

import { trustedMutationOrigin } from '@/lib/opportunity/request-security';
import { initializeOpportunityCore } from '@/lib/opportunity/runtime';
import { readAuthorizedClientSession } from '@/lib/opportunity/session';
import { validateWatchInput } from '@/lib/opportunity/validation';

type WatchRouteContext = {
  params: Promise<{ clientSlug: string }>;
};

function workspaceRedirect(origin: string, clientSlug: string, state: string): NextResponse {
  const url = new URL(`/portal/${clientSlug}`, origin);
  url.searchParams.set('watch', state);
  return NextResponse.redirect(url, 303);
}

export async function POST(
  request: NextRequest,
  { params }: WatchRouteContext,
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

  const formData = await request.formData();
  const validation = validateWatchInput(Object.fromEntries(formData.entries()));
  if (!validation.ok) return workspaceRedirect(origin, clientSlug, 'invalid');

  if (formData.get('mode') === 'create') {
    try {
      const repository = await initializeOpportunityCore();
      await repository.createWatch(clientSlug, { ...validation.value, status: 'draft' });
      return workspaceRedirect(origin, clientSlug, 'created');
    } catch {
      return workspaceRedirect(origin, clientSlug, 'unavailable');
    }
  }

  const watchId = formData.get('watchId');
  if (
    typeof watchId !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(watchId)
  ) {
    return workspaceRedirect(origin, clientSlug, 'unauthorized');
  }

  try {
    const repository = await initializeOpportunityCore();
    const existing = await repository.getWatch(clientSlug, watchId);
    if (!existing) return workspaceRedirect(origin, clientSlug, 'unauthorized');
    if (
      validation.value.status === 'active'
      && (!(existing.criteria.makes?.length) || !existing.criteria.model)
    ) {
      return workspaceRedirect(origin, clientSlug, 'invalid');
    }
    const updated = await repository.updateWatch(clientSlug, watchId, validation.value);
    return workspaceRedirect(origin, clientSlug, updated ? 'saved' : 'unauthorized');
  } catch {
    return workspaceRedirect(origin, clientSlug, 'unavailable');
  }
}
