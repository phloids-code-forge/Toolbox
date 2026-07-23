import Link from "next/link";
import { ArrowRight, FlaskConical, ShieldAlert, Sparkles } from "lucide-react";
import { labPages } from "@/lib/demo-workbench";
import styles from "../demo/workbench.module.css";

export const metadata = {
  title: "Lab",
  description: "Internal phloid experiment lane for funky prototypes.",
};

export default function LabPage() {
  return (
    <main className={styles.labPage}>
      <div className={styles.labWrap}>
        <nav className={styles.topNav}>
          <Link href="/demo" className={styles.navPill}>demo workbench</Link>
          <Link href="/" className={styles.navPill}>phloid</Link>
        </nav>

        <section className={styles.labHero}>
          <div className={styles.badge}>
            <FlaskConical className="h-4 w-4" /> Internal experiment lane
          </div>
          <h1 className={styles.labTitle}>Get funky here first. Promote only when polished.</h1>
          <p className={styles.lead}>
            `/lab` is where odd prototypes, motion studies, and not-yet-client-safe ideas can live without risking the homepage or WeatherWars.
          </p>
        </section>

        <section className={styles.labGrid}>
          <div className={styles.labRule}>
            <ShieldAlert className="h-8 w-8 text-amber-200" />
            <h2 className={styles.panelTitle}>Lab sharing rule</h2>
            <p className={styles.labText}>
              Lab pages are not client promises. Before sharing one externally, promote it into `/demo`, replace rough copy/data, and run no-scuff QA.
            </p>
          </div>

          <div className={styles.labCards}>
            {labPages.map((entry) => {
              const Icon = entry.icon;
              return (
                <article key={entry.slug} className={styles.labCard}>
                  <div className={`${styles.iconBox} bg-gradient-to-br ${entry.accent}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <p className={styles.eyebrow}>{entry.eyebrow}</p>
                  <h3 className={styles.labCardTitle}>{entry.title}</h3>
                  <p className={styles.labText}>{entry.summary}</p>
                  <div className={styles.cardAction}>
                    prototype only <Sparkles className="h-4 w-4" />
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.labFlow}>
          <strong className="text-white">Build flow:</strong> start weird in `/lab`, polish into `/demo/[slug]`, then ship through branch → checks → screenshot QA → PR → approved merge.
          <Link href="/demo" className="ml-2 inline-flex items-center font-black text-sky-300 hover:text-white">
            Back to demo lane <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </section>
      </div>
    </main>
  );
}
