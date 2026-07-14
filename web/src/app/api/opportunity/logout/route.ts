import { NextResponse, type NextRequest } from 'next/server';

import { trustedMutationOrigin } from '@/lib/opportunity/request-security';
import { OPPORTUNITY_SESSION_COOKIE } from '@/lib/opportunity/session';

function safePortalDestination(value: FormDataEntryValue | null): string {
  const destination = typeof value === 'string' ? value : '';
  return /^\/portal\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(destination)
    ? destination
    : '/portal/mike-rapp';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const origin = trustedMutationOrigin(request);
  if (!origin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const formData = await request.formData();
  const next = safePortalDestination(formData.get('next'));
  const url = new URL('/portal/login', origin);
  url.searchParams.set('next', next);
  const response = NextResponse.redirect(url, 303);
  response.cookies.set({
    name: OPPORTUNITY_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
