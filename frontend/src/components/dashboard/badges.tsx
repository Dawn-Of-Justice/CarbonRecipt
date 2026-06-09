import { cn } from "@/lib/utils";
import { CONFIDENCE_STYLE, ECO_BADGE, SOURCE_STYLE } from "@/lib/design";
import { SOURCE_LABELS, type Confidence, type EcoScore, type Source } from "@/lib/types";

export function EcoScoreBadge({
  score,
  size = "md",
}: {
  score: EcoScore;
  size?: "sm" | "md";
}) {
  if (!score) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground">
        —
      </span>
    );
  }
  const s = ECO_BADGE[score];
  return (
    <span
      title={`Eco-Score ${score}`}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-bold ring-1",
        s.bg,
        s.text,
        s.ring,
        size === "sm" ? "h-5 w-5 text-[11px]" : "h-7 w-7 text-sm"
      )}
    >
      {score}
    </span>
  );
}

export function SourceBadge({
  source,
  confidence,
}: {
  source: Source;
  confidence?: Confidence;
}) {
  const s = SOURCE_STYLE[source];
  return (
    <span
      title={`${SOURCE_LABELS[source]}${confidence ? ` · ${confidence} confidence` : ""}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        s.bg,
        s.text
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
      {confidence && (
        <span className={cn("font-semibold", CONFIDENCE_STYLE[confidence])}>
          {confidence === "high" ? "●●●" : confidence === "medium" ? "●●○" : "●○○"}
        </span>
      )}
    </span>
  );
}
