import { timingSafeEqual } from 'node:crypto';

type Environment = Record<string, string | undefined>;

export function authorizeOpportunityCron(
  authorization: string | null,
  environment: Environment = process.env,
): boolean {
  const secret = environment.CRON_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32 || !authorization?.startsWith('Bearer ')) {
    return false;
  }
  const supplied = authorization.slice('Bearer '.length);
  const expectedBuffer = Buffer.from(secret, 'utf8');
  const suppliedBuffer = Buffer.from(supplied, 'utf8');
  return suppliedBuffer.length === expectedBuffer.length
    && timingSafeEqual(suppliedBuffer, expectedBuffer);
}
