import { readdirSync } from "node:fs";
import { canonical } from "../../src/puzzles/descriptor";
import { sha256Hex } from "../../src/puzzles/sha256";
import * as chamoru from "../../src/learn/content/chamoru";
import * as clues from "../../src/learn/content/reading/clues";
import * as lagoon from "../../src/learn/content/reading/lagoon";
import * as ladders from "../../src/learn/content/reading/ladders";
import * as sentences from "../../src/learn/content/reading/sentences";
import * as stories from "../../src/learn/content/reading/stories";
import * as studio from "../../src/learn/content/reading/studio";
import * as words from "../../src/learn/content/reading/words";
import * as workshop from "../../src/learn/content/reading/workshop";

/**
 * The shipped inherited reading sources, as modules, hashed here independently of `src/learn/reading/provenance.ts`.
 * Functions are code, not data, and are left out; a set is hashed as its sorted members.
 */
export const INHERITED_SOURCE_DIR = "src/learn/content/reading";
export const inheritedSourceModules: Record<string, Record<string, unknown>> = { chamoru, clues, ladders, lagoon, sentences, stories, studio, words, workshop };
/** Where each source lives. Every reading source sits in the reading folder except Håfa Adai's CHamoru words. */
export const inheritedSourceFile = (name: string) => (name === "chamoru" ? "src/learn/content/chamoru.ts" : `${INHERITED_SOURCE_DIR}/${name}.ts`);
const data = (v: unknown): unknown => (v instanceof Set ? [...v].sort() : v instanceof Map ? [...v.entries()].sort() : v);
export const dataExports = (mod: Record<string, unknown>) => Object.keys(mod).sort().filter((k) => typeof mod[k] !== "function");
export const sourceDigest = (mod: Record<string, unknown>) => sha256Hex(canonical(Object.fromEntries(dataExports(mod).map((k) => [k, data(mod[k])]))));
export const inheritedSourceDigests = () => Object.fromEntries(Object.entries(inheritedSourceModules).map(([name, mod]) => [name, sourceDigest(mod)]));
export const inheritedSourceFiles = () => readdirSync(INHERITED_SOURCE_DIR).sort();
