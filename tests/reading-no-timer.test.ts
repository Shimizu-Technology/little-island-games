import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Reading is never timed and never rewards speed. These checks read the source of every reading route. */
const roots = ["src/learn/reading", "src/learn/games/sound-boat", "src/learn/kit/ReadingText.tsx", "src/learn/kit/reading.ts", "src/learn/kit/readingSpeech.ts", "scripts/dev/sound-boat-entry.tsx"];
function files(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((n) => files(join(path, n))).filter((f) => /\.(ts|tsx)$/.test(f));
}
const sources = roots.flatMap(files).map((f) => ({ f, text: readFileSync(f, "utf8") }));
const code = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("no clock is reachable from a reading route", () => {
  it("reads no time and runs no interval", () => {
    expect(sources.length).toBeGreaterThan(15);
    for (const { f, text } of sources) expect(code(text), f).not.toMatch(/setInterval|Date\.now|new Date\b|performance\.now|requestAnimationFrame|countdown|stopwatch|timeLimit|secondsLeft|elapsed/i);
  });
  it("keeps timeouts to audio sequencing: no state is saved from one, and none advances a word", () => {
    for (const { f, text } of sources) {
      const body = code(text);
      for (const m of body.matchAll(/setTimeout\(/g)) {
        const after = body.slice(m.index, m.index + 360), around = body.slice(Math.max(0, m.index! - 480), m.index! + 360);
        expect(around, `${f}: a timeout must be speech sequencing`).toMatch(/sound\(/);
        expect(after, `${f}: a timeout must not save or advance`).not.toMatch(/\bupdate\(|boatMove|partsMove|dispatch\(/);
      }
    }
  });
  it("no pure module that holds game state uses a timer at all", () => {
    for (const name of ["parts.ts", "engine.ts", "challenge-engine.ts", "challenge-content.ts"]) expect(code(readFileSync(join("src/learn/games/sound-boat", name), "utf8")), name).not.toMatch(/setTimeout|setInterval/);
    for (const f of files("src/learn/reading").filter((f) => !f.endsWith(".tsx"))) expect(code(readFileSync(f, "utf8")), f).not.toMatch(/setTimeout|setInterval/);
  });
  it("saved round state carries no time", async () => {
    const { validParts } = await import("../src/learn/games/sound-boat/parts");
    expect(validParts({ kind: "parts", level: 4, ids: [], starter: 0, index: 0, answer: {}, clean: [], heard: false, elapsedMs: 1 }, 4, new Map())).toBe(false);
    for (const { f, text } of sources.filter((s) => /parts\.ts$|challenge-engine\.ts$|engine\.ts$/.test(s.f))) expect(code(text), f).not.toMatch(/\b(?:time|ms|clock|duration)\s*:/i);
  });
});
