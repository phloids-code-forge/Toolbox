import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { demoPages, getDemoEntry } from "@/lib/demo-workbench";
import styles from "../workbench.module.css";

type DemoDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return demoPages.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: DemoDetailPageProps) {
  const { slug } = await params;
  const entry = getDemoEntry(slug);

  if (!entry || entry.lane !== "demo") {
    return { title: "Demo not found" };
  }

  return {
    title: `${entry.title} Demo`,
    description: entry.summary,
  };
}

export default async function DemoDetailPage({ params }: DemoDetailPageProps) {
  const { slug } = await params;
  const entry = getDemoEntry(slug);

  if (!entry || entry.lane !== "demo") {
    notFound();
  }

  const Icon = entry.icon;

  return (
    <main className={styles.detailPage}>
      <div className={styles.detailWrap}>
        <Link href="/demo" className={styles.backPill}>
          <ArrowLeft className="h-4 w-4" /> Demo index
        </Link>

        <section className={styles.detailHero}>
          <div className={`${styles.accentBar} bg-gradient-to-r ${entry.accent}`} />
          <div className={styles.detailHeroInner}>
            <div>
              <div className={`${styles.detailIcon} bg-gradient-to-br ${entry.accent}`}>
                <Icon className="h-8 w-8" />
              </div>
              <p className={styles.eyebrow}>{entry.eyebrow}</p>
              <h1 className={styles.detailTitle}>{entry.title}</h1>
              <p className={styles.lead}>{entry.summary}</p>
              <div className={styles.safeBadge}>
                <ShieldCheck className="h-4 w-4" /> Client-safe template
              </div>
            </div>

            <div className={styles.recipePanel}>
              <p className={styles.eyebrow}>page recipe</p>
              <div className={styles.recipeList}>
                {entry.bullets.map((bullet) => (
                  <div key={bullet} className={styles.recipeItem}>
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.proofGrid}>
          {entry.proofPoints.map((proof) => (
            <div key={proof} className={styles.proofCard}>{proof}</div>
          ))}
        </section>

        <section className={styles.infoBox}>
          <p className={styles.infoText}>
            <strong className="text-sky-200">How to use this route:</strong> clone this template into a new slug, replace the safe placeholder copy, run lint/build/audit, screenshot QA it, then share only after Dave approves the page-specific PR.
          </p>
        </section>
      </div>
    </main>
  );
}
