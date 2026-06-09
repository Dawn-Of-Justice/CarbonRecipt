import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EcoScoreBadge, SourceBadge } from "@/components/dashboard/badges";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* ambient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 grain"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[34rem] w-[60rem] -translate-x-1/2 rounded-full bg-leaf-300/30 blur-3xl"
      />
      <div className="container grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Built for PromptWars Virtual · powered by Gemini
          </span>
          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground text-balance sm:text-5xl lg:text-6xl">
            Turn any receipt into your{" "}
            <span className="relative whitespace-nowrap text-primary">
              real carbon footprint
              <svg
                className="absolute -bottom-2 left-0 h-3 w-full text-leaf-400"
                viewBox="0 0 200 12"
                preserveAspectRatio="none"
                aria-hidden
              >
                <path
                  d="M2 9C40 3 160 3 198 9"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            .
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Snap a shopping receipt. Carbon Receipt reads every line, looks up a
            real CO₂e number from trusted sources, and shows you exactly how to{" "}
            <strong className="font-semibold text-foreground">understand</strong>
            ,{" "}
            <strong className="font-semibold text-foreground">track</strong>, and{" "}
            <strong className="font-semibold text-foreground">reduce</strong> it.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Try it now <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how">See how it works</a>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No sign-up. Sample receipts pre-loaded so you can explore instantly.
          </p>
        </div>

        {/* Floating receipt preview */}
        <div className="relative animate-fade-up [animation-delay:120ms]">
          <HeroReceipt />
        </div>
      </div>
    </section>
  );
}

function HeroReceipt() {
  const rows = [
    { name: "Mutton Curry Cut", qty: "1 kg", kg: 19.8, eco: "E" as const },
    { name: "Amul Toned Milk", qty: "2 l", kg: 2.4, eco: "C" as const },
    { name: "Toor Dal", qty: "1 kg", kg: 1.6, eco: "B" as const },
    { name: "Fresh Spinach", qty: "500 g", kg: 0.3, eco: "A" as const },
  ];
  return (
    <div className="relative mx-auto max-w-sm">
      <div
        aria-hidden
        className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-leaf-200/50 to-transparent blur-2xl"
      />
      <div className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-[0_24px_60px_-24px_rgba(12,73,50,0.35)]">
        <div className="receipt-edge h-3 bg-primary" />
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-sm font-semibold">More Megastore</p>
              <p className="text-xs text-muted-foreground">Bengaluru · today</p>
            </div>
            <SourceBadge source="off" confidence="high" />
          </div>
          <div className="mt-5 space-y-3">
            {rows.map((r) => (
              <div key={r.name} className="flex items-center gap-3 text-sm">
                <EcoScoreBadge score={r.eco} size="sm" />
                <span className="flex-1 truncate text-foreground">{r.name}</span>
                <span className="text-xs text-muted-foreground">{r.qty}</span>
                <span className="w-16 text-right font-mono text-xs font-medium tabular-nums">
                  {r.kg.toFixed(1)} kg
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-dashed border-border pt-4">
            <div className="flex items-end justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Total footprint
              </span>
              <span className="font-display text-3xl font-bold text-primary">
                24.1
                <span className="ml-1 text-base font-medium text-muted-foreground">
                  kg CO₂e
                </span>
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              ≈ 134 km driven · 2,931 phone charges
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
