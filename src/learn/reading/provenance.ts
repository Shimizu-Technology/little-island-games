import { canonical, deepFreeze } from "../../puzzles/descriptor";
import { sha256Hex } from "../../puzzles/sha256";
import { chamoruWords, type ChamoruWord } from "../content/chamoru";
import { LEGACY_WARMUP_WORDS, PICTURE_WORDS } from "../content/reading/clues";
import { LETTER_LAGOON_BANK } from "../content/reading/lagoon";
import { LADDERS } from "../content/reading/ladders";
import { SENTENCES, type PictureSentence } from "../content/reading/sentences";
import { STORIES, type Tale, type TalePage } from "../content/reading/stories";
import { STORY_STUDIO_BANK } from "../content/reading/studio";
import { WORDS } from "../content/reading/words";
import { WORD_WORKSHOP_BANK } from "../content/reading/workshop";
import type { Task } from "../games/letter-lagoon/puzzle";
import { literacyTracks } from "../growth/literacy";
import type { GrowthQuestion, GrowthStage, GrowthTrack } from "../growth/types";
import type { LearnId, Pace } from "../types";
import { refuse } from "./refuse";

/**
 * The one door for inherited reading content: every word, sentence, passage, tray, CHamoru word and growth reading
 * question (Levels 4-5 of the reading games) that shipped before W1 admission existed. New reading content comes through W1 admission instead (`admitted/`, minted by `tasks.ts`).
 *
 * When this module loads it checks each source once against the digest pinned below, then deep-freezes a copy made
 * from the exact bytes it hashed. From then on only that copy is used; the live source arrays are never read again,
 * so changing them later changes nothing a child sees. A source whose data no longer matches its pin gives nothing
 * (and throws in development). Each record a board can be handed is branded here, in a module-private set:
 * `ReadingText`, `TapWords` and every reading board check the brand with `admittedReading` (`admit.ts`) and refuse
 * anything else, so a raw string, a copy, a spread or an edited record never reaches a child.
 *
 * Only this module imports the inherited sources (checked statically by `tests/reading-provenance-static.test.ts`).
 * Games ask for records by id, level or pace and get the branded records back; they never build reading strings.
 *
 * Each pin below is anchored to an independent frozen baseline, `tests/fixtures/reading-inherited-baseline.json`, which
 * only the lead changes: editing a source and re-pinning its digest here fails that test. Inherited content is never
 * added to or edited; new reading content goes through detached W1 admission.
 */
declare const inherited: unique symbol;
type Branded<T> = Readonly<T> & { readonly [inherited]: true };
export type ReadingWord = Branded<{ word: string; skill: string; pace: Pace; tiles: readonly string[] }>;
export type ReadingSentence = Branded<PictureSentence>;
export type ReadingPage = Branded<TalePage>;
export type ReadingPassage = Branded<Omit<Tale, "pages"> & { pages: readonly ReadingPage[] }>;
export type ReadingTask = Branded<Task>;
export type ReadingLadder = Branded<{ id: string; pace: Pace; skill: string; words: readonly string[] }>;
export type ChamoruRecord = Branded<ChamoruWord>;
export type ReadingQuestion = Branded<GrowthQuestion>;
export type ReadingGrowthTrack = Readonly<Omit<GrowthTrack, "questions"> & { questions: readonly ReadingQuestion[] }>;
export type ReadingGrowthTracks = Readonly<Partial<Record<LearnId, Readonly<Record<GrowthStage, ReadingGrowthTrack>>>>>;
export type InheritedRecord = ReadingWord | ReadingSentence | ReadingPage | ReadingPassage | ReadingTask | ReadingLadder | ChamoruRecord | ReadingQuestion;
export type BankGame = "letter-lagoon" | "story-studio" | "word-workshop";

/**
 * Digest of each source's exact exported data (functions are code and are left out; a set is hashed as its sorted
 * members). Adding, removing or editing anything a source exports changes its digest on purpose.
 */
