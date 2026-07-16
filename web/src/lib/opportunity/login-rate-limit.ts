import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

type RateLimitEnvironment = {
  [key: string]: string | undefined;
  VERCEL?: string;
};

export function loginRateLimitKey(
  request: Request,
  clientSlug: string,
  environment: RateLimitEnvironment = process.env,
): string {
  const vercelAddress = environment.VERCEL === '1'
    ? request.headers.get('x-vercel-forwarded-for')?.trim()
    : undefined;
  const trustedAddress = vercelAddress
    && !vercelAddress.includes(',')
    && isIP(vercelAddress) !== 0
    ? vercelAddress.toLowerCase()
    : 'shared';
  return createHash('sha256')
    .update(`${clientSlug}\u0000${trustedAddress}`)
    .digest('hex');
}
