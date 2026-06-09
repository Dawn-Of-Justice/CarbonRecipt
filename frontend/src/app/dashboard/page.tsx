"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Leaf,
  Loader2,
  MessageSquare,
  Receipt as ReceiptIcon,
  Send,
  Target,
  TrendingUp,
  Upload,
} from "lucide-react";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EcoScoreBadge, SourceBadge } from "@/components/dashboard/badges";
import { EquivalenceCard } from "@/components/dashboard/equivalence-card";
import { CountUp } from "@/components/dashboard/count-up";

import { api, ApiError } from "@/lib/api";
import { CATEGORY_COLORS } from "@/lib/design";
import {
  CATEGORY_LABELS,
  type Baseline,
  type Budget,
  type Category,
  type Receipt,
  type TrendPoint,
} from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

export default function DashboardPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, b, base, t] = await Promise.all([
        api.listReceipts(),
        api.getBudget().catch(() => null),
        api.baseline().catch(() => null),
        api.trends("weekly").catch(() => [] as TrendPoint[]),
      ]);
      setReceipts(r);
      setSelectedId((prev) => prev ?? r[0]?.id ?? null);
      setBudget(b);
      setBaseline(base);
      setTrends(t);
      setOffline(false);
    } catch (err) {
      setOffline(err instanceof ApiError && err.status === 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => receipts.find((r) => r.id === selectedId) ?? receipts[0] ?? null,
    [receipts, selectedId]
  );

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const receipt = await api.uploadReceipt(file);
      setReceipts((prev) => [receipt, ...prev]);
      setSelectedId(receipt.id);
      // refresh dependent panels
      api.getBudget().then(setBudget).catch(() => {});
      api.trends("weekly").then(setTrends).catch(() => {});
      api.baseline().then(setBaseline).catch(() => {});
    } catch (err) {
      setUploadError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong reading that receipt."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <DashboardHeader uploading={uploading} onUpload={handleUpload} />

      <main id="main" className="container py-8">
        {offline && <OfflineNotice onRetry={load} />}
        {uploadError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {uploadError}
          </div>
        )}

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            {/* MAIN COLUMN — selected receipt */}
            <div className="space-y-6 [&>*]:animate-fade-up">
              {selected ? (
                <ReceiptDetail receipt={selected} />
              ) : (
                <EmptyState onUpload={handleUpload} uploading={uploading} />
              )}
            </div>

            {/* SIDE COLUMN — track + reduce + coach */}
            <div className="space-y-6">
              {budget && (
                <div className="animate-fade-up [animation-delay:60ms]">
                  <BudgetCard budget={budget} onSet={setBudget} />
                </div>
              )}
              {baseline && (
                <div className="animate-fade-up [animation-delay:120ms]">
                  <BaselineCard baseline={baseline} />
                </div>
              )}
              <div className="animate-fade-up [animation-delay:180ms]">
                <TrendsCard trends={trends} />
              </div>
              <div className="animate-fade-up [animation-delay:240ms]">
                <CoachCard />
              </div>
              <div className="animate-fade-up [animation-delay:300ms]">
                <HistoryCard
                  receipts={receipts}
                  selectedId={selected?.id ?? null}
                  onSelect={setSelectedId}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ------------------------------- Header ------------------------------- */
