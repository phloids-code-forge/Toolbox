import type { LucideIcon } from "lucide-react";
import { Activity, Compass, FlaskConical, RadioTower, Sparkles, WandSparkles } from "lucide-react";

export type DemoLane = "demo" | "lab";

export type DemoEntry = {
  slug: string;
  lane: DemoLane;
  title: string;
  eyebrow: string;
  summary: string;
  clientSafe: boolean;
  status: "ready-template" | "concept" | "experimental";
  accent: string;
  icon: LucideIcon;
  bullets: string[];
  proofPoints: string[];
};

export const demoEntries: DemoEntry[] = [
  {
    slug: "signal-room",
    lane: "demo",
    title: "Signal Room",
    eyebrow: "Client-safe operations concept",
    summary:
      "A polished one-page dashboard shell for showing a client how their messy live signals could become a calm command surface.",
    clientSafe: true,
    status: "ready-template",
    accent: "from-sky-400 via-cyan-300 to-emerald-300",
    icon: RadioTower,
    bullets: [
      "hero panel for the business problem",
      "three-card value story",
      "safe placeholder metrics only",
      "call-to-action slot for a client walkthrough",
    ],
    proofPoints: ["No production data", "No third-party calls", "Static route", "Easy to clone"],
  },
  {
    slug: "launch-card",
    lane: "demo",
    title: "Launch Card",
    eyebrow: "Tiny product teaser",
    summary:
      "A compact landing-page pattern for pitching a new internal tool, prototype, or client portal without touching the main homepage.",
    clientSafe: true,
    status: "ready-template",
    accent: "from-amber-300 via-orange-400 to-rose-400",
    icon: Compass,
    bullets: [
      "single-screen narrative",
      "before/after positioning",
      "short feature list",
      "shareable hidden URL pattern",
    ],
    proofPoints: ["Unlisted URL", "Static content", "No secrets", "Production-safe copy"],
  },
  {
    slug: "funk-lab",
    lane: "lab",
    title: "Funk Lab",
    eyebrow: "Internal experiment lane",
    summary:
      "A deliberately weird sketchpad for interactive bits that should not be client-facing until promoted into /demo.",
    clientSafe: false,
    status: "experimental",
    accent: "from-fuchsia-400 via-violet-400 to-blue-400",
    icon: WandSparkles,
    bullets: [
      "visual experiments",
      "motion tests",
      "prototype-only language",
      "promotion path into /demo when polished",
    ],
    proofPoints: ["Marked internal", "No client claims", "No production data", "Review before sharing"],
  },
];

export const demoPages = demoEntries.filter((entry) => entry.lane === "demo");
export const labPages = demoEntries.filter((entry) => entry.lane === "lab");

export function getDemoEntry(slug: string) {
  return demoEntries.find((entry) => entry.slug === slug);
}

export const workbenchPrinciples = [
  {
    title: "Client-safe by default",
    body: "Demo pages use placeholder copy/data unless Dave explicitly provides approved client content.",
    icon: Activity,
  },
  {
    title: "WeatherWars stays isolated",
    body: "The existing /weatherwars route remains its own product surface and is not edited during demo-page experiments.",
    icon: Compass,
  },
  {
    title: "Funky has a lane",
    body: "Wild ideas start under /lab, then get promoted to /demo only after no-scuff QA.",
    icon: FlaskConical,
  },
  {
    title: "Ship through gates",
    body: "Every page goes through lint, build, audit, and browser/screenshot QA before it is client-shared.",
    icon: Sparkles,
  },
];
