import { readdirSync } from "node:fs";
import { canonical } from "../../src/puzzles/descriptor";
import { sha256Hex } from "../../src/puzzles/sha256";
import * as clues from "../../src/learn/content/reading/clues";
import * as ladders from "../../src/learn/content/reading/ladders";
import * as sentences from "../../src/learn/content/reading/sentences";
import * as stories from "../../src/learn/content/reading/stories";
import * as words from "../../src/learn/content/reading/words";

/** The shipped reading data modules, as the app imports them. Functions are code, not data, and are left out. */
export const INHERITED_SOURCE_DIR = "src/learn/content/reading";
export const inheritedSourceModules: Record<string, Record<string, unknown>> = { clues, ladders, sentences, stories, words };
const data = (v: unknown): unknown => (v instanceof Set ? [...v].sort() : v instanceof Map ? [...v.entries()].sort() : v);
export const sourceDigest = (mod: Record<string, unknown>) =>
  sha256Hex(canonical(Object.fromEntries(Object.keys(mod).sort().filter((k) => typeof mod[k] !== "function").map((k) => [k, data(mod[k])]))));
export const inheritedSourceDigests = () => Object.fromEntries(Object.entries(inheritedSourceModules).map(([name, mod]) => [name, sourceDigest(mod)]));
export const inheritedSourceFiles = () => readdirSync(INHERITED_SOURCE_DIR).sort();
