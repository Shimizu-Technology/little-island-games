/** One wonder, including links and saves created before the reviewed Library edition. */
export const canonicalLibraryId = (id: string) => id === "turtles" ? "turtle-breath" : id;

/** Preserve the old archive while new visits keep one recent entry per wonder. */
export function rememberLibraryDestination(previous: readonly string[], destination: string) {
  return [...new Set([canonicalLibraryId(destination), ...previous.map(canonicalLibraryId)])].slice(0, 24);
}

/** Durable, deduplicated per-child visited history (bounded to 500 entries). */
export function rememberVisitedDestination(previous: readonly string[] | undefined, destination: string) {
  const next = canonicalLibraryId(destination);
  return [...new Set([...(previous ?? []).map(canonicalLibraryId).filter((id) => id !== next), next])].slice(-500);
}
