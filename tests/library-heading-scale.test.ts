import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Native QA (Q8b, 3 Nov 2026): at the largest accessibility text size, uncapped
// Library page titles ("What do you wonder?", "Our story shelf") filled the whole
// first screen and broke mid-word ("wonde / r?"). Display headings are capped;
// body reading text keeps scaling fully.
const dir = "src/library";
const files = readdirSync(dir).filter((f) => f.endsWith(".tsx"));

describe("Library display headings cap Dynamic Type", () => {
  it("every Text/Heading using s.title or s.heading sets maxFontSizeMultiplier", () => {
    const missing: string[] = [];
    for (const file of files) {
      const source = readFileSync(join(dir, file), "utf8");
      for (const match of source.matchAll(/<(Text|Heading)\b[^>]*?\bs\.(title|heading)\b[^>]*>/gs)) {
        if (!/maxFontSizeMultiplier=\{\s*1(\.\d+)?\s*\}/.test(match[0])) missing.push(`${file}: ${match[0].slice(0, 80)}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("body reading text is not capped", () => {
    const reader = readFileSync(join(dir, "Reader.tsx"), "utf8");
    const sentence = readFileSync(join(dir, "Topics.tsx"), "utf8");
    for (const source of [reader, sentence])
      expect(source).not.toMatch(/<Text\b[^>]*maxFontSizeMultiplier[^>]*\bs\.body\b/s);
  });
});
