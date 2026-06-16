// On-device persistence for Peak's single AppData document.
//
// Two backends, picked at runtime:
//   • Native (Tauri desktop/iOS/Android) → the official Store plugin, which
//     writes a JSON file in the per-platform app-data directory. Durable, and
//     survives webview cache clears.
//   • Web / fallback → localStorage, which is still on-device for the webview.
//
// Nothing here ever talks to a network. The web path is synchronous (no first
// paint flash); the native path loads asynchronously and is awaited on mount.

const KEY = "peak.peakdata.v3";
const STORE_FILE = "peak.json";

// Secondary key: the in-progress live Gym session, persisted separately so a
// reload mid-workout never loses it (it is NOT scored capability data — it only
// becomes a real Session on "Finish").
export const ACTIVE_SESSION_KEY = "peak.active_session.v1";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ── localStorage (web + fallback) ────────────────────────────────────────────
function lsGet<T>(key: string): T | null {
  try {
    return safeParse<T>(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function lsSet<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* private mode / quota — nothing else we can do */
  }
}

function lsRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing else we can do */
  }
}

// ── Tauri Store plugin (lazy-loaded so the web bundle never pulls it in) ──────
type TauriStore = {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  save(): Promise<void>;
};
let storePromise: Promise<TauriStore> | null = null;

function tauriStore(): Promise<TauriStore> {
  if (!storePromise) {
    storePromise = import("@tauri-apps/plugin-store").then((m) =>
      m.load(STORE_FILE, { defaults: {}, autoSave: false }) as unknown as Promise<TauriStore>,
    );
  }
  return storePromise;
}

/** Synchronous read of any key — returns persisted data on web, or null when we
 *  must wait on the async native backend. Use to seed the very first render. */
export function loadSyncAt<T>(key: string): T | null {
  if (isTauri()) return null;
  return lsGet<T>(key);
}

/** Full read of any key. Native goes through the Store plugin (falling back to
 *  localStorage if the plugin is somehow unavailable). */
export async function loadAt<T>(key: string): Promise<T | null> {
  if (isTauri()) {
    try {
      const store = await tauriStore();
      const value = await store.get<T>(key);
      return value ?? null;
    } catch {
      return lsGet<T>(key);
    }
  }
  return lsGet<T>(key);
}

/** Persist a value under any key. */
export async function saveAt<T>(key: string, data: T): Promise<void> {
  if (isTauri()) {
    try {
      const store = await tauriStore();
      await store.set(key, data);
      await store.save();
      return;
    } catch {
      /* fall through to localStorage so data is never silently lost */
    }
  }
  lsSet(key, data);
}

/** Remove a key (e.g. after a live session is finished or discarded). */
export async function removeAt(key: string): Promise<void> {
  if (isTauri()) {
    try {
      const store = await tauriStore();
      await store.delete(key);
      await store.save();
      return;
    } catch {
      /* fall through to localStorage */
    }
  }
  lsRemove(key);
}

// ── Canonical-document convenience wrappers (the single PeakData doc) ─────────
export const loadSync = <T>(): T | null => loadSyncAt<T>(KEY);
export const load = <T>(): Promise<T | null> => loadAt<T>(KEY);
export const save = <T>(data: T): Promise<void> => saveAt<T>(KEY, data);
