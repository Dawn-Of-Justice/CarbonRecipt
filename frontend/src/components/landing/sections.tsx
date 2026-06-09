import {
  Brain,
  Camera,
  Database,
  Eye,
  Gauge,
  LineChart,
  type LucideIcon,
  MessageSquare,
  Repeat,
  Scale,
  Target,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { SOURCE_STYLE } from "@/lib/design";
import { SOURCE_LABELS, type Source } from "@/lib/types";

/* ----------------------------- How it works ----------------------------- */
export function HowItWorks() {
  const steps = [
    {
      icon: Camera,
      verb: "Snap",
      title: "Snap a receipt",
      body: "Upload a photo. Gemini vision reads each line into structured items — name, quantity, category.",
    },
    {
      icon: Database,
      verb: "Resolve",
      title: "Look up real numbers",
      body: "A tiered engine resolves CO₂e from Open Food Facts → Climatiq → DEFRA factors → Gemini, tagging every line with its source and confidence.",
    },
    {
      icon: LineChart,
      verb: "Act",
      title: "Understand · track · reduce",
      body: "See a tangible breakdown, watch trends against your budget, and get the top-3 swaps that cut the most carbon.",
    },
  ];
  return (
    <section id="how" className="border-t border-border/60 bg-secondary/40 py-20">
      <div className="container">
        <SectionHeading
          eyebrow="The loop"
          title="From shopping receipt to real action in seconds"
          sub="Every footprint traces back to a trustworthy, reproducible number — never a black box."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal
              key={s.title}
              delay={i * 90}
              className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-[transform,box-shadow] duration-300 ease-out-quint hover:-translate-y-1 hover:shadow-md"
            >
              <span className="absolute right-5 top-5 font-mono text-sm text-muted-foreground/60">
                0{i + 1}
              </span>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-leaf-100 text-leaf-700 transition-transform duration-300 ease-out-quint group-hover:scale-110 group-hover:-rotate-3">
                <s.icon className="h-6 w-6" />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-primary">
                {s.verb}
              </p>
              <h3 className="mt-1 font-display text-xl font-semibold">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Features ------------------------------ */
const FEATURES: {
  icon: LucideIcon;
  title: string;
  body: string;
  tag: "understand" | "track" | "reduce";
  span?: boolean;
}[] = [
  {
    icon: Eye,
    title: "Equivalence translator",
    body: "Every footprint becomes something you can feel: = X km driven, Y phone charges, Z trees-for-a-year.",
    tag: "understand",
    span: true,
  },
  {
    icon: Scale,
    title: "Eco-Score per item",
    body: "An A–E grade on every line for at-a-glance good vs. bad choices.",
    tag: "understand",
  },
  {
    icon: LineChart,
    title: "History & trends",
    body: "Saved receipts with weekly and monthly trend charts and a per-category breakdown.",
    tag: "track",
  },
  {
    icon: Target,
    title: "Carbon budget",
    body: "Set a monthly CO₂e target and watch a live progress bar shift from ok → warning → over.",
    tag: "track",
    span: true,
  },
  {
    icon: Gauge,
    title: "Baseline comparison",
    body: "See whether your basket sits above or below an average Indian household.",
    tag: "track",
  },
  {
    icon: Repeat,
    title: "Top-3 swaps",
    body: "Concrete lower-carbon alternatives — replace X with Y, save Z kg — ranked by impact.",
    tag: "reduce",
  },
  {
    icon: MessageSquare,
    title: "Gemini coach",
    body: "Ask “why is my footprint high this week?” and get answers grounded in your own data.",
    tag: "reduce",
    span: true,
  },
];

const TAG_STYLE = {
  understand: "bg-sky-100 text-sky-800",
  track: "bg-leaf-100 text-leaf-800",
  reduce: "bg-orange-100 text-orange-800",
};

export function Features() {
  return (
    <section id="features" className="py-20">
      <div className="container">
        <SectionHeading
          eyebrow="What's inside"
          title="Everything you need to cut your footprint"
          sub="Designed around the three things that matter: understand it, track it, reduce it."
        />
        <div className="mt-12 grid auto-rows-[1fr] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal
              key={f.title}
              as="article"
              delay={(i % 3) * 80}
              className={`group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-[transform,box-shadow] duration-300 ease-out-quint hover:-translate-y-1 hover:shadow-lg ${
                f.span ? "sm:col-span-2 lg:col-span-2" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary transition-transform duration-300 ease-out-quint group-hover:scale-110">
                  <f.icon className="h-5 w-5" />
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${TAG_STYLE[f.tag]}`}
                >
                  {f.tag}
                </span>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">
                {f.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Sources ------------------------------ */
export function Sources() {
  const tiers: { source: Source; desc: string; conf: string }[] = [
    { source: "off", desc: "Real per-product carbon + Eco-Score, matched by name/barcode.", conf: "High" },
    { source: "climatiq", desc: "DEFRA/EPA category emission factors for non-food & generics.", conf: "Medium" },
    { source: "static", desc: "Bundled DEFRA / Agribalyse factors — always available, offline.", conf: "Medium" },
    { source: "gemini", desc: "Final fallback estimate so the app is never blank. Clearly flagged.", conf: "Low" },
  ];
  return (
    <section id="sources" className="border-t border-border/60 bg-secondary/40 py-20">
      <div className="container">
        <SectionHeading
          eyebrow="Trustworthy by design"
          title="A tiered lookup — every number is sourced"
          sub="We prefer deterministic, reproducible data. Gemini is the last resort, never the primary source."
        />
        <div className="mx-auto mt-12 grid max-w-4xl gap-3">
          {tiers.map((t, i) => {
            const s = SOURCE_STYLE[t.source];
            return (
              <Reveal
                key={t.source}
                delay={i * 70}
                y={12}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors duration-300 hover:border-primary/30"
              >
                <span className="font-mono text-sm text-muted-foreground/70">
                  {i + 1}
                </span>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} />
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {SOURCE_LABELS[t.source]}
                  </p>
                  <p className="text-sm text-muted-foreground">{t.desc}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${s.bg} ${s.text}`}>
                  {t.conf} confidence
                </span>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- CTA -------------------------------- */
export function CTA() {
  return (
    <section className="py-20">
      <div className="container">
        <Reveal
          y={24}
          className="group relative overflow-hidden rounded-[2rem] bg-primary px-8 py-16 text-center shadow-xl"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 grain opacity-30"
          />
          {/* light sweep on entrance */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/10 blur-md animate-sheen motion-reduce:hidden"
          />
          <Brain className="mx-auto h-10 w-10 text-leaf-200 animate-float motion-reduce:animate-none" />
          <h2 className="mt-5 font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
            See your next receipt&apos;s footprint
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-leaf-100">
            It takes one photo. Understand where your carbon comes from and the
            simplest swaps to bring it down.
          </p>
          <div className="mt-8">
            <Button asChild size="lg" variant="secondary">
              <Link href="/dashboard">Open the app</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="container flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
        <p>Carbon Receipt — PromptWars Virtual hackathon.</p>
        <p>
          Data: Open Food Facts (ODbL) · Climatiq · DEFRA / Agribalyse · Gemini.
        </p>
      </div>
    </footer>
  );
}

function SectionHeading({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub: string;
}) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-muted-foreground">{sub}</p>
    </Reveal>
  );
}
