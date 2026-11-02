/** One wonder, including links and saves created before the reviewed Library edition. */
export const canonicalLibraryId = (id: string) => id === "turtles" ? "turtle-breath" : id;

/** Preserve the old archive while new visits keep one recent entry per wonder. */
export function rememberLibraryDestination(previous: readonly string[], destination: string) {
  return [...new Set([canonicalLibraryId(destination), ...previous.map(canonicalLibraryId)])].slice(0, 24);
}
