import { Camera, Database, LineChart, type LucideIcon } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/landing/section-heading";

interface Step {
  icon: LucideIcon;
  verb: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
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

/** The three-step core loop: snap → resolve → act. */
export function HowItWorks() {
  return (
    <section id="how" className="border-t border-border/60 bg-secondary/40 py-20">
      <div className="container">
        <SectionHeading
          eyebrow="The loop"
          title="From shopping receipt to real action in seconds"
          sub="Every footprint traces back to a trustworthy, reproducible number — never a black box."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
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
