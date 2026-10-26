import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function speech(lines: string[]) {
  return JSON.parse(execFileSync("python3", ["-c", `
import importlib.util,json,sys
spec=importlib.util.spec_from_file_location('speech','scripts/generate-neural-audio.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
print(json.dumps([m.spoken(x) for x in json.load(sys.stdin)]))
`], { input: JSON.stringify(lines), encoding: "utf8", timeout: 30000 })) as string[];
}

describe("equations spoken without losing their meaning", () => {
  it("reads every unknown position and both subtraction symbols", () => {
    expect(speech([
      "What number fills the blank? ? + 7 = 23",
      "What number fills the blank? 92 - ? = 68",
      "Both sides must have the same value. 8 + 7 = 10 + ?",
      "Check: 35 − 8 = 27.",
      "3 × 5 = 15.",
    ])).toEqual([
      "What number fills the blank? blank plus 7 equals 23",
      "What number fills the blank? 92 minus blank equals 68",
      "Both sides must have the same value. 8 plus 7 equals 10 plus blank",
      "Check: 35 minus 8 equals 27.",
      "3 times 5 equals 15.",
    ]);
  });
  it("keeps ordinary questions and hyphenated words intact", () => {
    expect(speech(["Will it float or sink?", "Move two ten-shell coins.", "Repeat → ↑ twice."])).toEqual([
      "Will it float or sink?", "Move two ten-shell coins.", "Repeat  right   up  twice.",
    ]);
  });
});
