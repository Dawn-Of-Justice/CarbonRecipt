"use client";

import { useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface CoachMessage {
  role: "you" | "coach";
  text: string;
}

const SUGGESTED_QUESTION = "Why is my footprint high this week?";

/**
 * Gemini carbon coach: a small chat thread grounded in the user's own
 * receipt history (the backend builds the context).
 */
export function CoachCard() {
  const [q, setQ] = useState("");
  const [thread, setThread] = useState<CoachMessage[]>([]);
  const [busy, setBusy] = useState(false);

  async function ask(question?: string) {
    const text = (question ?? q).trim();
    if (!text || busy) return;
    setThread((t) => [...t, { role: "you", text }]);
    setQ("");
    setBusy(true);
    try {
      const { answer } = await api.coach(text);
      setThread((t) => [...t, { role: "coach", text: answer }]);
    } catch {
      setThread((t) => [
        ...t,
        { role: "coach", text: "I couldn't reach the coach just now." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4 text-primary" /> Carbon coach
        </CardTitle>
        <CardDescription>Ask about your own footprint.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {thread.length === 0 ? (
          <button
            onClick={() => ask(SUGGESTED_QUESTION)}
            className="w-full rounded-lg border border-dashed border-border px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary/50"
          >
            Try: “{SUGGESTED_QUESTION}”
          </button>
        ) : (
          <div
            className="max-h-56 space-y-2 overflow-y-auto pr-1"
            aria-live="polite"
            aria-busy={busy}
          >
            {thread.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "animate-slide-up-fade rounded-xl px-3 py-2 text-sm",
                  m.role === "you"
                    ? "ml-6 bg-primary text-primary-foreground"
                    : "mr-6 bg-secondary text-foreground"
                )}
              >
                {m.text}
              </div>
            ))}
            {busy && (
              <div className="mr-6 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm text-muted-foreground animate-slide-up-fade">
                <Loader2 className="h-4 w-4 animate-spin" />
                <TypingDots />
              </div>
            )}
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ask the coach…"
            rows={1}
            className="min-h-[40px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask();
              }
            }}
          />
          <Button
            size="icon"
            onClick={() => ask()}
            disabled={busy || !q.trim()}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Three pulsing dots shown while the coach is thinking. */
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="thinking">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current opacity-60 motion-safe:animate-bounce"
          style={{ animationDelay: `${i * 140}ms`, animationDuration: "1s" }}
        />
      ))}
    </span>
  );
}
