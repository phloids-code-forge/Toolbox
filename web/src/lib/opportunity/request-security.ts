function readSingleHeader(request: Request, name: string): string | null | undefined {
  const raw = request.headers.get(name);
  if (raw === null) return undefined;
  const value = raw.trim();
  if (!value || value.includes(',')) return null;
  return value;
}

function normalizeHost(host: string, protocol: 'http:' | 'https:'): string | null {
  try {
    const parsed = new URL(`${protocol}//${host}`);
    if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      return null;
    }
    return parsed.host;
  } catch {
    return null;
  }
}

type ForwardedContext = {
  host?: string;
  protocol?: 'http:' | 'https:';
};

function parseForwardedContext(value: string | undefined): ForwardedContext | null {
  if (value === undefined) return {};
  const context: ForwardedContext = {};
  const seen = new Set<string>();
  for (const component of value.split(';')) {
    const separator = component.indexOf('=');
    if (separator <= 0) return null;
    const key = component.slice(0, separator).trim().toLowerCase();
    let componentValue = component.slice(separator + 1).trim();
    if (!/^[a-z]+$/.test(key) || !componentValue || seen.has(key)) return null;
    seen.add(key);
    if (componentValue.startsWith('"') || componentValue.endsWith('"')) {
      const quoted = componentValue.match(/^"([^"\\]*)"$/);
      if (!quoted) return null;
      componentValue = quoted[1];
    }
    if (key === 'proto') {
      const protocol = componentValue.toLowerCase();
      if (protocol !== 'http' && protocol !== 'https') return null;
      context.protocol = `${protocol}:`;
    } else if (key === 'host') {
      context.host = componentValue;
    }
  }
  return context;
}

export function trustedMutationOrigin(request: Request): string | null {
  const originValue = readSingleHeader(request, 'origin');
  const directHostValue = readSingleHeader(request, 'host');
  const forwardedHostValue = readSingleHeader(request, 'x-forwarded-host');
  const forwardedProtocolValue = readSingleHeader(request, 'x-forwarded-proto');
  const forwardedPortValue = readSingleHeader(request, 'x-forwarded-port');
  const standardForwardedValue = readSingleHeader(request, 'forwarded');
  if (
    !originValue
    || directHostValue === null
    || forwardedHostValue === null
    || forwardedProtocolValue === null
    || forwardedPortValue === null
    || standardForwardedValue === null
  ) {
    return null;
  }

  let protocol: 'http:' | 'https:';
  if (forwardedProtocolValue !== undefined) {
    const normalizedProtocol = forwardedProtocolValue.toLowerCase();
    if (normalizedProtocol !== 'http' && normalizedProtocol !== 'https') return null;
    protocol = `${normalizedProtocol}:`;
  } else {
    try {
      const requestProtocol = new URL(request.url).protocol;
      if (requestProtocol !== 'http:' && requestProtocol !== 'https:') return null;
      protocol = requestProtocol;
    } catch {
      return null;
    }
  }

  const directHost = directHostValue === undefined ? undefined : normalizeHost(directHostValue, protocol);
  const forwardedHost = forwardedHostValue === undefined
    ? undefined
    : normalizeHost(forwardedHostValue, protocol);
  if (directHostValue !== undefined && !directHost) return null;
  if (forwardedHostValue !== undefined && !forwardedHost) return null;
  if (directHost && forwardedHost && directHost !== forwardedHost) return null;
  const effectiveHost = directHost ?? forwardedHost;
  if (!effectiveHost) return null;
  const effectiveUrl = new URL(`${protocol}//${effectiveHost}`);
  const effectivePort = effectiveUrl.port || (protocol === 'https:' ? '443' : '80');
  if (forwardedPortValue !== undefined) {
    if (!/^\d{1,5}$/.test(forwardedPortValue)) return null;
    const forwardedPort = Number(forwardedPortValue);
    if (forwardedPort < 1 || forwardedPort > 65_535 || String(forwardedPort) !== effectivePort) {
      return null;
    }
  }
  const forwardedContext = parseForwardedContext(standardForwardedValue);
  if (!forwardedContext) return null;
  if (forwardedContext.protocol && forwardedContext.protocol !== protocol) return null;
  if (
    forwardedContext.host
    && normalizeHost(forwardedContext.host, protocol) !== effectiveHost
  ) {
    return null;
  }

  try {
    const parsedOrigin = new URL(originValue);
    if (
      (parsedOrigin.protocol !== 'http:' && parsedOrigin.protocol !== 'https:')
      || parsedOrigin.username
      || parsedOrigin.password
      || parsedOrigin.pathname !== '/'
      || parsedOrigin.search
      || parsedOrigin.hash
    ) {
      return null;
    }
    const expectedOrigin = effectiveUrl.origin;
    return parsedOrigin.origin === expectedOrigin ? parsedOrigin.origin : null;
  } catch {
    return null;
  }
}

export function isSameOriginMutation(request: Request): boolean {
  return trustedMutationOrigin(request) !== null;
}
