import { afterEach, describe, expect, it, vi } from "vitest";

import { getUserId } from "./user-id";

/** Minimal window/localStorage stand-in for the node test environment. */
function stubBrowser(initial: Record<string, string> = {}) {
  const store = { ...initial };
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    },
  });
  return store;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getUserId", () => {
  it("falls back to the shared demo user outside a browser", () => {
    expect(getUserId()).toBe("demo-user");
  });

  it("mints an id once and returns the same one afterwards", () => {
    const store = stubBrowser();
    const first = getUserId();
    expect(first).not.toBe("demo-user");
    expect(store["cr_user_id"]).toBe(first);
    expect(getUserId()).toBe(first);
  });

  it("returns a previously stored id untouched", () => {
    stubBrowser({ cr_user_id: "existing-id" });
    expect(getUserId()).toBe("existing-id");
  });

  it("degrades to the demo user when storage throws (private mode)", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("denied");
        },
        setItem: () => {
          throw new Error("denied");
        },
      },
    });
    expect(getUserId()).toBe("demo-user");
  });

  it("mints ids the backend accepts (URL-safe charset, bounded length)", () => {
    stubBrowser();
    expect(getUserId()).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
  });
});