export const INHERITED_SOURCE_DIGESTS = {
  chamoru: "621cc0a463fac4aab4ca365e4fcab6ecffde5206e8477640f7c0907d99c3d73a",
  clues: "20aa0c8cf42c3135e9d25b38a0acc92cab7dd70e6cb9f0cbeb5817b612933457",
  growth: "9f205888b588dc4b541ac459a842499bb4ca71355293204bcadff03939cfbe74",
  ladders: "f75c86b133962f71883c8fe50283150fa5192243de4f9cd835f2bc6f0292cc52",
  lagoon: "1bfc8b89b503829c10cf23f469c923a8b5d60436499dd21fcec36595cfe47980",
  sentences: "327d4e626c00f1ff87a9bb2c264f7e5743b4a548339923ce215324c7475675de",
  stories: "999c10ba0fc3ac29b75f228c4b84885eb9949b3080d5fd343c7edd034c78c1f3",
  studio: "c9cff9b57980f57a2159e3e06015b5a44e13e6c4ac817427c71946301c9dbea1",
  words: "7822bf690a6860a8e494be4ee5b051155cb034b230489c4464ceb40f65f05d06",
  workshop: "a97b502e1678a124ca616afe3bd6a761c54b5c350efc102dddd26d3e9182c2f6",
} as const;
export type SourceName = keyof typeof INHERITED_SOURCE_DIGESTS;
/** Every data export of every source, by name. A test checks no source exports data that is missing here. */
const SOURCES: Record<SourceName, Record<string, unknown>> = {
  chamoru: { chamoruWords },
  clues: { LEGACY_WARMUP_WORDS, PICTURE_WORDS },
  growth: { literacyTracks },
  ladders: { LADDERS },
  lagoon: { LETTER_LAGOON_BANK },
  sentences: { SENTENCES },
  stories: { STORIES },
  studio: { STORY_STUDIO_BANK },
  words: { WORDS },
  workshop: { WORD_WORKSHOP_BANK },
};
/** The export names each source is pinned by, for that test. */
export const inheritedSourceExports = (): Record<SourceName, string[]> =>
  Object.fromEntries(Object.entries(SOURCES).map(([name, data]) => [name, Object.keys(data).sort()])) as Record<SourceName, string[]>;
const plain = (v: unknown): unknown => (v instanceof Set ? [...v].sort() : v instanceof Map ? [...v.entries()].sort() : v);
/** The canonical bytes of a source's data, as hashed. */
export const sourceBytes = (data: Record<string, unknown>): string =>
  canonical(Object.fromEntries(Object.keys(data).sort().filter((k) => typeof data[k] !== "function").map((k) => [k, plain(data[k])])));

/** Checks one source against its pin and returns a deep-frozen copy parsed from the bytes it hashed, or null. */
function pinned(name: SourceName): Record<string, any> | null {
  const bytes = sourceBytes(SOURCES[name]);
  if (sha256Hex(bytes) !== INHERITED_SOURCE_DIGESTS[name]) {
    refuse(`The inherited reading source "${name}" no longer matches its pinned digest`);
    return null;
  }
  return deepFreeze(JSON.parse(bytes));
}

const known = new WeakSet<object>();
function brand<T extends object>(records: readonly T[]): readonly Branded<T>[] {
  for (const r of records) known.add(r);
  return records as readonly Branded<T>[];
}
const levels = (bank: unknown): readonly (readonly ReadingTask[])[] =>
  Object.freeze(Array.isArray(bank) && bank.length === 5 ? bank.map((level: Task[]) => brand(level)) : [[], [], [], [], []].map((l) => Object.freeze(l)));
/** The growth reading tracks, already deep-frozen, with every question branded. */
function tracks(all: Record<string, Record<GrowthStage, GrowthTrack>> | undefined): ReadingGrowthTracks {
  for (const stages of Object.values(all ?? {})) for (const track of Object.values(stages)) brand(track.questions);
  return all ?? Object.freeze({});
}

