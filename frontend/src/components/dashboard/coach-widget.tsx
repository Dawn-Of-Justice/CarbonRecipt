"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Send, X } from "lucide-react";
import Markdown, { type Components } from "react-markdown";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface CoachMessage {
  id: number;
  role: "you" | "coach";
  text: string;
}

const SUGGESTED_QUESTION = "Why is my footprint high this week?";

/**
 * Chat-bubble-sized markdown: Gemini answers use bold and short bullet
 * lists, so render those properly instead of showing raw `**` markers.
 * Anything outside this whitelist is unwrapped to plain text.
 */
const MARKDOWN_ELEMENTS = ["p", "strong", "em", "ul", "ol", "li", "code", "br"];

const markdownComponents: Components = {
  p: (props) => <p className="mb-1.5 last:mb-0" {...props} />,
  ul: (props) => <ul className="mb-1.5 list-disc space-y-0.5 pl-4 last:mb-0" {...props} />,
  ol: (props) => <ol className="mb-1.5 list-decimal space-y-0.5 pl-4 last:mb-0" {...props} />,
  strong: (props) => <strong className="font-semibold" {...props} />,
  code: (props) => (
    <code className="rounded bg-black/10 px-1 font-mono text-[0.85em]" {...props} />
  ),
};

/**
 * Floating Gemini carbon coach. A launcher bubble sits at the bottom-right;
 * opening it reveals a chat panel — anchored bottom-right on desktop, a
 * full-width bottom sheet on phones — so answers get room to breathe instead
 * of crowding the dashboard side column.
 */
export function CoachWidget() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState<CoachMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const hasOpenedRef = useRef(false);
  const nextIdRef = useRef(0);

  function pushMessage(role: CoachMessage["role"], text: string) {
    setThread((t) => [...t, { id: nextIdRef.current++, role, text }]);
  }

  // Keep the newest message in view as the thread grows.
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread, busy]);

  // Move focus into the chat on open and back to the launcher on close.
  useEffect(() => {
    if (open) {
      hasOpenedRef.current = true;
      inputRef.current?.focus();
    } else if (hasOpenedRef.current) {
      launcherRef.current?.focus();
    }
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function ask(text?: string) {
    const q = (text ?? question).trim();
    if (!q || busy) return;
    pushMessage("you", q);
    setQuestion("");
    setBusy(true);
    try {
      const { answer } = await api.coach(q);
      pushMessage("coach", answer);
    } catch {
      pushMessage("coach", "I couldn't reach the coach just now.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button
        ref={launcherRef}
        onClick={() => setOpen(true)}
        aria-label="Open the carbon coach"
        className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full shadow-lg transition-transform duration-300 ease-out-quint hover:-translate-y-1 hover:shadow-xl"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Carbon coach chat"
      className="fixed inset-x-0 bottom-0 z-40 flex max-h-[85dvh] flex-col rounded-t-2xl border border-border bg-card shadow-2xl animate-slide-up-fade sm:inset-x-auto sm:bottom-5 sm:right-5 sm:max-h-[70vh] sm:w-[380px] sm:rounded-2xl"
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Carbon coach</p>
            <p className="text-xs text-muted-foreground">
              Grounded in your own receipts
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(false)}
          aria-label="Close the carbon coach"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div
        className="flex-1 space-y-2 overflow-y-auto px-4 py-3"
        aria-live="polite"
        aria-busy={busy}
      >
        {thread.length === 0 && (
          <button
            onClick={() => ask(SUGGESTED_QUESTION)}
            className="w-full rounded-lg border border-dashed border-border px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary/50"
          >
            Try: “{SUGGESTED_QUESTION}”
          </button>
        )}
        {thread.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[85%] animate-slide-up-fade rounded-xl px-3 py-2 text-sm leading-relaxed",
              m.role === "you"
                ? "ml-auto bg-primary text-primary-foreground"
                : "mr-auto bg-secondary text-foreground"
            )}
          >
            {m.role === "coach" ? (
              <Markdown
                allowedElements={MARKDOWN_ELEMENTS}
                unwrapDisallowed
                components={markdownComponents}
              >
                {m.text}
              </Markdown>
            ) : (
              m.text
            )}
          </div>
        ))}
        {busy && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm text-muted-foreground animate-slide-up-fade">
            <Loader2 className="h-4 w-4 animate-spin" />
            <TypingDots />
          </div>
        )}
        <div ref={threadEndRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-border px-4 py-3">
        <Textarea
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
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
          disabled={busy || !question.trim()}
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
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
