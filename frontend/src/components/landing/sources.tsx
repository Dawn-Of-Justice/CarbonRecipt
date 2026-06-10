import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/landing/section-heading";
import { SOURCE_STYLE } from "@/lib/design";
import { SOURCE_LABELS, type Source } from "@/lib/types";

interface Tier {
  source: Source;
  desc: string;
  conf: string;
}

const TIERS: Tier[] = [
  {
    source: "off",
    desc: "Real per-product carbon + Eco-Score, matched by name/barcode.",
    conf: "High",
  },
  {
    source: "climatiq",
    desc: "DEFRA/EPA category emission factors for non-food & generics.",
    conf: "Medium",
  },
  {
    source: "static",
    desc: "Bundled DEFRA / Agribalyse factors — always available, offline.",
    conf: "Medium",
  },
  {
    source: "gemini",
    desc: "Final fallback estimate so the app is never blank. Clearly flagged.",
    conf: "Low",
  },
];

/** The tiered lookup hierarchy — the app's core trust story. */
export function Sources() {
  return (
    <section id="sources" className="border-t border-border/60 bg-secondary/40 py-20">
      <div className="container">
        <SectionHeading
          eyebrow="Trustworthy by design"
          title="A tiered lookup — every number is sourced"
          sub="We prefer deterministic, reproducible data. Gemini is the last resort, never the primary source."
        />
        <div className="mx-auto mt-12 grid max-w-4xl gap-3">
          {TIERS.map((t, i) => {
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
