import { createHash } from "node:crypto";
import { readdirSync } from "node:fs";
import { canonical } from "../../src/puzzles/descriptor";
import * as chamoru from "../../src/learn/content/chamoru";
import * as clues from "../../src/learn/content/reading/clues";
import * as growth from "../../src/learn/growth/literacy";
import * as lagoon from "../../src/learn/content/reading/lagoon";
import * as ladders from "../../src/learn/content/reading/ladders";
import * as sentences from "../../src/learn/content/reading/sentences";
import * as stories from "../../src/learn/content/reading/stories";
import * as studio from "../../src/learn/content/reading/studio";
import * as words from "../../src/learn/content/reading/words";
import * as workshop from "../../src/learn/content/reading/workshop";

/**
 * The shipped inherited reading sources, as modules, hashed here independently of `src/learn/reading/provenance.ts`
 * (with node:crypto, not the app's own SHA-256).
 * Functions are code, not data, and are left out; a set is hashed as its sorted members.
 */
export const INHERITED_SOURCE_DIR = "src/learn/content/reading";
export const inheritedSourceModules: Record<string, Record<string, unknown>> = { chamoru, clues, growth, ladders, lagoon, sentences, stories, studio, words, workshop };
/** Sources that live outside the reading folder: Håfa Adai's CHamoru words, and the growth quiz's reading tracks. */
const ELSEWHERE: Record<string, string> = { chamoru: "src/learn/content/chamoru.ts", growth: "src/learn/growth/literacy.ts" };
/** Where each source lives. */
export const inheritedSourceFile = (name: string) => ELSEWHERE[name] ?? `${INHERITED_SOURCE_DIR}/${name}.ts`;
export const isInReadingFolder = (name: string) => !Object.hasOwn(ELSEWHERE, name);
const data = (v: unknown): unknown => (v instanceof Set ? [...v].sort() : v instanceof Map ? [...v.entries()].sort() : v);
export const dataExports = (mod: Record<string, unknown>) => Object.keys(mod).sort().filter((k) => typeof mod[k] !== "function");
export const sourceDigest = (mod: Record<string, unknown>) => createHash("sha256").update(canonical(Object.fromEntries(dataExports(mod).map((k) => [k, data(mod[k])])))).digest("hex");
export const inheritedSourceDigests = () => Object.fromEntries(Object.entries(inheritedSourceModules).map(([name, mod]) => [name, sourceDigest(mod)]));
export const inheritedSourceFiles = () => readdirSync(INHERITED_SOURCE_DIR).sort();
