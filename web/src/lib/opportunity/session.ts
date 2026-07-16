import { cookies } from 'next/headers';

import { authorizeClientSession, verifySignedSession, type OpportunitySession } from './auth';

export const OPPORTUNITY_SESSION_COOKIE = 'phloid_opportunity_session';

export function getOpportunitySessionSecret(): string | null {
  const secret = process.env.OPPORTUNITY_SESSION_SECRET;
  return secret && Buffer.byteLength(secret, 'utf8') >= 32 ? secret : null;
}

export async function readOpportunitySession(): Promise<OpportunitySession | null> {
  const secret = getOpportunitySessionSecret();
  if (!secret) return null;
  const token = (await cookies()).get(OPPORTUNITY_SESSION_COOKIE)?.value;
  return token ? verifySignedSession(token, { secret }) : null;
}

export async function readAuthorizedClientSession(
  requestedClientSlug: string,
): Promise<OpportunitySession | null> {
  const secret = getOpportunitySessionSecret();
  if (!secret) return null;
  const token = (await cookies()).get(OPPORTUNITY_SESSION_COOKIE)?.value;
  return token ? authorizeClientSession(token, requestedClientSlug, { secret }) : null;
}
