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
function lsGet<T>(): T | null {
  try {
    return safeParse<T>(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

function lsSet<T>(data: T): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* private mode / quota — nothing else we can do */
  }
}

// ── Tauri Store plugin (lazy-loaded so the web bundle never pulls it in) ──────
type TauriStore = {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
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

/** Synchronous read — returns persisted data on web, or null when we must wait
 *  on the async native backend. Use to seed the very first render. */
export function loadSync<T>(): T | null {
  if (isTauri()) return null;
  return lsGet<T>();
}

/** Full read. Native goes through the Store plugin (falling back to
 *  localStorage if the plugin is somehow unavailable). */
export async function load<T>(): Promise<T | null> {
  if (isTauri()) {
    try {
      const store = await tauriStore();
      const value = await store.get<T>(KEY);
      return value ?? null;
    } catch {
      return lsGet<T>();
    }
  }
  return lsGet<T>();
}

/** Persist the whole document. */
export async function save<T>(data: T): Promise<void> {
  if (isTauri()) {
    try {
      const store = await tauriStore();
      await store.set(KEY, data);
      await store.save();
      return;
    } catch {
      /* fall through to localStorage so data is never silently lost */
    }
  }
  lsSet(data);
}
