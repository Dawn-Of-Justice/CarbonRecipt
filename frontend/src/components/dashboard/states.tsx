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

/** Layout-matching skeleton shown during the initial load. */
export function DashboardSkeleton() {
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
