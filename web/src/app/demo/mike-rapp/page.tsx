import type { Metadata } from 'next';

import MikeRappDemo from './MikeRappDemo';

export const metadata: Metadata = {
  title: "Mike's Opportunity Monitor — Personalized Demo",
  description: 'A personalized sample opportunity scan for Mike Rapp.',
  robots: { index: false, follow: false },
};

export default function MikeRappDemoPage() {
  return <MikeRappDemo />;
}
