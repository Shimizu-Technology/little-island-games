/**
 * Writes a Sound Boat word-parts bank from compact specs. Pieces for endings and starts are computed by the kit's own
 * spelling rules, so a spec that the rules do not support fails here instead of in a review packet.
 *
 *   node --import ./scripts/puzzles/register.mjs scripts/reading/make-parts-bank.ts <fixture|draft> <out.json>
 *
 * "fixture" writes TEST ONLY records (status fixture). "draft" writes the same shape as unreviewed drafts for the
 * W1/W2 two-reviewer process. Neither carries review evidence, and this tool cannot write any.
 */
import { writeFileSync, existsSync } from "node:fs";
import { applyAffix, stemOf, type SpellingChange } from "../../src/learn/reading/morphology";
import type { PartsWord } from "../../src/learn/reading/records";

type Beats = { k: "compound" | "syllables"; w: string; c: string[]; d: string[] };
type Affixed = { k: "ending" | "prefix"; base: string; affix: string; change?: SpellingChange; d: string[]; gloss: string; family?: string };
type Spec = Beats | Affixed;
const beats = (s: Spec): s is Beats => s.k === "compound" || s.k === "syllables";

const specs: Spec[] = [
  // Level 4: two words in one
  { k: "compound", w: "sunset", c: ["sun", "set"], d: ["sin", "sit"] },
  { k: "compound", w: "cupcake", c: ["cup", "cake"], d: ["cap", "cook"] },
  { k: "compound", w: "seashell", c: ["sea", "shell"], d: ["see", "shall"] },
  { k: "compound", w: "rainbow", c: ["rain", "bow"], d: ["ran", "boat"] },
  { k: "compound", w: "starfish", c: ["star", "fish"], d: ["stair", "dish"] },
  { k: "compound", w: "sailboat", c: ["sail", "boat"], d: ["sale", "coat"] },
  { k: "compound", w: "bedtime", c: ["bed", "time"], d: ["bad", "tame"] },
  { k: "compound", w: "anthill", c: ["ant", "hill"], d: ["and", "hall"] },
  // Level 4: beats
  { k: "syllables", w: "rabbit", c: ["rab", "bit"], d: ["rap", "bat"] },
  { k: "syllables", w: "picnic", c: ["pic", "nic"], d: ["pik", "nik"] },
  { k: "syllables", w: "basket", c: ["bas", "ket"], d: ["bask", "kit"] },
  { k: "syllables", w: "napkin", c: ["nap", "kin"], d: ["nip", "can"] },
  { k: "syllables", w: "happen", c: ["hap", "pen"], d: ["hop", "pan"] },
  { k: "syllables", w: "magnet", c: ["mag", "net"], d: ["meg", "nit"] },
  { k: "syllables", w: "muffin", c: ["muf", "fin"], d: ["mof", "fun"] },
  { k: "syllables", w: "kitten", c: ["kit", "ten"], d: ["kat", "tin"] },
  { k: "syllables", w: "banana", c: ["ba", "na", "na"], d: ["bo", "ne"] },
  { k: "syllables", w: "octopus", c: ["oc", "to", "pus"], d: ["ac", "tu"] },
  // Level 4: endings that keep the base word
  { k: "ending", base: "jump", affix: "ed", d: ["ing", "er"], gloss: "already happened" },
  { k: "ending", base: "walk", affix: "ed", d: ["ing", "s"], gloss: "already happened" },
  { k: "ending", base: "play", affix: "ing", d: ["ed", "s"], gloss: "happening now" },
  { k: "ending", base: "sing", affix: "er", d: ["ed", "ing"], gloss: "someone who sings" },
  { k: "ending", base: "farm", affix: "er", d: ["ed", "ing"], gloss: "someone who farms" },
  { k: "ending", base: "cat", affix: "s", d: ["ed", "ing"], gloss: "more than one" },
  { k: "ending", base: "help", affix: "ful", d: ["ed", "er"], gloss: "full of help" },
  { k: "ending", base: "slow", affix: "ly", d: ["ed", "er"], gloss: "in a slow way" },
  { k: "ending", base: "fast", affix: "est", d: ["ed", "er"], gloss: "the most" },
  // Level 5: endings that change the spelling
  { k: "ending", base: "make", affix: "ing", change: "drop-e", d: ["make", "mac"], gloss: "happening now", family: "make" },
  { k: "ending", base: "make", affix: "er", change: "drop-e", d: ["make", "mac"], gloss: "someone who makes", family: "make" },
  { k: "ending", base: "bake", affix: "ing", change: "drop-e", d: ["bake", "bark"], gloss: "happening now" },
  { k: "ending", base: "ride", affix: "ing", change: "drop-e", d: ["ride", "ring"], gloss: "happening now" },
  { k: "ending", base: "smile", affix: "ing", change: "drop-e", d: ["smile", "smell"], gloss: "happening now" },
  { k: "ending", base: "take", affix: "ing", change: "drop-e", d: ["take", "tack"], gloss: "happening now" },
  { k: "ending", base: "hop", affix: "ing", change: "double", d: ["hop", "pin"], gloss: "happening now", family: "hop" },
  { k: "ending", base: "hop", affix: "ed", change: "double", d: ["hop", "pad"], gloss: "already happened", family: "hop" },
  { k: "ending", base: "run", affix: "ing", change: "double", d: ["run", "pin"], gloss: "happening now" },
  { k: "ending", base: "sit", affix: "ing", change: "double", d: ["sit", "tin"], gloss: "happening now" },
  { k: "ending", base: "big", affix: "er", change: "double", d: ["big", "pen"], gloss: "more big" },
  { k: "ending", base: "cry", affix: "ed", change: "y-to-i", d: ["cry", "ride"], gloss: "already happened" },
  { k: "ending", base: "try", affix: "ed", change: "y-to-i", d: ["try", "red"], gloss: "already happened" },
  { k: "ending", base: "carry", affix: "ed", change: "y-to-i", d: ["carry", "red"], gloss: "already happened" },
  { k: "ending", base: "happy", affix: "ly", change: "y-to-i", d: ["happy", "led"], gloss: "in a happy way" },
  { k: "ending", base: "funny", affix: "est", change: "y-to-i", d: ["funny", "ed"], gloss: "the most" },
  { k: "ending", base: "puppy", affix: "es", change: "y-to-i", d: ["puppy", "ed"], gloss: "more than one" },
  // Level 5: starts that change meaning
  { k: "prefix", base: "lock", affix: "un", d: ["on", "luck"], gloss: "open what was locked" },
  { k: "prefix", base: "do", affix: "un", d: ["on", "dig"], gloss: "take back what was done", family: "do" },
  { k: "prefix", base: "do", affix: "re", d: ["ray", "dig"], gloss: "do it again", family: "do" },
  { k: "prefix", base: "play", affix: "re", d: ["ray", "pay"], gloss: "play it again" },
  { k: "prefix", base: "tell", affix: "re", d: ["ray", "bell"], gloss: "tell it again" },
  { k: "prefix", base: "happy", affix: "un", d: ["on", "hippy"], gloss: "not happy" },
  { k: "prefix", base: "make", affix: "re", d: ["ray", "mac"], gloss: "make it again", family: "make" },
  { k: "prefix", base: "fold", affix: "un", d: ["on", "gold"], gloss: "open it out" },
];

