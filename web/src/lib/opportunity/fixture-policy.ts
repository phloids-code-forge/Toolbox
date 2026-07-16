type FixtureEnvironment = {
  [key: string]: string | undefined;
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  OPPORTUNITY_LOCAL_FIXTURE_TEST?: string;
};

function isLoopbackHost(hostname: string): boolean {
  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]';
}

export function isFixtureControlVisible(environment: FixtureEnvironment = process.env): boolean {
  if (environment.NODE_ENV !== 'production') return true;
  return environment.VERCEL_ENV === undefined
    && environment.OPPORTUNITY_LOCAL_FIXTURE_TEST === 'enabled';
}

export function isFixtureExecutionAllowed(
  origin: string,
  environment: FixtureEnvironment = process.env,
): boolean {
  if (environment.NODE_ENV !== 'production') return true;
  if (environment.VERCEL_ENV !== undefined) return false;
  if (environment.OPPORTUNITY_LOCAL_FIXTURE_TEST !== 'enabled') return false;

  try {
    return isLoopbackHost(new URL(origin).hostname);
  } catch {
    return false;
  }
}
