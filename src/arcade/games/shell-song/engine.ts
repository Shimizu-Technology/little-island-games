import { PICTURE_WORDS } from "../../../learn/content/reading/clues";
import { phonemes, wordEntry } from "../../../learn/kit/reading";
import { allLevelIds, levelNumber, nextRandom, worldOf, type ArcadeEngine, type ArcadeLevel, type ArcadeResult, type LevelId } from "../../types";
export type SongLevel = ArcadeLevel & { shells: number; startLength: number; rounds: number; noteMs: number; word?: string };
export type SongState = { level: SongLevel | "endless"; seed: number; helper: boolean; pattern: number[]; shells: number; phase: "watch" | "repeat" | "picture" | "cleared" | "rest"; elapsed: number; cursor: number; rounds: number; slips: number; score: number; lastTap: number | null; choices: string[]; message: string; helped: boolean };
export type SongInput = { type: "tick" } | { type: "shell"; index: number } | { type: "picture"; word: string } | { type: "replay" } | { type: "helper"; value: boolean } | { type: "finish" } | { type: "show" };
// All picture targets and sound tiles come from the existing curated reading bank.
export const songWords = PICTURE_WORDS.easy.filter(word => !!wordEntry(word) && wordEntry(word)!.tiles.length === 3 && wordEntry(word)!.tiles.every(t => t.length === 1) && phonemes(word).length === 3).slice(0, 8);
export const songLevels: readonly SongLevel[] = allLevelIds.map(id => {
  const index = levelNumber(id), world = worldOf(id), rank = ({ w1: 0, w2: 1, w3: 2, learn: 0 })[world], learning = world === "learn";
  const shells = learning ? 3 : 3 + rank + (rank === 2 && index >= 5 ? 1 : 0), startLength = learning ? 3 : 1 + rank + Math.ceil(index / 3), rounds = learning ? 1 : 2 + Math.floor(index / 4), word = learning ? songWords[index - 1] : undefined;
  return { id, index, world, name: learning ? `Sound a word · ${index}` : ["A tiny tune", "Echo by the sea", "Three little voices", "Hear it grow", "Follow the melody", "A song for the fish", "The tide remembers", "Shoreline concert"][index - 1], shells, startLength, rounds, noteMs: learning ? 3200 : 850 - rank * 170 - (index - 1) * 25, ...(word ? { word } : {}), goals: [learning ? "Blend the sounds. Pick their picture." : `Repeat ${rounds} growing patterns`, "Finish with 2 slips or fewer", "Finish with no slips"] };
});
export const songLevel = (id: LevelId) => songLevels.find(l => l.id === id)!;
export const songTiles = (s: SongState): readonly string[] => s.level !== "endless" && s.level.word ? wordEntry(s.level.word)!.tiles : Array.from({ length: s.shells }, (_, i) => ["1", "2", "3", "4", "5", "6"][i]);
export const noteDuration = (s: SongState) => (s.level === "endless" ? Math.max(360, 740 - s.rounds * 22) : s.level.noteMs) + (s.helper ? 180 : 0);
export function glowingShell(s: SongState): number | null {
  if (s.phase !== "watch") return null;
  const duration = noteDuration(s), index = Math.floor(Math.max(0, s.elapsed - 450) / duration);
  return s.elapsed >= 450 && index < s.pattern.length && (s.elapsed - 450) % duration < duration * .72 ? s.pattern[index] : null;
}
function append(s: SongState, count = 1): SongState {
  let seed = s.seed;
  const pattern = s.level === "endless" && s.pattern.length >= 24 ? s.pattern.slice(-23) : [...s.pattern];
  for (let i = 0; i < count; i++) { let n: number; [seed, n] = nextRandom(seed); pattern.push(Math.floor(n * s.shells)); }
  return { ...s, seed, pattern };
}
export function createSong(level: SongState["level"], seed: number, helper = true): SongState {
  const word = level !== "endless" ? level.word : undefined;
  const distractors = PICTURE_WORDS.easy.filter(w => w !== word), choices = word ? [word, distractors[seed % distractors.length], distractors[(seed + 3) % distractors.length]] : [];
  if (word) { const offset = seed % 3; choices.push(...choices.splice(0, offset)); }
  const s: SongState = { level, seed, helper, pattern: [], shells: level === "endless" ? 4 : level.shells, phase: "watch", elapsed: 0, cursor: 0, rounds: 0, slips: 0, score: 0, lastTap: null, choices, message: word ? "Hear each sound. You can replay as often as you like." : "Watch the glowing shells. Then play their song back.", helped: false };
  return word ? { ...s, pattern: [0, 1, 2] } : append(s, level === "endless" ? 2 : level.startLength);
}
export function songStep(s: SongState, input: SongInput, dt: number): SongState {
  if (input.type !== "tick") return songTransition(s, input);
  if (s.phase !== "watch" || !Number.isFinite(dt) || dt <= 0) return s;
  const elapsed = s.elapsed + Math.min(dt, 1 / 30) * 1000;
  return elapsed >= 450 + s.pattern.length * noteDuration(s) ? { ...s, phase: "repeat", elapsed: 0, cursor: 0, message: s.level !== "endless" && s.level.word ? "Tap the sounds in word order. There is no hurry." : "Your turn. Take your time." } : { ...s, elapsed };
}
export function songTransition(s: SongState, input: SongInput): SongState {
  if (input.type === "helper") return { ...s, helper: input.value };
  if (s.phase === "cleared" || s.phase === "rest") return s;
  if (input.type === "finish") return s.level === "endless" ? { ...s, phase: "rest", message: "A lovely song. Time for a rest." } : s;
  if (input.type === "show") return { ...s, helped: true, message: s.phase === "picture" && s.level !== "endless" ? `Blend the sounds: ${s.level.word}. Find its picture.` : `Next is shell ${s.pattern[s.cursor] + 1}.` };
  if (input.type === "replay") return { ...s, phase: "watch", elapsed: 0, cursor: 0, lastTap: null, message: "Listen again. Replaying is always welcome." };
  if (input.type === "picture") {
    if (s.phase !== "picture" || s.level === "endless" || !s.choices.includes(input.word)) return s;
    return input.word === s.level.word ? { ...s, phase: "cleared", score: s.score + 100, message: `You blended ${s.level.word}!` } : { ...s, slips: s.slips + 1, helped: true, message: `Try blending the sounds slowly: ${songTiles(s).join(" · ")}. You can ask for help.` };
  }
  if (input.type !== "shell" || s.phase !== "repeat" || !Number.isInteger(input.index) || input.index < 0 || input.index >= s.shells) return s;
  if (s.pattern[s.cursor] !== input.index) {
    const slips = s.slips + 1;
    return { ...s, slips, cursor: 0, elapsed: 0, lastTap: input.index, phase: slips >= 3 && !s.helper && !(s.level !== "endless" && s.level.word) ? "rest" : "watch", helped: s.helped || !!(s.level !== "endless" && s.level.word), message: slips >= 3 && !s.helper && !(s.level !== "endless" && s.level.word) ? "That was a growing song! Try again or turn on Helper." : "Let’s listen once more. The same song is waiting for you." };
  }
  const cursor = s.cursor + 1, score = Math.min(99999999, s.score + 10);
  if (cursor !== s.pattern.length) return { ...s, cursor, score, lastTap: input.index, message: `${cursor} of ${s.pattern.length} sounds. Keep going.` };
  const rounds = s.rounds + 1;
  if (s.level !== "endless" && s.level.word) return { ...s, cursor, rounds, score, phase: "picture", lastTap: input.index, message: "Blend those sounds. Which picture is the word?" };
  if (s.level !== "endless" && rounds >= s.level.rounds) return { ...s, cursor, rounds, score, phase: "cleared", lastTap: input.index, message: "You played the whole growing song!" };
  return append({ ...s, cursor: 0, rounds, score, lastTap: null, elapsed: 0, phase: "watch", message: "Your song grew by one shell. Watch and listen." });
}
export function songResult(s: SongState): ArcadeResult | null {
  if (s.phase !== "cleared" && s.phase !== "rest") return null;
  return { cleared: s.phase === "cleared", stars: s.phase === "cleared" ? s.slips === 0 ? 3 : s.slips <= 2 ? 2 : 1 : 0, score: s.score, detail: `${s.rounds} pattern${s.rounds === 1 ? "" : "s"} · ${s.slips} slip${s.slips === 1 ? "" : "s"}` };
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const integer = (v: unknown, max = 99999999) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
export function validSong(v: unknown): v is SongState {
  if (!object(v) || !(v.level === "endless" || object(v.level) && songLevels.some(l => l.id === (v.level as Record<string, unknown>).id)) || !integer(v.shells, 6) || (v.shells as number) < 3 || !Array.isArray(v.pattern) || v.pattern.length < 1 || v.pattern.length > 24 || !v.pattern.every(n => integer(n, (v.shells as number) - 1))) return false;
  return integer(v.seed, 0xffffffff) && typeof v.helper === "boolean" && typeof v.helped === "boolean" && [v.cursor, v.rounds, v.slips, v.score].every(n => integer(n)) && (v.cursor as number) <= v.pattern.length && typeof v.elapsed === "number" && Number.isFinite(v.elapsed) && v.elapsed >= 0 && ["watch", "repeat", "picture", "cleared", "rest"].includes(v.phase as string) && (v.lastTap === null || integer(v.lastTap, (v.shells as number) - 1)) && Array.isArray(v.choices) && v.choices.length <= 3 && v.choices.every(w => PICTURE_WORDS.easy.includes(w)) && typeof v.message === "string";
}
export const songEngine: ArcadeEngine<SongState, SongInput, SongLevel> = { create: createSong, reduce: songTransition, step: songStep, result: songResult, validate: validSong };
