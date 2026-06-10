import { Reveal } from "@/components/motion/reveal";

/** Centered eyebrow + title + subtitle used at the top of every landing section. */
export function SectionHeading({
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
