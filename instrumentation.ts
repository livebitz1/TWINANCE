/**
 * Patches Node's broken experimental localStorage when --localstorage-file is used
 * without a valid path. In that case global localStorage exists but getItem/setItem
 * are not functions, which breaks Clerk and other code during SSR.
 * Run patch immediately when this module loads so it happens before any other code.
 */
function patchBrokenLocalStorage() {
  if (typeof process === "undefined" || process.env?.NEXT_RUNTIME === "edge") return;
  const g = globalThis as typeof globalThis & { localStorage?: Storage | unknown };
  const storage = g.localStorage;
  if (
    storage !== undefined &&
    storage !== null &&
    typeof (storage as Storage).getItem !== "function"
  ) {
    const noop = () => null;
    (g as typeof g & { localStorage: Storage }).localStorage = {
      getItem: noop,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      get length() {
        return 0;
      },
    };
  }
}
patchBrokenLocalStorage();

export async function register() {
  patchBrokenLocalStorage();
}
