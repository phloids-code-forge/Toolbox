import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { isFixtureControlVisible } from '@/lib/opportunity/fixture-policy';
import { initializeOpportunityCore } from '@/lib/opportunity/runtime';
import { readAuthorizedClientSession } from '@/lib/opportunity/session';

import styles from '../portal.module.css';

export const metadata: Metadata = {
  title: "Mike's opportunity workspace",
  robots: { index: false, follow: false },
};

type WorkspacePageProps = {
  params: Promise<{ clientSlug: string }>;
  searchParams: Promise<{ run?: string; watch?: string }>;
};

function loginDestination(clientSlug: string): string {
  return `/portal/login?next=${encodeURIComponent(`/portal/${clientSlug}`)}`;
}

function formatStamp(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(value);
}

async function loadWorkspace(clientSlug: string) {
  const repository = await initializeOpportunityCore();
  return Promise.all([
    repository.listWatches(clientSlug),
    repository.listLeadDecisions(clientSlug),
    repository.listRecentWorkerRuns(clientSlug),
  ]);
}

export default async function OpportunityWorkspacePage({ params, searchParams }: WorkspacePageProps) {
  const { clientSlug } = await params;
  const query = await searchParams;
  const session = await readAuthorizedClientSession(clientSlug);
  if (!session) {
    redirect(loginDestination(clientSlug));
  }

  let workspaceData;
  try {
    workspaceData = await loadWorkspace(clientSlug);
  } catch {
    return (
      <main id="opportunity-portal" className={styles.shell}>
        <section className={styles.loginCard}>
          <p className={styles.eyebrow}>Protected workspace</p>
          <h1>Workspace temporarily unavailable</h1>
          <p className={styles.lede}>The secure data connection is not configured for this preview.</p>
        </section>
      </main>
    );
  }
  const [watches, decisions, runs] = workspaceData;
  const latestRun = runs[0] ?? null;
  const fixtureControlVisible = isFixtureControlVisible();
  const intakeConfigured = [
    process.env.OPPORTUNITY_IMAP_HOST,
    process.env.OPPORTUNITY_IMAP_PORT,
    process.env.OPPORTUNITY_IMAP_USER,
    process.env.OPPORTUNITY_IMAP_PASSWORD,
    process.env.OPPORTUNITY_INTAKE_ADDRESS,
  ].every((value) => Boolean(value));

  return (
    <main id="opportunity-portal" className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brandRow}>
          <span className={styles.brandMark}>P</span>
          <span>Mike Rapp · opportunity monitor</span>
        </div>
        <form action="/api/opportunity/logout" method="post">
          <input type="hidden" name="next" value={`/portal/${clientSlug}`} />
          <button className={styles.secondaryButton} type="submit">Log out</button>
        </form>
      </header>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Phase 2B · protected hosted intake</p>
          <h1>Mike&apos;s opportunity workspace</h1>
          <p className={styles.lede}>
            Durable watches, hosted Craigslist saved-search monitoring, and provider-disabled alert previews.
          </p>
        </div>
        <div className={styles.authBadge}>
          <span aria-hidden="true" />
          Authenticated for Mike Rapp
        </div>
      </section>

      <section className={styles.runPanel} aria-labelledby="run-heading">
        <div>
          <p className={styles.eyebrow}>Hourly · allowlisted · read-only mailbox</p>
          <h2 id="run-heading">Hosted Craigslist intake</h2>
          <p>
            Saved-search email is parsed into sanitized durable listings. Raw MIME and contact details are not stored.
          </p>
          <p className={`${styles.intakeStatus} ${intakeConfigured ? styles.intakeReady : styles.intakeWaiting}`}>
            {intakeConfigured
              ? 'Protected mailbox configuration is present; the hourly poller is ready.'
              : 'Craigslist intake is awaiting protected mailbox configuration in this environment.'}
          </p>
        </div>
        {fixtureControlVisible ? (
          <>
            <form action={`/api/opportunity/${clientSlug}/fixture`} method="post">
              <button type="submit">Run checked-in fixture</button>
            </form>
            {query.run === 'complete' ? <p className={styles.successMessage} role="status">Fixture QA run completed.</p> : null}
            {query.run === 'failed' ? <p className={styles.formError} role="alert">Fixture QA run failed safely. No delivery was attempted.</p> : null}
            {query.run === 'disabled' ? <p className={styles.formError} role="alert">Fixture QA runs are disabled in production.</p> : null}
          </>
        ) : null}
      </section>

      <section className={styles.section} aria-labelledby="watches-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Server-validated intent</p>
            <h2 id="watches-heading">Active watches</h2>
          </div>
          <p>{watches.length} durable starter watches</p>
        </div>
        {query.watch === 'invalid' ? (
          <p className={styles.formError} role="alert">
            Watch was not changed. Check the year, price, mileage, and status ranges.
          </p>
        ) : null}
        {query.watch === 'saved' ? <p className={styles.successMessageLight} role="status">Watch saved with server validation.</p> : null}
        {query.watch === 'created' ? <p className={styles.successMessageLight} role="status">Draft watch created with server validation.</p> : null}
        {query.watch === 'unauthorized' ? <p className={styles.formError} role="alert">That watch is not available in this workspace.</p> : null}
        {query.watch === 'unavailable' ? <p className={styles.formError} role="alert">The watch could not be saved safely.</p> : null}
        <details className={`${styles.watchEditor} ${styles.createWatch}`}>
          <summary aria-label="Add a draft watch" role="button">Add a draft watch</summary>
          <form action={`/api/opportunity/${clientSlug}/watches`} method="post">
            <input type="hidden" name="mode" value="create" />
            <input type="hidden" name="status" value="draft" />
            <label>Title<input aria-label="New watch title" name="title" required /></label>
            <label>Search terms<input aria-label="New watch search terms" name="query" required /></label>
            <div className={styles.editorGrid}>
              <label>Starting year<input aria-label="New watch starting year" name="yearMin" type="number" required /></label>
              <label>Ending year<input aria-label="New watch ending year" name="yearMax" type="number" required /></label>
              <label>Maximum price<input aria-label="New watch maximum price" name="maxPrice" type="number" min="0" /></label>
              <label>Maximum mileage<input aria-label="New watch maximum mileage" name="maxMileage" type="number" min="0" required /></label>
            </div>
            <label className={styles.checkRow}><input name="nationwide" type="checkbox" /> Nationwide</label>
            <label className={styles.checkRow}><input name="cleanTitleOnly" type="checkbox" /> Clean title only</label>
            <button aria-label="Create validated watch" type="submit">Create validated draft</button>
          </form>
        </details>
        <div className={styles.watchGrid}>
          {watches.map((watch) => {
            const watchName = `${watch.criteria.makes?.[0] ?? ''} ${watch.criteria.model ?? ''}`.trim();
            const watchLabel = watchName ? `${watchName} watch` : watch.title;
            return (
              <article className={styles.watchCard} key={watch.id}>
                <div className={styles.cardTopline}>
                  <span>{watch.status}</span>
                  <span>{watch.nationwide ? 'Nationwide' : 'Local'}</span>
                </div>
                <h3>{watch.title}</h3>
                <dl>
                  <div><dt>Years</dt><dd>{watch.yearMin}–{watch.yearMax}</dd></div>
                  <div><dt>Price</dt><dd>{watch.maxPrice === null ? 'Open' : `$${watch.maxPrice.toLocaleString()}`}</dd></div>
                  <div><dt>Mileage</dt><dd>Under {watch.maxMileage.toLocaleString()}</dd></div>
                  <div><dt>Title</dt><dd>{watch.cleanTitleOnly ? 'Clean only' : 'Review'}</dd></div>
                </dl>
                <details className={styles.watchEditor}>
                  <summary aria-label={`Edit ${watchLabel}`} role="button">Edit watch</summary>
                  <form action={`/api/opportunity/${clientSlug}/watches`} method="post">
                    <input type="hidden" name="watchId" value={watch.id} />
                    <label>Title<input name="title" defaultValue={watch.title} required /></label>
                    <label>Search terms<input name="query" defaultValue={watch.query} required /></label>
                    <label>Status
                      <select name="status" defaultValue={watch.status}>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="draft">Draft</option>
                        <option value="archived">Archived</option>
                      </select>
                    </label>
                    <div className={styles.editorGrid}>
                      <label>Starting year
                        <input aria-label={`Starting year for ${watchName}`} name="yearMin" type="number" defaultValue={watch.yearMin} required />
                      </label>
                      <label>Ending year
                        <input aria-label={`Ending year for ${watchName}`} name="yearMax" type="number" defaultValue={watch.yearMax} required />
                      </label>
                      <label>Maximum price
                        <input name="maxPrice" type="number" min="0" defaultValue={watch.maxPrice ?? ''} />
                      </label>
                      <label>Maximum mileage
                        <input name="maxMileage" type="number" min="0" defaultValue={watch.maxMileage} required />
                      </label>
                    </div>
                    <label className={styles.checkRow}><input name="nationwide" type="checkbox" defaultChecked={watch.nationwide} /> Nationwide</label>
                    <label className={styles.checkRow}><input name="cleanTitleOnly" type="checkbox" defaultChecked={watch.cleanTitleOnly} /> Clean title only</label>
                    <button aria-label={`Save ${watchLabel}`} type="submit">Save validated watch</button>
                  </form>
                </details>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="decisions-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Repository-backed results</p>
            <h2 id="decisions-heading">Durable opportunity decisions</h2>
          </div>
          <p>{decisions.length} deduplicated records shown</p>
        </div>
        {decisions.length > 0 ? (
          <div className={styles.decisionList}>
            {decisions.map((decision) => {
              const reasons = decision.accepted ? decision.matchReasons : decision.rejectReasons;
              return (
                <article
                  className={`${styles.decisionCard} ${decision.accepted ? styles.acceptedCard : styles.reviewCard}`}
                  key={`${decision.sourceType}-${decision.title}`}
                >
                  <div className={styles.decisionHeader}>
                    <div>
                      <div className={styles.cardTopline}>
                        <span>{decision.accepted ? 'Strong match' : 'Held for review'}</span>
                        <span>{decision.sourceType.replace('-', ' ')}</span>
                      </div>
                      <h3>{decision.title}</h3>
                      <p>{decision.watchTitle ?? 'No matching watch'}</p>
                    </div>
                    <div className={styles.scoreBadge}>
                      <strong>{decision.score ?? '—'}</strong>
                      <span>score</span>
                    </div>
                  </div>
                  <div className={styles.factGrid}>
                    <div><span>Price</span><strong>{decision.priceAmount === null ? 'Review' : `$${decision.priceAmount.toLocaleString()}`}</strong></div>
                    <div><span>Mileage</span><strong>{decision.mileage === null ? 'Review' : decision.mileage.toLocaleString()}</strong></div>
                    <div><span>Location</span><strong>{decision.locationText ?? 'Review'}</strong></div>
                    <div><span>Title</span><strong>{decision.titleStatus}</strong></div>
                  </div>
                  <ul className={styles.reasonList}>
                    {reasons.slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}
                  </ul>
                  <div className={styles.historyRow}>
                    <span><strong>First seen</strong>{formatStamp(decision.firstSeenAt)}</span>
                    <span><strong>Last seen</strong>{formatStamp(decision.lastSeenAt)}</span>
                    {decision.duplicateCount > 1 ? (
                      <span className={styles.duplicateNote}>{decision.duplicateCount} source records share this identity</span>
                    ) : null}
                  </div>
                  <div className={styles.alertState}>
                    <strong>Alert event</strong>
                    <span>
                      {decision.alertState === 'skipped'
                        ? 'Skipped — provider disabled'
                        : decision.accepted
                          ? 'No delivery event recorded'
                          : 'Not alert-worthy'}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className={styles.emptyState}>
            {fixtureControlVisible ? 'Waiting for hosted Craigslist intake or a local fixture QA run.' : 'Waiting for hosted Craigslist intake.'}
          </p>
        )}
      </section>

      <section className={styles.section} aria-labelledby="runs-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Observable worker state</p>
            <h2 id="runs-heading">Latest run</h2>
          </div>
          <p>{fixtureControlVisible ? 'Hosted Craigslist + local fixture QA · alert provider disabled' : 'Hosted Craigslist · alert provider disabled'}</p>
        </div>
        {latestRun ? (
          <div className={styles.runStatusCard}>
            <div>
              <span className={styles.statusPill}>{latestRun.status}</span>
              <strong>{formatStamp(latestRun.startedAt)}</strong>
            </div>
            <dl>
              <div><dt>Fetched</dt><dd>{latestRun.counts.fetched ?? 0}</dd></div>
              <div><dt>Stored</dt><dd>{latestRun.counts.listings ?? 0}</dd></div>
              <div><dt>Strong matches</dt><dd>{latestRun.counts.matches ?? 0}</dd></div>
              <div><dt>New skip events</dt><dd>{latestRun.counts.alertsSkipped ?? 0}</dd></div>
            </dl>
            <ul>
              {latestRun.sourceResults.map((source) => (
                <li key={source.sourceType}>
                  <span>
                    {source.sourceType === 'fixture'
                      ? 'Fixture source'
                      : source.sourceType === 'craigslist_email'
                        ? 'Craigslist email source'
                        : source.sourceType}{' '}
                    {source.status === 'ok' ? 'completed' : source.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : <p className={styles.emptyState}>No worker run has been recorded yet.</p>}
      </section>

      <section className={styles.truthStrip}>
        <strong>Operational truth boundary</strong>
        <span>Craigslist saved-search intake only · alert provider disabled · nothing queued, sent, or delivered</span>
      </section>
    </main>
  );
}
