"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#sources", label: "Data sources" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-300 ease-out-quint",
        scrolled
          ? "border-border/60 bg-background/85 shadow-[0_8px_30px_-18px_rgba(12,73,50,0.3)]"
          : "border-transparent bg-background/60"
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" aria-label="Carbon Receipt home" className="transition-transform duration-300 ease-out-quint hover:scale-[1.02]">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="group relative py-1 transition-colors hover:text-foreground"
            >
              {l.label}
              <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-primary transition-transform duration-300 ease-out-quint group-hover:scale-x-100" />
            </a>
          ))}
        </nav>
        <Button asChild size="sm" className="group">
          <Link href="/dashboard">
            Open app{" "}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out-quint group-hover:translate-x-1" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
