export type WebPopStateHandler = (event: PopStateEvent) => boolean;

type PopStateWindow = {
  history?: { pushState?: unknown };
  addEventListener?: (type: string, listener: (event: PopStateEvent) => void, capture?: boolean) => void;
};

let activeHandler: WebPopStateHandler | null = null;
const attachedWindows = new WeakSet<object>();

function dispatchWebPopState(event: PopStateEvent) {
  if (!activeHandler) return;
  if (activeHandler(event)) {
    event.stopImmediatePropagation?.();
  }
}

/**
 * Register a single permanent web `popstate` listener before Expo Router's `createMemoryHistory`
 * (`useLinking` effect) registers its own listener at app boot. Because `popstate` fires directly
 * at `window` (`AT_TARGET`), listeners run strictly in registration order — so an earlier-registered
 * dispatcher is required for `stopImmediatePropagation()` to prevent Expo Router from calling
 * `navigation.resetRoot(...)` on in-screen sheet dismissals and remounting `StoreProvider`.
 */
export function ensureWebPopStateInterceptor(): void {
  const host = globalThis as { window?: PopStateWindow };
  const win = host.window;
  if (!win || typeof win.addEventListener !== "function" || typeof win.history?.pushState !== "function") return;
  if (attachedWindows.has(win)) return;
  attachedWindows.add(win);
  win.addEventListener("popstate", dispatchWebPopState, true);
}

/** Bind the active screen's web `popstate` handler without ever detaching the boot-priority listener. */
export function registerWebPopStateHandler(handler: WebPopStateHandler): () => void {
  ensureWebPopStateInterceptor();
  activeHandler = handler;
  return () => {
    if (activeHandler === handler) activeHandler = null;
  };
}

// Install eagerly at module evaluation time so even direct route imports beat `useLinking`'s effect.
ensureWebPopStateInterceptor();
