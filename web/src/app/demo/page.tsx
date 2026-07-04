import Link from "next/link";
import { ArrowRight, BadgeCheck, Beaker, LockKeyhole, Sparkles } from "lucide-react";
import { demoPages, workbenchPrinciples } from "@/lib/demo-workbench";
import styles from "./workbench.module.css";

export const metadata = {
  title: "Demo Workbench",
  description: "Client-safe phloid demo pages and prototype lanes.",
};

export default function DemoWorkbenchPage() {
  return (
    <main className={styles.demoPage}>
      <nav className={styles.topNav}>
        <Link href="/" className={styles.navPill}>phloid</Link>
        <Link href="/lab" className={styles.secondaryPill}>lab lane</Link>
      </nav>

      <section className={styles.heroGrid}>
        <div>
          <div className={styles.badge}>
            <BadgeCheck className="h-4 w-4" />
            Demo-safe workbench
          </div>
          <h1 className={styles.heroTitle}>Build strange things without scuffing the front door.</h1>
          <p className={styles.lead}>
            `/demo` is the client-safe lane for polished concepts. `/lab` is the funky lane for experiments before they are ready to show.
          </p>
          <div className={styles.actionRow}>
            <a href="#demo-pages" className={styles.primaryButton}>
              Browse demos <ArrowRight className="h-4 w-4" />
            </a>
            <Link href="/lab" className={styles.ghostButton}>
              Open lab <Beaker className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className={styles.contractPanel}>
          <div className={styles.contractInner}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>handoff contract</p>
                <h2 className={styles.panelTitle}>Point-and-build ready</h2>
              </div>
              <LockKeyhole className="h-8 w-8 text-emerald-300" />
            </div>
            <div className={styles.contractList}>
              {[
                "Unlisted routes, not homepage experiments",
                "No client secrets or live private data",
                "WeatherWars untouched unless requested",
                "Lint/build/audit/browser QA before sharing",
              ].map((item) => (
                <div key={item} className={styles.contractItem}>
                  <Sparkles className="h-4 w-4 shrink-0 text-sky-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="demo-pages" className={styles.sectionWrap}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>client-safe pages</p>
          <h2 className={styles.sectionTitle}>Starter routes</h2>
        </div>

        <div className={styles.cardGrid}>
          {demoPages.map((entry) => {
            const Icon = entry.icon;
            return (
              <Link key={entry.slug} href={`/demo/${entry.slug}`} className={styles.demoCard}>
                <div className={`${styles.iconBox} bg-gradient-to-br ${entry.accent}`}>
                  <Icon className="h-7 w-7" />
                </div>
                <p className={styles.eyebrow}>{entry.eyebrow}</p>
                <h3 className={styles.cardTitle}>{entry.title}</h3>
                <p className={styles.cardSummary}>{entry.summary}</p>
                <div className={styles.cardAction}>
                  Open route <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className={styles.principlesGrid}>
        {workbenchPrinciples.map((principle) => {
          const Icon = principle.icon;
          return (
            <article key={principle.title} className={styles.principleCard}>
              <Icon className="h-6 w-6 text-emerald-300" />
              <h3 className={styles.principleTitle}>{principle.title}</h3>
              <p className={styles.principleText}>{principle.body}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
