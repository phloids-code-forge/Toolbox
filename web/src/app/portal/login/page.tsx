import type { Metadata } from 'next';

import { readOpportunitySession } from '@/lib/opportunity/session';

import styles from '../portal.module.css';

export const metadata: Metadata = {
  title: 'Private opportunity workspace',
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

const errorMessages: Record<string, string> = {
  invalid: 'That password was not accepted. Try again.',
  rate_limited: 'Too many sign-in attempts. Wait a few minutes before trying again.',
  mismatch: 'That workspace does not match this signed session.',
  unavailable: 'The protected preview is not configured right now.',
};

function safeNext(value: string | undefined): string {
  return value && /^\/portal\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
    ? value
    : '/portal/mike-rapp';
}

export default async function OpportunityLoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  const next = safeNext(query.next);
  const requestedSlug = next.slice('/portal/'.length);
  const currentSession = await readOpportunitySession();
  const mismatch = currentSession && currentSession.clientSlug !== requestedSlug;
  const message = mismatch
    ? 'That workspace does not match this signed session.'
    : query.error
      ? errorMessages[query.error]
      : null;

  return (
    <main id="opportunity-portal" className={styles.shell}>
      <section className={styles.loginCard} aria-labelledby="login-title">
        <div className={styles.brandRow}>
          <span className={styles.brandMark}>P</span>
          <span>phloid private workspace</span>
        </div>
        <p className={styles.eyebrow}>Secure preview</p>
        <h1 id="login-title">Private opportunity workspace</h1>
        <p className={styles.lede}>
          Sign in to review Mike&apos;s watches, durable fixture results, and truthful alert previews.
        </p>
        {message ? <p className={styles.formError} role="alert">{message}</p> : null}
        <form className={styles.loginForm} action="/api/opportunity/session" method="post">
          <input type="hidden" name="next" value={next} />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          <button type="submit">Sign in securely</button>
        </form>
        <p className={styles.safetyNote}>
          Fixture data only. No live sources are connected and no alerts are sent.
        </p>
      </section>
    </main>
  );
}
