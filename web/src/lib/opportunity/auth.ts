import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

export type OpportunitySession = {
  version: 1;
  clientSlug: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

type CreateSessionInput = {
  clientSlug: string;
  secret: string;
  now?: number;
  ttlSeconds: number;
};

type VerifySessionInput = {
  secret: string;
  now?: number;
};

type CreatePasswordHashInput = {
  iterations?: number;
  salt?: Buffer;
};

const PASSWORD_DIGEST_BYTES = 32;
const MIN_PASSWORD_ITERATIONS = 100_000;
const MAX_PASSWORD_ITERATIONS = 2_000_000;

export function createPasswordHash(
  password: string,
  { iterations = 600_000, salt = randomBytes(16) }: CreatePasswordHashInput = {},
): string {
  if (iterations < MIN_PASSWORD_ITERATIONS || iterations > MAX_PASSWORD_ITERATIONS) {
    throw new Error('Password hash iteration count is outside the supported range.');
  }
  if (salt.length < 16) throw new Error('Password hash salt must be at least 16 bytes.');
  const digest = pbkdf2Sync(password, salt, iterations, PASSWORD_DIGEST_BYTES, 'sha256');
  return `pbkdf2-sha256$${iterations}$${salt.toString('base64url')}$${digest.toString('base64url')}`;
}

export function verifyPasswordHash(password: string, encodedHash: string): boolean {
  try {
    const [algorithm, encodedIterations, encodedSalt, encodedDigest] = encodedHash.split('$');
    const iterations = Number(encodedIterations);
    const salt = Buffer.from(encodedSalt, 'base64url');
    const expectedDigest = Buffer.from(encodedDigest, 'base64url');
    if (
      algorithm !== 'pbkdf2-sha256' ||
      !Number.isInteger(iterations) ||
      iterations < MIN_PASSWORD_ITERATIONS ||
      iterations > MAX_PASSWORD_ITERATIONS ||
      salt.length < 16 ||
      expectedDigest.length !== PASSWORD_DIGEST_BYTES
    ) {
      return false;
    }
    const suppliedDigest = pbkdf2Sync(password, salt, iterations, PASSWORD_DIGEST_BYTES, 'sha256');
    return timingSafeEqual(suppliedDigest, expectedDigest);
  } catch {
    return false;
  }
}

function requireSecret(secret: string): void {
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('Session secret must be at least 32 bytes.');
  }
}

function signatureFor(payload: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(payload).digest();
}

export function createSignedSession({
  clientSlug,
  secret,
  now = Math.floor(Date.now() / 1_000),
  ttlSeconds,
}: CreateSessionInput): string {
  requireSecret(secret);
  const session: OpportunitySession = {
    version: 1,
    clientSlug,
    issuedAt: now,
    expiresAt: now + ttlSeconds,
    nonce: randomBytes(16).toString('base64url'),
  };
  const payload = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
  const signature = signatureFor(payload, secret).toString('base64url');
  return `${payload}.${signature}`;
}

export function authorizeClientSession(
  token: string,
  requestedClientSlug: string,
  input: VerifySessionInput,
): OpportunitySession | null {
  const session = verifySignedSession(token, input);
  return session?.clientSlug === requestedClientSlug ? session : null;
}

export function verifySignedSession(
  token: string,
  { secret, now = Math.floor(Date.now() / 1_000) }: VerifySessionInput,
): OpportunitySession | null {
  try {
    requireSecret(secret);
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, encodedSignature] = parts;
    const suppliedSignature = Buffer.from(encodedSignature, 'base64url');
    const expectedSignature = signatureFor(payload, secret);
    if (
      suppliedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(suppliedSignature, expectedSignature)
    ) {
      return null;
    }

    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<OpportunitySession>;
    if (
      parsed.version !== 1 ||
      typeof parsed.clientSlug !== 'string' ||
      typeof parsed.issuedAt !== 'number' ||
      typeof parsed.expiresAt !== 'number' ||
      parsed.expiresAt <= now ||
      typeof parsed.nonce !== 'string'
    ) {
      return null;
    }
    return parsed as OpportunitySession;
  } catch {
    return null;
  }
}
