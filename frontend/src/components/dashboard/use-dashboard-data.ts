"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { api, ApiError } from "@/lib/api";
import type { Baseline, Budget, Receipt, TrendPoint } from "@/lib/types";

/**
 * Owns all dashboard data: receipts, budget, baseline, trends, and the
 * loading / offline / upload state around them. The page component stays a
 * pure layout; every API interaction goes through here.
 */
export function useDashboardData() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      // The side panels are optional: if one fails the dashboard still renders.
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
    void reload();
  }, [reload]);

  const selected = useMemo(
    () => receipts.find((r) => r.id === selectedId) ?? receipts[0] ?? null,
    [receipts, selectedId]
  );

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const receipt = await api.uploadReceipt(file);
      setReceipts((prev) => [receipt, ...prev]);
      setSelectedId(receipt.id);
      // Refresh dependent panels in the background (not awaited) so the new
      // receipt is visible immediately.
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
  }, []);

  return {
    receipts,
    selected,
    selectReceipt: setSelectedId,
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
  };
}