export function records(status: "fixture" | "draft"): PartsWord[] {
  return specs.map((s): PartsWord => {
    if (beats(s))
      return { id: `${status === "fixture" ? "fx" : "dr"}-${s.w}`, status, word: s.w, level: 4, kind: s.k, chunks: s.c, distractors: s.d };
    const kind = s.k === "ending" ? "suffix" : "prefix";
    const change = s.change ?? "none";
    const word = applyAffix(s.base, s.affix, kind, change);
    if (!word) throw new Error(`${s.base} + ${s.affix} does not follow ${change}`);
    const stem = stemOf(word, s.affix, kind);
    return {
      id: `${status === "fixture" ? "fx" : "dr"}-${word}`,
      status,
      word,
      level: s.k === "prefix" || change !== "none" ? 5 : 4,
      kind: s.k,
      chunks: kind === "suffix" ? [stem, s.affix] : [s.affix, stem],
      distractors: s.d,
      base: s.base,
      affix: s.affix,
      ...(change !== "none" ? { change } : {}),
      gloss: s.gloss,
      ...(s.family ? { family: s.family } : {}),
    };
  });
}
if (process.argv[1]?.endsWith("make-parts-bank.ts")) {
  const [mode, out] = process.argv.slice(2);
  if ((mode !== "fixture" && mode !== "draft") || !out) throw new Error("usage: make-parts-bank.ts <fixture|draft> <out.json>");
  if (existsSync(out)) throw new Error(`${out} exists; choose a new path`);
  const bank = { schemaVersion: 1, id: mode === "fixture" ? "sound-boat-parts-fixture" : "sound-boat-parts-draft", fixture: mode === "fixture", records: records(mode) };
  writeFileSync(out, JSON.stringify(bank, null, 2) + "\n");
}
