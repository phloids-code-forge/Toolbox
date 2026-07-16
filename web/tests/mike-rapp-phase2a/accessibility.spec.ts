import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { expect, test } from '@playwright/test';

function channel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const [red, green, blue] = [0, 2, 4].map((offset) => (
    channel(Number.parseInt(value.slice(offset, offset + 2), 16))
  ));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function cssColor(css: string, name: string): string {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  expect(match, `Expected ${name} to be declared as a six-digit color`).not.toBeNull();
  return match?.[1] ?? '#000000';
}

test('portal metadata and two-tone focus tokens meet WCAG contrast floors', async () => {
  const css = await readFile(
    path.join(process.cwd(), 'src/app/portal/portal.module.css'),
    'utf8',
  );
  const card = cssColor(css, '--card');
  const navy = cssColor(css, '--navy');
  const metadata = cssColor(css, '--metadata-text');
  const focusDark = cssColor(css, '--focus-dark');
  const focusLight = cssColor(css, '--focus-light');
  const warningText = cssColor(css, '--warning-text');
  const warningBackground = cssColor(css, '--warning-background');

  expect(contrast(metadata, card)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(focusDark, card)).toBeGreaterThanOrEqual(3);
  expect(contrast(focusLight, navy)).toBeGreaterThanOrEqual(3);
  expect(contrast(warningText, warningBackground)).toBeGreaterThanOrEqual(4.5);
  expect(css).toMatch(/\.watchCard dt\s*\{[^}]*color:\s*var\(--metadata-text\)/);
  expect(css).toMatch(/\.factGrid span,[^}]*color:\s*var\(--metadata-text\)/);
  expect(css).toMatch(/\.runStatusCard dt\s*\{[^}]*color:\s*var\(--metadata-text\)/);
  expect(css).toMatch(/:focus-visible[^}]*outline:\s*3px solid var\(--focus-dark\)[^}]*box-shadow:\s*0 0 0 6px var\(--focus-light\)/);
});
