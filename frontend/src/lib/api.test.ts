import { afterEach, describe, expect, it, vi } from "vitest";

import { api, ApiError } from "./api";
import { EQUIV } from "./types";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ApiError", () => {
  it("carries a status code and message", () => {
    const err = new ApiError("nope", 404);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ApiError");
    expect(err.status).toBe(404);
  });
});

describe("api client error handling", () => {
  it("maps a non-OK response to an ApiError with the server detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        statusText: "Unprocessable",
        json: async () => ({ detail: "bad items" }),
      })
    );
    await expect(api.listReceipts()).rejects.toMatchObject({
      status: 422,
      message: "bad items",
    });
  });

  it("maps a network failure to ApiError status 0", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(api.baseline()).rejects.toMatchObject({ status: 0 });
  });

  it("returns parsed JSON on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [{ id: "r1" }],
      })
    );
    await expect(api.listReceipts()).resolves.toEqual([{ id: "r1" }]);
  });
});

describe("equivalence constants stay in sync with the backend contract", () => {
  it("matches API_CONTRACT values", () => {
    expect(EQUIV.KM_PER_KG).toBe(5.56);
    expect(EQUIV.CHARGES_PER_KG).toBe(121.6);
    expect(EQUIV.TREES_PER_KG).toBe(0.0455);
  });
});
