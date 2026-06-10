import {
  Eye,
  Gauge,
  LineChart,
  type LucideIcon,
  MessageSquare,
  Repeat,
  Scale,
  Target,
} from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/landing/section-heading";

type ThemeTag = "understand" | "track" | "reduce";

interface Feature {
  icon: LucideIcon;
  title: string;
  body: string;
  tag: ThemeTag;
  /** Wide cells keep the grid a balanced 3×3 (two spans + seven singles). */
  span?: boolean;
}

const FEATURES: Feature[] = [
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

const TAG_STYLE: Record<ThemeTag, string> = {
  understand: "bg-sky-100 text-sky-800",
  track: "bg-leaf-100 text-leaf-800",
  reduce: "bg-orange-100 text-orange-800",
};

/** Feature grid, each card tagged with the theme verb it serves. */
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
