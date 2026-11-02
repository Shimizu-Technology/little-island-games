import categories from "../../content/library/categories.json";
import { TOPICS } from "../explore/content";
import type { WorldId } from "../explore/content";
import type { LabState } from "../explore/activities";
import { newExploreProgress, validExploreProgress, type ExploreProgress } from "../explore/progress";

export type LibraryPolicy = { collections: string[]; hours: { enabled: boolean; start: number; end: number } };
export type DrawingStroke = { color: string; width: number; points: { x: number; y: number }[] };
export type DrawingStamp = { id: string; x: number; y: number; size: number };
export type LibraryCreation = {
  id: string;
  title: string;
  sourceId?: string;
  sentences: string;
  updatedAt: number;
  strokes: DrawingStroke[];
  stamps: DrawingStamp[];
};
export type LibraryChildState = {
  version: 1;
  saved: string[];
  recent: string[];
  bookPages: Record<string, number>;
  layers: Record<string, "tell" | "more" | "deep">;
  query: string;
  category: string;
  positions: Record<string, number>;
  labs: Record<WorldId, LabState>;
  creations: LibraryCreation[];
  policy: LibraryPolicy;
  current?: string;
  onlyFavorites?: boolean;
};
export type LegacyExplore = { favorites: string[]; progress?: ExploreProgress };
export type LibraryData = {
  version: 1;
  profiles: Record<string, LibraryChildState>;
  /** Exact validated legacy payload, including retired IDs and every interrupted lab. */
  archive?: { explore: LegacyExplore };
};
/** Shared by all five profiles and the archive, leaving room in the 2 MB backup. */
export const LIBRARY_DATA_MAX_BYTES = 1_000_000;
export const LIBRARY_CHILD_MAX_BYTES = LIBRARY_DATA_MAX_BYTES;
export const LIBRARY_MAX_CREATIONS = 24;
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
const keys = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every((k) => allowed.includes(k));
const id = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9][a-z0-9._:-]{0,159}$/i.test(v);
const integer = (v: unknown, max: number): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= max;
const number = (v: unknown, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
const ids = (v: unknown, max: number): v is string[] =>
  Array.isArray(v) && v.length <= max && v.every(id) && new Set(v).size === v.length;
const text = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;
function record(v: unknown, max: number, valid: (value: unknown) => boolean): boolean {
  return object(v) && Object.keys(v).length <= max && Object.entries(v).every(([k, value]) => id(k) && valid(value));
}
/** JSON byte budget, independent of browser-only encoders (also rejects cycles). */
function fits(v: unknown, max: number): boolean {
  try {
    const json = JSON.stringify(v);
    if (!json || json.length > max) return false;
    let bytes = 0;
    for (let i = 0; i < json.length; i++) {
      const c = json.charCodeAt(i);
      if (c < 0x80) bytes++;
      else if (c < 0x800) bytes += 2;
      else if (c >= 0xd800 && c <= 0xdbff) {
        bytes += 4;
        i++;
      } else bytes += 3;
      if (bytes > max) return false;
    }
    return true;
  } catch {
    return false;
  }
}
export function validLibraryPolicy(v: unknown): v is LibraryPolicy {
  return (
    object(v) &&
    keys(v, ["collections", "hours"]) &&
    ids(v.collections, 64) &&
    object(v.hours) &&
    keys(v.hours, ["enabled", "start", "end"]) &&
    typeof v.hours.enabled === "boolean" &&
    integer(v.hours.start, 1439) &&
    integer(v.hours.end, 1439)
  );
}
export function newLibraryChild(): LibraryChildState {
  return {
    version: 1,
    saved: [],
    recent: [],
    bookPages: {},
    layers: {},
    query: "",
    category: "all",
    positions: {},
    labs: newExploreProgress().labs,
    onlyFavorites: false,
    creations: [],
    policy: { collections: categories.map((c) => c.id), hours: { enabled: false, start: 0, end: 0 } },
  };
}
export function libraryHoursOpen(policy: LibraryPolicy, date: Date): boolean {
  if (!validLibraryPolicy(policy)) return false;
  const { enabled, start, end } = policy.hours;
  if (!enabled || start === end) return true;
  const minutes = date.getHours() * 60 + date.getMinutes();
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}
function validCreation(v: unknown): v is LibraryCreation {
  return (
    object(v) &&
    keys(v, ["id", "title", "sourceId", "sentences", "updatedAt", "strokes", "stamps"]) &&
    id(v.id) &&
    text(v.title, 120) &&
    (v.sourceId === undefined || id(v.sourceId)) &&
    text(v.sentences, 4000) &&
    integer(v.updatedAt, 8_640_000_000_000_000) &&
    Array.isArray(v.strokes) &&
    v.strokes.length <= 256 &&
    v.strokes.every(
      (s) =>
        object(s) &&
        keys(s, ["color", "width", "points"]) &&
        typeof s.color === "string" &&
        /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(s.color) &&
        number(s.width, 64) &&
        s.width > 0 &&
        Array.isArray(s.points) &&
        s.points.length > 0 &&
        s.points.length <= 2048 &&
        s.points.every((p) => object(p) && keys(p, ["x", "y"]) && number(p.x, 1) && number(p.y, 1))
    ) &&
    Array.isArray(v.stamps) &&
    v.stamps.length <= 256 &&
    v.stamps.every(
      (s) =>
        object(s) &&
        keys(s, ["id", "x", "y", "size"]) &&
        id(s.id) &&
        number(s.x, 1) &&
        number(s.y, 1) &&
        number(s.size, 1) &&
        s.size > 0
    )
  );
}
export function validLibraryChild(v: unknown): v is LibraryChildState {
  return (
    object(v) &&
    keys(v, [
      "version",
      "saved",
      "recent",
      "bookPages",
      "layers",
      "query",
      "category",
      "positions",
      "creations",
      "policy",
      "current",
      "onlyFavorites",
      "labs",
    ]) &&
    v.version === 1 &&
    ids(v.saved, 500) &&
    ids(v.recent, 24) &&
    record(v.bookPages, 500, (p) => integer(p, 10000)) &&
    record(v.layers, 500, (l) => ["tell", "more", "deep"].includes(l as string)) &&
    text(v.query, 200) &&
    id(v.category) &&
    record(v.positions, 512, (p) => number(p, 1_000_000)) &&
    (v.current === undefined || id(v.current)) &&
    (v.onlyFavorites === undefined || typeof v.onlyFavorites === "boolean") &&
    object(v.labs) &&
    keys(v.labs, ["space", "oceans", "animals", "weather", "world"]) &&
    validExploreProgress({ ...newExploreProgress(), labs: v.labs }) &&
    Array.isArray(v.creations) &&
    v.creations.length <= LIBRARY_MAX_CREATIONS &&
    v.creations.every(validCreation) &&
    new Set(v.creations.map((c) => c.id)).size === v.creations.length &&
    validLibraryPolicy(v.policy) &&
    fits(v, LIBRARY_CHILD_MAX_BYTES)
  );
}
/** Unknown topic IDs remain recoverable without weakening lab/progress validation. */
export function validLegacyExplore(v: unknown): v is LegacyExplore {
  if (!object(v) || !ids(v.favorites, 50) || !fits(v, 200_000)) return false;
  if (v.progress === undefined) return true;
  if (!object(v.progress)) return false;
  const p = v.progress;
  const location = (l: unknown): unknown =>
    object(l) && l.kind === "topic" && id(l.id) ? { ...l, id: TOPICS[0].id } : l;
  if (!object(p.positions) || !Array.isArray(p.history)) return false;
  // Validate every unknown position independently; mapping several retired IDs to
  // one known key must not hide an invalid coordinate or bypass the entry cap.
  if (
    Object.keys(p.positions).length > 64 ||
    !Object.entries(p.positions).every(
      ([key, y]) => number(y, 1_000_000) && (!key.startsWith("topic:") || id(key.slice(6)))
    )
  )
    return false;
  return validExploreProgress({
    ...p,
    location: location(p.location),
    history: p.history.map(location),
    positions: Object.fromEntries(
      Object.entries(p.positions).map(([key, y]) => [key.startsWith("topic:") ? `topic:${TOPICS[0].id}` : key, y])
    ),
  });
}
export function validLibraryData(v: unknown): v is LibraryData {
  return (
    object(v) &&
    keys(v, ["version", "profiles", "archive"]) &&
    v.version === 1 &&
    object(v.profiles) &&
    Object.keys(v.profiles).length <= 5 &&
    Object.entries(v.profiles).every(
      ([childId, child]) => /^[a-z0-9-]{1,40}$/.test(childId) && validLibraryChild(child)
    ) &&
    (v.archive === undefined ||
      (object(v.archive) && keys(v.archive, ["explore"]) && validLegacyExplore(v.archive.explore))) &&
    fits(v, LIBRARY_DATA_MAX_BYTES)
  );
}
export function libraryChild(data: LibraryData | undefined, childId: string): LibraryChildState {
  return data && Object.hasOwn(data.profiles, childId) ? data.profiles[childId] : newLibraryChild();
}
/** Pure one-time projection. The original Explore field and archive are never edited. */
export function migrateLibrary<
  T extends { library?: LibraryData; explore?: LegacyExplore; learning?: { active: string } },
>(save: T): T & { library: LibraryData } {
  if (save.library) return save as T & { library: LibraryData };
  const child = newLibraryChild(),
    explore = save.explore;
  if (explore) {
    child.saved = [...explore.favorites];
    const progress = explore.progress;
    if (progress) {
      child.query = progress.query;
      child.onlyFavorites = progress.onlyFavorites;
      child.labs = JSON.parse(JSON.stringify(progress.labs)) as Record<WorldId, LabState>;
      child.positions = { ...progress.positions };
      if (progress.location.kind === "topic") child.current = progress.location.id;
      if ("world" in progress.location)
        child.category = (
          { oceans: "ocean", world: "guam", space: "space", weather: "weather", animals: "animals" } as const
        )[progress.location.world];
      child.recent = [
        ...new Set(
          [progress.location, ...[...progress.history].reverse()].flatMap((l) => (l.kind === "topic" ? [l.id] : []))
        ),
      ].slice(0, 24);
    }
  }
  return {
    ...save,
    library: {
      version: 1,
      profiles: { [save.learning?.active ?? "family"]: child },
      ...(explore ? { archive: { explore: JSON.parse(JSON.stringify(explore)) as LegacyExplore } } : {}),
    },
  };
}
