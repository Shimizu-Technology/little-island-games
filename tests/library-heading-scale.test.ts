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
  it("every Text/Heading using s.title, s.heading, s.actionText or s.cardTitle sets maxFontSizeMultiplier", () => {
    // s.actionText added after native QA: at the largest size the raw "All pictures"
    // label grew past its row and pushed the decorative picture off the edge.
    const missing: string[] = [];
    for (const file of files) {
      const source = readFileSync(join(dir, file), "utf8");
      for (const match of source.matchAll(/<(Text|Heading)\b[^>]*?\bs\.(title|heading|actionText|cardTitle)\b[^>]*>/gs)) {
        if (!/maxFontSizeMultiplier=\{\s*1(\.\d+)?\s*\}/.test(match[0])) missing.push(`${file}: ${match[0].slice(0, 80)}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("WordLabel tile labels cap Dynamic Type by default", () => {
    const source = readFileSync(join(dir, "WordLabel.tsx"), "utf8");
    expect(source).toMatch(/maxFontSizeMultiplier = 1\.4/);
    expect(source).toMatch(/<Text[^>]*maxFontSizeMultiplier=\{maxFontSizeMultiplier\}/s);
  });

  it("body reading text is not capped", () => {
    const reader = readFileSync(join(dir, "Reader.tsx"), "utf8");
    const sentence = readFileSync(join(dir, "Topics.tsx"), "utf8");
    for (const source of [reader, sentence])
      expect(source).not.toMatch(/<Text\b[^>]*maxFontSizeMultiplier[^>]*\bs\.body\b/s);
  });
});
