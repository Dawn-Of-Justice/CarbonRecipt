/**
 * Anonymous per-browser identity.
 *
 * The backend keys all history (receipts, budget, trends) by a `userId`. Rather
 * than require a login, we mint a random id once and persist it in
 * localStorage, so each browser gets its own private history with zero friction.
 * Clearing site data starts a fresh identity. This upgrades cleanly to real
 * auth later: swap this for the signed-in user's id.
 */
const STORAGE_KEY = "cr_user_id";
const FALLBACK_ID = "demo-user";

export function getUserId(): string {
  // Server-side / non-browser: fall back to the shared demo user.
  if (typeof window === "undefined") return FALLBACK_ID;
  try {
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // Private mode / storage disabled: degrade to the shared demo user.
    return FALLBACK_ID;
  }
}
