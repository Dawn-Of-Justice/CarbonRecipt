import type {
  Baseline,
  Budget,
  CoachAnswer,
  FootprintResult,
  ItemFootprint,
  LineItem,
  ParseOnlyResult,
  Receipt,
  TrendPoint,
} from "./types";
import { getUserId } from "./user-id";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    init?.timeoutMs ?? 60_000
  );
  // Scope every call to this browser's anonymous identity so history is
  // per-user. Endpoints that don't use userId simply ignore the param.
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("userId", getUserId());
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init?.body && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...init?.headers,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const body = await res.json();
        detail = body?.detail || body?.message || detail;
      } catch {
        /* ignore */
      }
      throw new ApiError(detail, res.status);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request timed out.", 408);
    }
    throw new ApiError(
      "Could not reach the backend. Is it running on " + API_BASE + "?",
      0
    );
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  health: () => request<{ status: string }>("/health", { timeoutMs: 4000 }),

  // Receipts
  uploadReceipt: (file: File, merchant?: string) => {
    const fd = new FormData();
    fd.append("file", file);
    if (merchant) fd.append("merchant", merchant);
    return request<Receipt>("/receipts", {
      method: "POST",
      body: fd,
      timeoutMs: 90_000,
    });
  },
  listReceipts: () => request<Receipt[]>("/receipts"),
  getReceipt: (id: string) => request<Receipt>(`/receipts/${id}`),
  deleteReceipt: (id: string) =>
    request<{ ok: boolean }>(`/receipts/${id}`, { method: "DELETE" }),

  // Lookup engine
  footprint: (items: LineItem[]) =>
    request<FootprintResult>("/footprint", {
      method: "POST",
      body: JSON.stringify({ items }),
    }),
  parseOnly: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<ParseOnlyResult>("/receipts/parse-only", {
      method: "POST",
      body: fd,
      timeoutMs: 90_000,
    });
  },
  barcode: (code: string) => request<ItemFootprint>(`/barcode/${code}`),

  // Insights
  trends: (range: "weekly" | "monthly" = "weekly") =>
    request<TrendPoint[]>(`/insights/trends?range=${range}`),
  baseline: () => request<Baseline>("/insights/baseline"),
  coach: (question: string) =>
    request<CoachAnswer>("/coach", {
      method: "POST",
      body: JSON.stringify({ question }),
      timeoutMs: 60_000,
    }),

  // Budget
  getBudget: () => request<Budget>("/budget"),
  setBudget: (monthlyTargetKg: number) =>
    request<Budget>("/budget", {
      method: "PUT",
      body: JSON.stringify({ monthlyTargetKg }),
    }),
};
