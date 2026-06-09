"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Scroll-triggered entrance. Safe by design:
 *  - Content is visible by default (SSR / no-JS / reduced-motion → no blank section).
 *  - We only "arm" the hidden state after mount, and only for elements still below the
 *    fold, so above-the-fold content never flashes.
 *  - IntersectionObserver reveals once, then disconnects.
 *
 * `delay` staggers siblings (e.g. delay={i * 70}).
 */
export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  y = 16,
  className,
  once = true,
}: {
  children: ReactNode;
  as?: ElementType;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const el = ref.current;
    if (reduce || !el) {
      setShown(true);
      return;
    }

    // Already in view at mount (above the fold) → show immediately, skip animation
    // so there is no visible→hidden flash.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      setShown(true);
      return;
    }

    setArmed(true);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            if (once) io.disconnect();
          } else if (!once) {
            setShown(false);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  const hidden = armed && !shown;

  return (
    <Tag
      ref={ref}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-out-quint motion-reduce:transition-none",
        hidden ? "opacity-0" : "opacity-100",
        className
      )}
      style={{
        transform: hidden ? `translateY(${y}px)` : "translateY(0)",
        transitionDelay: hidden ? "0ms" : `${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
}