const clues = pinned("clues");
const stories = pinned("stories");
const snapshot = Object.freeze({
  words: brand<ReadingWord>(pinned("words")?.WORDS ?? []),
  sentences: brand<ReadingSentence>(pinned("sentences")?.SENTENCES ?? []),
  passages: brand<ReadingPassage>(stories?.STORIES ?? []),
  pages: brand<ReadingPage>((stories?.STORIES ?? []).flatMap((t: Tale) => t.pages)),
  ladders: brand<ReadingLadder>(pinned("ladders")?.LADDERS ?? []),
  pictureWords: (clues?.PICTURE_WORDS ?? deepFreeze({ easy: [], medium: [], hard: [] })) as Readonly<Record<Pace, readonly string[]>>,
  warmup: new Set<string>(clues?.LEGACY_WARMUP_WORDS ?? []),
  banks: Object.freeze({
    "letter-lagoon": levels(pinned("lagoon")?.LETTER_LAGOON_BANK),
    "story-studio": levels(pinned("studio")?.STORY_STUDIO_BANK),
    "word-workshop": levels(pinned("workshop")?.WORD_WORKSHOP_BANK),
  }) as Readonly<Record<BankGame, readonly (readonly ReadingTask[])[]>>,
  chamoru: brand<ChamoruRecord>(pinned("chamoru")?.chamoruWords ?? []),
  growth: tracks(pinned("growth")?.literacyTracks),
});
const pictured = new Set(Object.values(snapshot.pictureWords).flat());

/** True only for a record this module branded: never a copy, a spread, a parsed or a hand-made object. */
export const isInheritedRecord = (record: unknown): record is InheritedRecord => typeof record === "object" && record !== null && known.has(record);

/** Every inherited decodable word, in shipped order. */
export const readingWords = (): readonly ReadingWord[] => snapshot.words;
/** Picture prompts for Sound Boat, by pace: words whose drawing a 7-year-old names straight away. */
export const pictureWords = (pace: Pace): readonly string[] => snapshot.pictureWords[pace] ?? [];
/** The drawing for a word, only when it is instantly nameable. */
export const pictureFor = (word: string): string | undefined => (pictured.has(word.toLowerCase()) ? word.toLowerCase() : undefined);
/** A warm-up word that rounds saved by app 1.4.0 can still hold. */
export const isLegacyWarmupWord = (word: string): boolean => snapshot.warmup.has(word);
export const readingLadders = (): readonly ReadingLadder[] => snapshot.ladders;
export const readingLadder = (id: unknown): ReadingLadder | undefined => snapshot.ladders.find((l) => l.id === id);
/** Which One's picture sentences. */
export const readingSentences = (): readonly ReadingSentence[] => snapshot.sentences;
export const readingSentence = (id: unknown): ReadingSentence | undefined => snapshot.sentences.find((s) => s.id === id);
/** Turtle Tales' passages; each page is a branded record of its own. */
export const readingPassages = (): readonly ReadingPassage[] => snapshot.passages;
export const readingPassage = (id: unknown): ReadingPassage | undefined => snapshot.passages.find((t) => t.id === id);
/** A shared-board game's five levels of tasks. Saved rounds index into these, so their order never changes. */
export const readingBank = (game: BankGame): readonly (readonly ReadingTask[])[] => snapshot.banks[game];
/** Håfa Adai's CHamoru words (HåfaGPT source-backed terms). */
export const chamoruRecords = (): readonly ChamoruRecord[] => snapshot.chamoru;
export const chamoruRecord = (id: unknown): ChamoruRecord | undefined => snapshot.chamoru.find((w) => w.id === id);
/** The growth quiz's reading tracks, by game and stage. Sessions save question ids and resolve them in these tracks. */
export const readingGrowthTracks = (): ReadingGrowthTracks => snapshot.growth;
