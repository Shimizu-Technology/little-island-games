/** Web lab runs keep the latest log on the local inspector only. */
export function writeTraceFile(name: string, text: string) {
  (globalThis as unknown as Record<string, unknown>).__littleIslandTrace = { name, text };
}
