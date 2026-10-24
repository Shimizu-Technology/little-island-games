import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { random } from "../src/games/types";
import type { LearnOptions } from "../src/learn/types";
import { engine, expected, nextExperiment, tryChange, type Action } from "../src/learn/games/tide-pool/engine";
import { engine as floatEngine } from "../src/learn/games/float-sink/engine";
const speech = JSON.parse(readFileSync(new URL("../scripts/learn/science.json", import.meta.url), "utf8")) as Record<
  string,
  string
>;
describe("science content delivery", () => {
  it("bundles every curated speech key with its exact module mapping", () => {
    const module = readFileSync(new URL("../src/content/learnAudio/science.ts", import.meta.url), "utf8");
    expect(Object.keys(speech).length).toBe(129);
    for (const [key, text] of Object.entries(speech)) {
      expect(key).toMatch(/^(tide-pool|float-sink|crab-commands)-/);
      expect(text.trim().length).toBeGreaterThan(0);
      expect(module).toContain(`'${key}': require('../../../assets/audio/${key}.m4a')`);
      expect(statSync(new URL(`../assets/audio/${key}.m4a`, import.meta.url)).size).toBeGreaterThan(1000);
    }
  });
  for (const mode of engine.modes)
    for (const pace of ["easy", "medium", "hard"] as const)
      it(`all chosen mission sequences finish with strict saves: ${mode}/${pace}`, () => {
        const options: LearnOptions = { mode, pace };
        for (let seed = 1; seed <= 20; seed++) {
          let s = engine.create(options, { skills: {}, rng: random(seed), today: 20000, starter: 0 });
          let attempts = 0;
          while (!engine.outcome(s, options) && attempts++ < 50) {
            const p = s.pool,
              m = s.missions[s.index];
            // When the pool already meets a mission, try a change that relates to it (a sun or tide
            // toggle and back), since an unrelated change no longer counts as a discovery.
            let a: Action = (({ coral: "sun", light: "sun", snail: "sun", crab: "tide", rain: "tide" }) as Record<string, Action>)[m] ?? "fish";
            if (m === "heat") a = !p.creatures.includes("coral") ? "coral" : !p.warm ? "temperature" : "fish";
            else if (m === "rain" && !s.rained) a = "rain";
            else if (m === "coral" && !p.creatures.includes("coral")) a = "coral";
            else if (m === "coral" && p.warm) a = "temperature";
            else if ((m === "coral" || m === "crab" || m === "rain") && p.salt !== 2) a = "tide";
            else if (!p.high) a = "tide";
            else if ((m === "coral" || m === "light" || m === "snail") && !p.light) a = "sun";
            else if (m === "light" && !p.creatures.includes("seaweed")) a = "seaweed";
            else if (m === "crab" && !p.creatures.includes("crab")) a = "crab";
            else if (m === "snail" && !p.creatures.includes("snail")) a = "snail";
            const guess = expected(p, a);
            s = { ...s, action: a, guesses: mode === "together" ? [guess, guess] : [guess] };
            expect(engine.validate(s, options)).toBe(true);
            s = tryChange(s, mode === "together");
            expect(engine.validate(s, options)).toBe(true);
            s = nextExperiment(s);
            expect(engine.validate(s, options)).toBe(true);
          }
          expect(engine.outcome(s, options), `seed ${seed}`).toBe("done");
        }
      });
  it("Growing always includes a size surprise, and Challenge always includes a material pair", () => {
    for (let seed = 0; seed < 30; seed++)
      for (const pace of ["medium", "hard"] as const) {
        const s = floatEngine.create(
          { mode: "solo", pace },
          { skills: {}, rng: random(seed), today: 20000, starter: 0 }
        );
        expect(
          pace === "medium"
            ? s.items.some((x) => ["apple", "log", "coin"].includes(x))
            : ["clay", "clay-boat"].every((x) => s.items.includes(x)) ||
                ["empty-bottle", "full-bottle"].every((x) => s.items.includes(x))
        ).toBe(true);
      }
  });
});
