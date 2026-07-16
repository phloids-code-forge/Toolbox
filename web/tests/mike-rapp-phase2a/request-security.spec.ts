import { expect, test } from '@playwright/test';

import { isSameOriginMutation } from '../../src/lib/opportunity/request-security';

test('state-changing requests require an exact same-origin host', () => {
  const sameOrigin = new Request('http://localhost:3110/api/opportunity/session', {
    method: 'POST',
    headers: {
      host: '127.0.0.1:3110',
      origin: 'http://127.0.0.1:3110',
      'x-forwarded-proto': 'http',
    },
  });
  const foreignOrigin = new Request('https://www.phloid.com/api/opportunity/session', {
    method: 'POST',
    headers: {
      host: 'www.phloid.com',
      origin: 'https://attacker.example',
      'x-forwarded-proto': 'https',
    },
  });
  const missingOrigin = new Request('https://portal.example.test/mutate', {
    method: 'POST',
    headers: { host: 'portal.example.test' },
  });
  const forgedForwardedHost = new Request('https://portal.example.test/mutate', {
    method: 'POST',
    headers: {
      origin: 'https://attacker.example.test',
      host: 'portal.example.test',
      'x-forwarded-host': 'attacker.example.test',
      'x-forwarded-proto': 'https',
    },
  });

  expect(isSameOriginMutation(sameOrigin)).toBe(true);
  expect(isSameOriginMutation(foreignOrigin)).toBe(false);
  expect(isSameOriginMutation(missingOrigin)).toBe(false);
  expect(isSameOriginMutation(forgedForwardedHost)).toBe(false);
});

test('same-origin mutations enforce scheme and port without forwarded protocol headers', () => {
  const sameOrigin = new Request('https://portal.example.test:8443/mutate', {
    method: 'POST',
    headers: {
      host: 'portal.example.test:8443',
      origin: 'https://portal.example.test:8443',
    },
  });
  const crossScheme = new Request('https://portal.example.test:8443/mutate', {
    method: 'POST',
    headers: {
      host: 'portal.example.test:8443',
      origin: 'http://portal.example.test:8443',
    },
  });
  const crossPort = new Request('https://portal.example.test:8443/mutate', {
    method: 'POST',
    headers: {
      host: 'portal.example.test:8443',
      origin: 'https://portal.example.test:9443',
    },
  });

  expect(isSameOriginMutation(sameOrigin)).toBe(true);
  expect(isSameOriginMutation(crossScheme)).toBe(false);
  expect(isSameOriginMutation(crossPort)).toBe(false);
});

test('malformed origins and ambiguous proxy headers are rejected', () => {
  const malformedOrigin = new Request('https://portal.example.test/mutate', {
    method: 'POST',
    headers: {
      host: 'portal.example.test',
      origin: 'https://portal.example.test/unexpected-path',
    },
  });
  const ambiguousProtocol = new Request('https://portal.example.test/mutate', {
    method: 'POST',
    headers: {
      host: 'portal.example.test',
      origin: 'https://portal.example.test',
      'x-forwarded-proto': 'https, http',
    },
  });
  const conflictingProtocol = new Request('https://portal.example.test/mutate', {
    method: 'POST',
    headers: {
      host: 'portal.example.test',
      origin: 'https://portal.example.test',
      'x-forwarded-proto': 'http',
    },
  });
  const conflictingPort = new Request('https://portal.example.test/mutate', {
    method: 'POST',
    headers: {
      host: 'portal.example.test',
      origin: 'https://portal.example.test',
      'x-forwarded-proto': 'https',
      'x-forwarded-port': '8443',
    },
  });
  const conflictingStandardForwarded = new Request('https://portal.example.test/mutate', {
    method: 'POST',
    headers: {
      forwarded: 'for=192.0.2.10;proto=http;host=portal.example.test',
      host: 'portal.example.test',
      origin: 'https://portal.example.test',
      'x-forwarded-proto': 'https',
    },
  });
  const consistentProxyContext = new Request('https://portal.example.test/mutate', {
    method: 'POST',
    headers: {
      forwarded: 'for=192.0.2.10;proto=https;host="portal.example.test"',
      host: 'portal.example.test',
      origin: 'https://portal.example.test',
      'x-forwarded-port': '443',
      'x-forwarded-proto': 'https',
    },
  });

  expect(isSameOriginMutation(malformedOrigin)).toBe(false);
  expect(isSameOriginMutation(ambiguousProtocol)).toBe(false);
  expect(isSameOriginMutation(conflictingProtocol)).toBe(false);
  expect(isSameOriginMutation(conflictingPort)).toBe(false);
  expect(isSameOriginMutation(conflictingStandardForwarded)).toBe(false);
  expect(isSameOriginMutation(consistentProxyContext)).toBe(true);
});
