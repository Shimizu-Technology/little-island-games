import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

/** The generator's spoken() rewrites printed text into what the voice should say; only on-screen text stays untouched. */
const spoken = (text: string): string =>
  execFileSync("python3", ["-c", "import importlib.util,sys;s=importlib.util.spec_from_file_location('g','scripts/generate-neural-audio.py');g=importlib.util.module_from_spec(s);s.loader.exec_module(g);sys.stdout.write(g.spoken(sys.argv[1]))", text], { encoding: "utf8" });

it("reads the beach-ball buddy's name as Bee-bee, not Bibai", () => {
  expect(spoken("Hit gently so Bibi can return it.")).toBe("Hit gently so Bee-bee can return it.");
  expect(spoken("Bibi ••")).toBe("Bee-bee ••");
});
it("speaks the inquiry units: kilograms, newtons, astronomical units, metres per second squared", () => {
  expect(spoken("Our 6 kg crate weighs 22.3 N on Earth.")).toBe("Our 6 kilogram crate weighs 22.3 newtons on Earth.");
  expect(spoken("Light takes 8.3 minutes to cross 1 AU. A probe is 5 AU from the Sun. One AU is about the Earth–Sun distance.")).toBe("Light takes 8.3 minutes to cross 1 astronomical unit. A probe is 5 astronomical units from the Sun. One astronomical unit is about the Earth–Sun distance.");
  expect(spoken("Set mass to 24 kg and keep a 12 kg mass. Light takes 8.3 minutes per AU. Check both AU and minutes.")).toBe("Set mass to 24 kilograms and keep a 12 kilogram mass. Light takes 8.3 minutes per astronomical unit. Check both astronomical units and minutes.");
  expect(spoken("Jupiter 23.1 m/s². Mass stays.")).toBe("Jupiter 23.1 meters per second squared. Mass stays.");
});
it("leaves ordinary words and the other rules alone", () => {
  expect(spoken("Bibliography of bibs.")).toBe("Bibliography of bibs.");
  expect(spoken("An N and a kg stay letters when no number leads them.")).toBe("An N and a kg stay letters when no number leads them.");
  expect(spoken("Shop hours for AU and NZ.")).toBe("Shop hours for AU and NZ.");
  expect(spoken("21.1 AU")).toBe("21.1 astronomical units");
  expect(spoken("1 kg bag weighs 1 N.")).toBe("1 kilogram bag weighs 1 newton.");
  expect(spoken("2 km/s²")).toBe("2 km/s²");
  expect(spoken("Whaaat? uGogo")).toBe("What?! oo-Go-go");
  expect(spoken("3 + ? = 5")).toBe("3 plus blank equals 5");
});
