'use client';

import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  CarFront,
  Check,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  Gauge,
  Mail,
  MapPin,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useRef, useState } from 'react';

import styles from './demo.module.css';
import {
  buildAlertPreview,
  demoUpdatedAt,
  explainFilteredOpportunity,
  runSampleScan,
  starterWatches,
  type ScannedLead,
} from './scan';

const progressSteps = [
  'Checking sample sources',
  'Organizing listing details',
  'Removing repeated opportunities',
  'Scoring the strongest matches',
];

const watchDetails = {
  'land-cruiser': ['Under $40,000', 'Under 250,000 miles', 'Clean title'],
  'tahoe-z71': ['Under $40,000', 'Under 100,000 miles', 'Clean title'],
  supra: ['Price open', 'Under 250,000 miles', 'Clean title'],
} as const;

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const mileage = new Intl.NumberFormat('en-US');

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export default function MikeRappDemo() {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'complete'>('idle');
  const [progressStep, setProgressStep] = useState(0);
  const [selectedLead, setSelectedLead] = useState<ScannedLead | null>(null);
  const scanRun = useRef(0);
  const results = runSampleScan();
  const alertPreview = buildAlertPreview(results.matches[0]);

  async function startScan() {
    if (scanState === 'scanning') return;

    const thisRun = scanRun.current + 1;
    scanRun.current = thisRun;
    setScanState('scanning');
    setProgressStep(0);
    setSelectedLead(null);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgressStep(progressSteps.length - 1);
      setScanState('complete');
      return;
    }

    for (let step = 0; step < progressSteps.length; step += 1) {
      if (scanRun.current !== thisRun) return;
      setProgressStep(step);
      await wait(520);
    }

    if (scanRun.current === thisRun) setScanState('complete');
  }

  function openLead(lead: ScannedLead) {
    setSelectedLead(lead);
  }

  function handleDetailKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      setSelectedLead(null);
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      event.currentTarget.querySelector<HTMLButtonElement>('button')?.focus();
    }
  }

  return (
    <main className={styles.shell} id="mike-rapp-demo">
      <div className={styles.ambientOne} aria-hidden="true" />
      <div className={styles.ambientTwo} aria-hidden="true" />

      <nav className={styles.nav} aria-label="Demo context">
        <a className={styles.brand} href="#top" aria-label="Back to top">
          <span className={styles.brandMark}>p</span>
          <span>phloid</span>
        </a>
        <div className={styles.demoLabel}>
          <span className={styles.liveDot} aria-hidden="true" />
          Personalized demo
        </div>
      </nav>

      <section className={styles.hero} id="top">
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}>
            <Sparkles size={15} aria-hidden="true" />
            Built around Mike’s first three watches
          </div>
          <h1>Mike’s Opportunity Monitor</h1>
          <p className={styles.heroLead}>
            See the best opportunities before they disappear. The monitor checks multiple sources,
            applies Mike’s must-haves, removes repeats, and brings the strongest value signals forward.
          </p>
          <div className={styles.heroActions}>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={startScan}
              disabled={scanState === 'scanning'}
            >
              {scanState === 'scanning' ? <Radar size={19} className={styles.spin} /> : <Search size={19} />}
              {scanState === 'complete' ? 'Run sample scan again' : scanState === 'scanning' ? 'Scanning sample opportunities…' : 'Run sample scan'}
            </button>
            <span className={styles.safeNote}>
              <ShieldCheck size={16} aria-hidden="true" />
              Safe sample data · no alerts sent
            </span>
          </div>
        </div>

        <div className={styles.radarCard} aria-label="Opportunity scan illustration">
          <div className={styles.radarHeader}>
            <span>Sample opportunity scan</span>
            <span className={styles.snapshot}>{demoUpdatedAt}</span>
          </div>
          <div className={styles.radarStage} aria-hidden="true">
            <div className={styles.radarCircle} />
            <div className={styles.radarCircleTwo} />
            <div className={styles.radarCircleThree} />
            <div className={styles.radarSweep} />
            <span className={`${styles.radarPing} ${styles.pingOne}`} />
            <span className={`${styles.radarPing} ${styles.pingTwo}`} />
            <span className={`${styles.radarPing} ${styles.pingThree}`} />
            <div className={styles.atlantaCore}>
              <MapPin size={16} />
              <span>ATL</span>
            </div>
          </div>
          <div className={styles.radarFooter}>
            <span><span className={styles.legendLocal} /> Atlanta priority</span>
            <span><span className={styles.legendNational} /> Nationwide included</span>
          </div>
        </div>
      </section>

      <section className={styles.promiseStrip} aria-label="How the monitor helps">
        <div><Radar size={20} /><span><strong>Watch broadly</strong> across source families</span></div>
        <div><Gauge size={20} /><span><strong>Score clearly</strong> against Mike’s criteria</span></div>
        <div><BellRing size={20} /><span><strong>Surface quickly</strong> before good leads vanish</span></div>
      </section>

      <section className={styles.section} aria-labelledby="watches-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>Starter watchlist</span>
            <h2 id="watches-title">Three searches, one clear inbox</h2>
          </div>
          <p>Nationwide reach stays on. Atlanta-area finds receive a visible priority signal.</p>
        </div>

        <div className={styles.watchGrid}>
          {starterWatches.map((watch, index) => (
            <article className={styles.watchCard} key={watch.id}>
              <div className={styles.watchTopline}>
                <span className={styles.watchNumber}>0{index + 1}</span>
                <span className={styles.activeBadge}><span /> Watching</span>
              </div>
              <CarFront size={25} aria-hidden="true" />
              <h3>{watch.label.split(' · ')[0]}</h3>
              <p className={styles.years}>{watch.label.split(' · ')[1]}</p>
              <ul>
                {watchDetails[watch.id].map((detail) => (
                  <li key={detail}><Check size={14} /> {detail}</li>
                ))}
              </ul>
              <div className={styles.watchReach}><MapPin size={14} /> Nationwide · Atlanta first</div>
            </article>
          ))}
        </div>
      </section>

      {scanState === 'scanning' && (
        <section className={styles.scanPanel} aria-labelledby="scan-in-progress">
          <div className={styles.scanIcon}><Radar size={27} /></div>
          <div className={styles.scanMain}>
            <span className={styles.kicker}>Sample scan in progress</span>
            <h2 id="scan-in-progress">Looking for the strongest signals</h2>
            <div className={styles.progressTrack}><span style={{ width: `${((progressStep + 1) / progressSteps.length) * 100}%` }} /></div>
            <div className={styles.stepList}>
              {progressSteps.map((step, index) => (
                <span className={index <= progressStep ? styles.stepActive : ''} key={step}>
                  {index < progressStep ? <Check size={14} /> : <span>{index + 1}</span>}
                  {step}
                </span>
              ))}
            </div>
          </div>
          <p className={styles.srOnly} role="status" aria-live="polite">{progressSteps[progressStep]}</p>
        </section>
      )}

      {scanState === 'complete' && (
        <>
          <section className={styles.resultsSection} aria-labelledby="results-title">
            <div className={styles.resultsIntro}>
              <div>
                <span className={styles.kicker}>Sample scan complete</span>
                <h2 id="results-title">The strongest opportunities rise to the top</h2>
              </div>
              <div className={styles.summaryGrid} aria-label="Sample scan summary">
                <div><strong>{results.summary.scanned}</strong><span>checked</span></div>
                <div><strong>{results.summary.duplicatesRemoved}</strong><span>repeat removed</span></div>
                <div className={styles.summaryAccent}><strong>{results.summary.strongMatches} strong matches</strong><span>top opportunities</span></div>
                <div><strong>{results.summary.filtered}</strong><span>filtered</span></div>
              </div>
            </div>

            <div className={styles.bestLabel}><Sparkles size={15} /> Best opportunity</div>
            <div className={styles.matchList}>
              {results.matches.map((lead, index) => (
                <article className={`${styles.matchCard} ${index === 0 ? styles.bestCard : ''}`} data-testid="match-card" key={lead.id}>
                  <div className={styles.matchRank}>#{index + 1}</div>
                  <div className={styles.matchBody}>
                    <div className={styles.cardBadges}>
                      {lead.distanceMiles <= 50 && <span className={styles.localBadge}><MapPin size={12} /> Atlanta priority</span>}
                      <span className={styles.sourceBadge}>{lead.source} sample</span>
                    </div>
                    <h3>{lead.title}</h3>
                    <div className={styles.keyFacts}>
                      <span><CircleDollarSign size={16} /> {currency.format(lead.price)}</span>
                      <span><Gauge size={16} /> {mileage.format(lead.mileage)} mi</span>
                      <span><BadgeCheck size={16} /> Clean title</span>
                      <span><MapPin size={16} /> {lead.location}</span>
                    </div>
                    <div className={styles.reasonRow}>
                      {lead.matchReasons.slice(0, 3).map((reason) => <span key={reason}><Check size={13} /> {reason}</span>)}
                    </div>
                  </div>
                  <div className={styles.scoreBlock}>
                    <span>Value signal</span>
                    <strong>{lead.score}</strong>
                    <small>/ 100</small>
                    <button type="button" onClick={() => openLead(lead)}>Open details <ArrowRight size={15} /></button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.filteredSection} aria-labelledby="filtered-title">
            <div className={styles.filteredHeader}>
              <div>
                <span className={styles.kicker}>Quality control</span>
                <h2 id="filtered-title">Why other leads stay out of the alert</h2>
              </div>
              <p>A promising price is not enough when a must-have rule fails.</p>
            </div>
            <div className={styles.filteredGrid}>
              {results.filtered.map((lead) => {
                const explanation = explainFilteredOpportunity(lead);
                return (
                  <article className={styles.filteredCard} data-testid="filtered-card" key={lead.id}>
                    <div className={styles.filteredScore}><X size={15} /> {explanation.decisionLabel}<span>{lead.score} signal</span></div>
                    <h3>{lead.title}</h3>
                    <p className={styles.rejectionHeadline}>{explanation.headline}</p>
                    <div className={styles.miniFacts}><span>{currency.format(lead.price)}</span><span>{mileage.format(lead.mileage)} mi</span><span>{lead.location}</span></div>
                    <ul>{explanation.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                  </article>
                );
              })}
            </div>
          </section>

          <section className={styles.alertSection} aria-labelledby="alert-title">
            <div className={styles.alertCopy}>
              <span className={styles.kicker}>Future notification</span>
              <h2 id="alert-title">A quick heads-up when a good one appears</h2>
              <p>Mike’s future alert can stay short, useful, and easy to act on from a phone.</p>
              <div className={styles.notSent}><ShieldCheck size={16} /> This preview does not contact anyone.</div>
            </div>
            <div className={styles.phoneFrame}>
              <div className={styles.phoneTop}><span>9:41</span><span>Opportunity Monitor</span></div>
              <div className={styles.notification}>
                <div className={styles.notificationIcon}><BellRing size={20} /></div>
                <div>
                  <span className={styles.previewLabel}>{alertPreview.label}</span>
                  <h3>{alertPreview.title}</h3>
                  <p>{currency.format(alertPreview.price)} · {alertPreview.location}</p>
                  <strong>Value signal {alertPreview.score}/100</strong>
                  <ul>{alertPreview.topReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                  <button type="button" onClick={() => openLead(results.matches[0])}>Preview opportunity details <ArrowRight size={14} /></button>
                </div>
              </div>
              <div className={styles.deliveryState}><Mail size={14} /> {alertPreview.deliveryState}</div>
            </div>
          </section>
        </>
      )}

      <section className={styles.nextPhase} aria-labelledby="next-title">
        <div className={styles.nextIcon}><Radar size={30} /></div>
        <div>
          <span className={styles.kicker}>Next phase</span>
          <h2 id="next-title">From a sample scan to Mike’s live opportunity feed</h2>
          <p>Connect agreed real sources, remember what has already been seen, and deliver new finds through Mike’s preferred notification channel. Used vehicles are the first category; the same watch-and-alert loop can expand to other opportunities later.</p>
        </div>
        <div className={styles.phaseSteps}>
          <span><strong>01</strong> Connect live sources</span>
          <span><strong>02</strong> Keep durable history</span>
          <span><strong>03</strong> Turn on chosen alerts</span>
        </div>
      </section>

      <section className={styles.sourceNote} id="sample-source-note">
        <ShieldCheck size={18} />
        <p><strong>Demo source links are intentionally inactive.</strong> Original-listing actions appear when approved live sources are connected in the next phase.</p>
      </section>

      <footer className={styles.footer}>
        <span>Mike’s Opportunity Monitor</span>
        <span>Personalized Phase 1 demo · sample data only</span>
      </footer>

      {selectedLead && (
        <div className={styles.detailOverlay} role="dialog" aria-modal="true" aria-label={selectedLead.title} onKeyDown={handleDetailKeyDown}>
          <div className={styles.detailPanel}>
            <div className={styles.detailTopbar}>
              <button type="button" autoFocus onClick={() => setSelectedLead(null)}><ChevronLeft size={18} /> Back to results</button>
              <span>Sample opportunity detail</span>
            </div>
            <div className={styles.detailHero}>
              <div>
                <div className={styles.cardBadges}>
                  {selectedLead.distanceMiles <= 50 && <span className={styles.localBadge}><MapPin size={12} /> Atlanta priority</span>}
                  <span className={styles.sourceBadge}>{selectedLead.source} sample</span>
                </div>
                <h2>{selectedLead.title}</h2>
                <p>Found in this sample scan</p>
              </div>
              <div className={styles.detailPrice}>{currency.format(selectedLead.price)}<span>Value signal {selectedLead.score}/100</span></div>
            </div>
            <div className={styles.detailFacts}>
              <div><span>Mileage</span><strong>{mileage.format(selectedLead.mileage)} mi</strong></div>
              <div><span>Location</span><strong>{selectedLead.location}</strong></div>
              <div><span>Title</span><strong className={styles.cleanText}>Clean stated</strong></div>
              <div><span>Watch</span><strong>{selectedLead.watchLabel}</strong></div>
            </div>
            <div className={styles.detailColumns}>
              <div>
                <span className={styles.kicker}>Why it matched</span>
                <ul className={styles.detailReasons}>{selectedLead.matchReasons.map((reason) => <li key={reason}><Check size={15} /> {reason}</li>)}</ul>
              </div>
              <div>
                <span className={styles.kicker}>Flags &amp; checks</span>
                <ul className={styles.detailChecks}>
                  <li><BadgeCheck size={15} /> No hard-rule conflicts found in this sample</li>
                  <li><Clock3 size={15} /> Confirm availability and listing age</li>
                  <li><ShieldCheck size={15} /> Verify title and condition with the seller</li>
                  <li><CarFront size={15} /> Arrange an independent inspection</li>
                </ul>
              </div>
            </div>
            <div className={styles.sourceTreatment}>
              <div><span>Source treatment</span><strong>{selectedLead.source} · safe sample record</strong></div>
              <p>Original listing link activates when this source is connected in the next phase.</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
