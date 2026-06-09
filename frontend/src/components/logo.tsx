import { cn } from "@/lib/utils";

/** Carbon Receipt mark: a receipt whose lines form a downward (declining) trend.
 *  Sophisticated, not a clip-art leaf. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            d="M6 3.5h12v15.2l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2V3.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 8.2c2 .2 3.2 1.8 4 3.4 1-1.4 2-2 3.2-2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="font-display text-[17px] font-semibold tracking-tight text-foreground">
        Carbon<span className="text-primary">Receipt</span>
      </span>
    </span>
  );
}
