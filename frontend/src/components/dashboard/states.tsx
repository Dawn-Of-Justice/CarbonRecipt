"use client";

import { Upload } from "lucide-react";

import { UploadReceiptButton } from "@/components/dashboard/upload-receipt-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** First-run state shown when the user has no receipts yet. */
export function EmptyState({
  onUpload,
  uploading,
}: {
  onUpload: (file: File) => void;
  uploading: boolean;
}) {
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
        <UploadReceiptButton
          uploading={uploading}
          onUpload={onUpload}
          idleLabel="Choose a receipt"
          busyLabel="Reading…"
          className="mt-6"
        />
      </CardContent>
    </Card>
  );
}

/** Banner shown when the backend is unreachable. */
export function OfflineNotice({ onRetry }: { onRetry: () => void }) {
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

/**
 * Layout-matching skeleton shown during the initial load. Each placeholder
 * mirrors the panel it stands in for (hero total, breakdown donut + table,
 * budget, trend, history) so nothing jumps when real data arrives.
 */
export function DashboardSkeleton() {
  return (
    <div
      className="grid gap-6 lg:grid-cols-[1.6fr_1fr]"
      aria-busy="true"
      aria-label="Loading your dashboard"
    >
      <div className="space-y-6">
        {/* Hero total + equivalences */}
        <Card className="overflow-hidden">
          <Skeleton className="h-2 w-full rounded-none" />
          <CardContent className="pt-6">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="mt-3 h-12 w-52" />
            <div className="mt-6 grid grid-cols-3 gap-3">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          </CardContent>
        </Card>
        {/* Breakdown donut + item table */}
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-5 w-64" />
            <div className="mt-6 grid gap-6 sm:grid-cols-[200px_1fr] sm:items-center">
              <Skeleton className="mx-auto h-[180px] w-[180px] rounded-full" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
                <Skeleton className="h-4 w-3/6" />
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-6">
        {/* Budget */}
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="mt-4 h-8 w-24" />
            <Skeleton className="mt-3 h-2.5 w-full rounded-full" />
            <Skeleton className="mt-3 h-9 w-full rounded-lg" />
          </CardContent>
        </Card>
        {/* Baseline */}
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </CardContent>
        </Card>
        {/* Trend chart */}
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-[140px] w-full rounded-lg" />
          </CardContent>
        </Card>
        {/* History */}
        <Card>
          <CardContent className="space-y-2 pt-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
