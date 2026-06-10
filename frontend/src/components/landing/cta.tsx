import Link from "next/link";
import { Brain } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";

/** Closing call-to-action banner linking into the app. */
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