function DashboardHeader({
  uploading,
  onUpload,
}: {
  uploading: boolean;
  onUpload: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" aria-label="Home">
            <Logo />
          </Link>
          <Link
            href="/"
            className="hidden items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground sm:flex"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Upload a receipt image"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="group"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Reading receipt…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 transition-transform duration-300 ease-out-quint group-hover:-translate-y-0.5" />{" "}
                Upload receipt
              </>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}

/* --------------------------- Receipt detail --------------------------- */
function ReceiptDetail({ receipt }: { receipt: Receipt }) {
  const breakdown = Object.entries(receipt.categoryBreakdown)
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([k, v]) => ({
      category: k as Category,
      name: CATEGORY_LABELS[k as Category],
      value: Number(v),
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <>
      {/* Hero total + equivalence */}
      <Card className="overflow-hidden">
        <div className="receipt-edge h-2 bg-primary" />
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {receipt.merchant ?? "Receipt"} ·{" "}
                {new Date(receipt.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
              <div className="mt-1 font-display text-5xl font-bold text-primary">
                <CountUp value={receipt.totalCo2eKg} decimals={1} />
                <span className="ml-2 text-xl font-medium text-muted-foreground">
                  kg CO₂e
                </span>
              </div>
            </div>
            <span className="rounded-full bg-leaf-100 px-3 py-1 text-xs font-medium text-leaf-800">
              {receipt.items.length} items
            </span>
          </div>
          <div className="mt-6">
            <EquivalenceCard equivalence={receipt.equivalence} />
          </div>
        </CardContent>
      </Card>

      {/* Breakdown + items */}
      <Card>
        <CardHeader>
          <CardTitle>Where your carbon comes from</CardTitle>
          <CardDescription>
            Category breakdown and every line, with its data source &amp;
            confidence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-[200px_1fr] sm:items-center">
            <div
              className="relative h-[200px]"
              role="img"
              aria-label={
                "Category breakdown: " +
                breakdown
                  .map((d) => `${d.name} ${d.value.toFixed(1)} kg`)
                  .join(", ")
              }
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={84}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {breakdown.map((d) => (
                      <Cell
                        key={d.category}
                        fill={CATEGORY_COLORS[d.category]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [`${v.toFixed(2)} kg`, "CO₂e"]}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-lg font-bold">
                  {formatNumber(receipt.totalCo2eKg, 1)}
                </span>
                <span className="text-[10px] uppercase text-muted-foreground">
                  kg total
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              {breakdown.map((d) => (
                <div key={d.category} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[d.category] }}
                  />
                  <span className="flex-1 text-foreground">{d.name}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {d.value.toFixed(1)} kg
                  </span>
                  <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {((d.value / receipt.totalCo2eKg) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Item table */}
          <div className="mt-6 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Line items in this receipt with their Eco-Score, data source, and
                CO₂e in kilograms, sorted highest first.
              </caption>
              <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Item
                  </th>
                  <th scope="col" className="px-2 py-2.5 text-center font-medium">
                    Eco
                  </th>
                  <th
                    scope="col"
                    className="hidden px-2 py-2.5 font-medium sm:table-cell"
                  >
                    Source
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    CO₂e
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...receipt.items]
                  .sort((a, b) => b.co2eKg - a.co2eKg)
                  .map((it, i) => (
                    <tr
                      key={`${it.name}-${i}`}
                      className="animate-slide-up-fade transition-colors hover:bg-secondary/30"
                      style={{ animationDelay: `${Math.min(i, 10) * 45}ms` }}
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-foreground">
                          {it.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {it.quantity} {it.unit} · {CATEGORY_LABELS[it.category]}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <EcoScoreBadge score={it.ecoScore} size="sm" />
                      </td>
                      <td className="hidden px-2 py-2.5 sm:table-cell">
                        <SourceBadge
                          source={it.source}
                          confidence={it.confidence}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                        {it.co2eKg.toFixed(2)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Swaps */}
      {receipt.topSwaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-primary" /> Top swaps to cut your
              footprint
            </CardTitle>
            <CardDescription>
              The highest-impact changes for this basket.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {receipt.topSwaps.map((s, i) => (
              <div
                key={s.fromItem}
                className="group animate-slide-up-fade rounded-xl border border-border bg-card p-4 transition-[transform,box-shadow,border-color] duration-300 ease-out-quint hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground line-through decoration-destructive/50">
                    {s.fromItem}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-primary">
                  → {s.toSuggestion}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {s.rationale}
                </p>
                <p className="mt-3 inline-flex rounded-full bg-leaf-100 px-2.5 py-1 text-xs font-semibold text-leaf-800 transition-colors group-hover:bg-leaf-200">
                  saves {s.co2eSavedKg.toFixed(1)} kg CO₂e
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}

/* ------------------------------ Budget ------------------------------ */
function BudgetCard({
  budget,
  onSet,
}: {
  budget: Budget;
  onSet: (b: Budget) => void;
}) {
  const [target, setTarget] = useState(String(budget.monthlyTargetKg));
  const [saving, setSaving] = useState(false);
  const [fill, setFill] = useState(0);
  const pct = Math.min(100, budget.percentUsed);
  const barColor =
    budget.status === "over"
      ? "bg-destructive"
      : budget.status === "warning"
        ? "bg-orange-500"
        : "bg-primary";

  // Grow the bar from 0 to its value on mount / when the value changes.
  useEffect(() => {
    const id = requestAnimationFrame(() => setFill(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  async function save() {
    const n = Number(target);
    if (!Number.isFinite(n) || n <= 0) return;
    setSaving(true);
    try {
      onSet(await api.setBudget(n));
    } catch {
      /* keep prior */
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-primary" /> Monthly carbon budget
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-end justify-between text-sm">
            <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {formatNumber(budget.currentMonthKg, 1)}
            </span>
            <span className="text-muted-foreground">
              / {formatNumber(budget.monthlyTargetKg, 0)} kg
            </span>
          </div>
          <div
            className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={Math.round(budget.percentUsed)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Monthly carbon budget: ${budget.percentUsed.toFixed(0)}% used, status ${budget.status}`}
          >
            <div
              className={cn(
                "relative h-full overflow-hidden rounded-full transition-[width] [transition-duration:900ms] ease-out-quint motion-reduce:transition-none",
                barColor
              )}
              style={{ width: `${fill}%` }}
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-white/40 blur-[2px] animate-sheen motion-reduce:hidden"
              />
            </div>
          </div>
          <p
            className={cn(
              "mt-2 text-xs font-medium",
              budget.status === "over"
                ? "text-destructive"
                : budget.status === "warning"
                  ? "text-orange-600"
                  : "text-leaf-700"
            )}
          >
            {budget.percentUsed.toFixed(0)}% used ·{" "}
            {budget.status === "over"
              ? "over budget"
              : budget.status === "warning"
                ? "approaching limit"
                : "on track"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="h-9"
            aria-label="Monthly target kg"
          />
          <Button size="sm" variant="outline" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ----------------------------- Baseline ----------------------------- */
function BaselineCard({ baseline }: { baseline: Baseline }) {
  const below = baseline.deltaPercent <= 0;
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
            below ? "bg-leaf-100 text-leaf-700" : "bg-orange-100 text-orange-700"
          )}
        >
          <TrendingUp
            className={cn("h-6 w-6", below && "rotate-180")}
          />
        </div>
        <div>
          <p className="font-display text-xl font-semibold text-foreground">
            {Math.abs(baseline.deltaPercent).toFixed(0)}%{" "}
            {below ? "below" : "above"}
          </p>
          <p className="text-xs text-muted-foreground">{baseline.label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------ Trends ------------------------------ */
function TrendsCard({ trends }: { trends: TrendPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Footprint trend</CardTitle>
        <CardDescription>CO₂e per period</CardDescription>
      </CardHeader>
      <CardContent>
        {trends.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Upload a few receipts to see your trend.
          </p>
        ) : (
          <div
            className="h-[160px]"
            role="img"
            aria-label={
              "Footprint trend over " +
              trends.length +
              " periods, from " +
              (trends[0]?.co2eKg.toFixed(1) ?? "0") +
              " to " +
              (trends[trends.length - 1]?.co2eKg.toFixed(1) ?? "0") +
              " kg CO₂e."
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trends}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  formatter={(v: number) => [`${v.toFixed(1)} kg`, "CO₂e"]}
                  contentStyle={tooltipStyle}
                />
                <Line
                  type="monotone"
                  dataKey="co2eKg"
                  stroke="#0a8d56"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#0a8d56" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------ Coach ------------------------------ */
function CoachCard() {
  const [q, setQ] = useState("");
  const [thread, setThread] = useState<{ role: "you" | "coach"; text: string }[]>(
    []
  );
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
            onClick={() => ask("Why is my footprint high this week?")}
            className="w-full rounded-lg border border-dashed border-border px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary/50"
          >
            Try: “Why is my footprint high this week?”
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

/* ----------------------------- History ----------------------------- */
function HistoryCard({
  receipts,
  selectedId,
  onSelect,
}: {
  receipts: Receipt[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ReceiptIcon className="h-4 w-4 text-primary" /> History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {receipts.length === 0 && (
          <p className="text-sm text-muted-foreground">No receipts yet.</p>
        )}
        {receipts.map((r) => (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
              r.id === selectedId
                ? "border-primary/40 bg-leaf-50"
                : "border-transparent hover:bg-secondary/50"
            )}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {r.merchant ?? "Receipt"}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(r.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}{" "}
                · {r.items.length} items
              </p>
            </div>
            <span className="font-mono text-sm font-semibold tabular-nums text-primary">
              {r.totalCo2eKg.toFixed(1)}
            </span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

/* ------------------------- States & helpers ------------------------- */
function EmptyState({
  onUpload,
  uploading,
}: {
  onUpload: (f: File) => void;
  uploading: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-leaf-100 text-leaf-700 animate-float motion-reduce:animate-none">
          <Upload className="h-7 w-7" />
        </div>
        <h2 className="mt-5 font-display text-xl font-semibold">
          Upload your first receipt
        </h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Snap a grocery receipt and we&apos;ll turn it into a real carbon
          footprint with personalized swaps.
        </p>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="Choose a receipt image to upload"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
          }}
        />
        <Button className="mt-6" onClick={() => ref.current?.click()} disabled={uploading}>
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Reading…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" /> Choose a receipt
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function OfflineNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <span>
        Can&apos;t reach the backend. Start it on{" "}
        <code className="rounded bg-amber-100 px-1">http://localhost:8000</code>.
      </span>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    </div>
  );
}

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

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  fontSize: 12,
  boxShadow: "0 8px 24px -12px rgba(12,73,50,0.25)",
} as const;
