"use client";

import { BaselineCard } from "@/components/dashboard/baseline-card";
import { BudgetCard } from "@/components/dashboard/budget-card";
import { CoachWidget } from "@/components/dashboard/coach-widget";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { HistoryCard } from "@/components/dashboard/history-card";
import { ReceiptDetail } from "@/components/dashboard/receipt-detail";
import {
  DashboardSkeleton,
  EmptyState,
  OfflineNotice,
} from "@/components/dashboard/states";
import { TrendsCard } from "@/components/dashboard/trends-card";
import { useDashboardData } from "@/components/dashboard/use-dashboard-data";

/**
 * Dashboard layout. All data fetching lives in `useDashboardData`; each panel
 * is its own component under `components/dashboard/`.
 */
export default function DashboardPage() {
  const {
    receipts,
    selected,
    selectReceipt,
    budget,
    setBudget,
    baseline,
    trends,
    loading,
    offline,
    uploading,
    uploadError,
    reload,
    upload,
  } = useDashboardData();

  return (
    <div className="min-h-screen bg-secondary/30">
      <DashboardHeader uploading={uploading} onUpload={upload} />

      <main id="main" className="container py-8">
        {offline && <OfflineNotice onRetry={reload} />}
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
            {/* Main column — the selected receipt */}
            <div className="space-y-6 [&>*]:animate-fade-up">
              {selected ? (
                <ReceiptDetail receipt={selected} />
              ) : (
                <EmptyState onUpload={upload} uploading={uploading} />
              )}
            </div>

            {/* Side column — track + reduce */}
            <div className="space-y-6">
              {budget && (
                <div className="animate-fade-up [animation-delay:60ms]">
                  <BudgetCard budget={budget} onSet={setBudget} />
                </div>
              )}
              {/* A baseline comparison is meaningless with no receipts yet. */}
              {baseline && receipts.length > 0 && (
                <div className="animate-fade-up [animation-delay:120ms]">
                  <BaselineCard baseline={baseline} />
                </div>
              )}
              <div className="animate-fade-up [animation-delay:180ms]">
                <TrendsCard trends={trends} />
              </div>
              <div className="animate-fade-up [animation-delay:240ms]">
                <HistoryCard
                  receipts={receipts}
                  selectedId={selected?.id ?? null}
                  onSelect={selectReceipt}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Coach floats above the page so answers never crowd the side column. */}
      <CoachWidget />
    </div>
  );
}
