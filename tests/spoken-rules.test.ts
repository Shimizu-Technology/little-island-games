import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

/** The generator's spoken() rewrites printed text into what the voice should say; only on-screen text stays untouched. */
const spoken = (text: string): string =>
  execFileSync("python3", ["-c", "import importlib.util,sys;s=importlib.util.spec_from_file_location('g','scripts/generate-neural-audio.py');g=importlib.util.module_from_spec(s);s.loader.exec_module(g);sys.stdout.write(g.spoken(sys.argv[1]))", text], { encoding: "utf8" });

it("reads the beach-ball buddy's name as Bee-bee, not Bibai", () => {
  expect(spoken("Hit gently so Bibi can return it.")).toBe("Hit gently so Bee-bee can return it.");
  expect(spoken("Bibi ••")).toBe("Bee-bee ••");
});
it("leaves ordinary words and the other rules alone", () => {
  expect(spoken("Bibliography of bibs.")).toBe("Bibliography of bibs.");
  expect(spoken("Whaaat? uGogo")).toBe("What?! oo-Go-go");
  expect(spoken("3 + ? = 5")).toBe("3 plus blank equals 5");
});
