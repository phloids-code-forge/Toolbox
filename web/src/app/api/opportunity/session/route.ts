import { NextResponse, type NextRequest } from 'next/server';

import { createSignedSession, verifyPasswordHash } from '@/lib/opportunity/auth';
import { loginRateLimitKey } from '@/lib/opportunity/login-rate-limit';
import { trustedMutationOrigin } from '@/lib/opportunity/request-security';
import { initializeOpportunityCore } from '@/lib/opportunity/runtime';
import {
  getOpportunitySessionSecret,
  OPPORTUNITY_SESSION_COOKIE,
} from '@/lib/opportunity/session';

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const DEFAULT_CLIENT_SLUG = 'mike-rapp';

function safePortalDestination(value: FormDataEntryValue | null): string {
  const destination = typeof value === 'string' ? value : '';
  return /^\/portal\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(destination)
    ? destination
    : `/portal/${DEFAULT_CLIENT_SLUG}`;
}

function loginRedirect(origin: string, next: string, error: string): NextResponse {
  const url = new URL('/portal/login', origin);
  url.searchParams.set('next', next);
  url.searchParams.set('error', error);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const origin = trustedMutationOrigin(request);
  if (!origin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const formData = await request.formData();
  const next = safePortalDestination(formData.get('next'));
  const password = formData.get('password');
  const passwordHash = process.env.OPPORTUNITY_PORTAL_PASSWORD_HASH;
  const sessionSecret = getOpportunitySessionSecret();
  const configuredSlug = process.env.OPPORTUNITY_CLIENT_SLUG ?? DEFAULT_CLIENT_SLUG;
  const rateLimitKey = loginRateLimitKey(request, configuredSlug);

  if (!passwordHash || !sessionSecret || typeof password !== 'string') {
    return loginRedirect(origin, next, 'unavailable');
  }

  try {
    const repository = await initializeOpportunityCore();
    const rateLimit = await repository.reserveLoginAttempt(configuredSlug, rateLimitKey);
    if (!rateLimit.allowed) {
      const response = loginRedirect(origin, next, 'rate_limited');
      response.headers.set('Retry-After', String(rateLimit.retryAfterSeconds));
      return response;
    }

    if (!verifyPasswordHash(password, passwordHash)) {
      return loginRedirect(origin, next, 'invalid');
    }

    const requestedSlug = next.slice('/portal/'.length);
    if (requestedSlug !== configuredSlug) {
      return loginRedirect(origin, next, 'mismatch');
    }
    await repository.releaseLoginAttempt(configuredSlug, rateLimitKey);
  } catch {
    return loginRedirect(origin, next, 'unavailable');
  }

  const response = NextResponse.redirect(new URL(next, origin), 303);
  response.cookies.set({
    name: OPPORTUNITY_SESSION_COOKIE,
    value: createSignedSession({
      clientSlug: configuredSlug,
      secret: sessionSecret,
      ttlSeconds: SESSION_TTL_SECONDS,
    }),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
