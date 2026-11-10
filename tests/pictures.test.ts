import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
// Build-time JS for the picture dictionary; no path from the app's dependency graph.
import { checkDictionary, checkPicture, parseSvg } from "../scripts/art/pictures/check.mjs";
import { svg, path, line, P } from "../scripts/art/pictures/style.mjs";
import { createPictureLoader, pictureById, pictureForWord, pictureIndex, picturesInCategory } from "../src/content/pictures";
import { pictureAssets } from "../src/content/pictures/assets.generated";

const good = svg([path("M10 10H110V110Z", P.coral)]);

describe("island picture dictionary files", () => {
  it("passes every static style-guide check, with fresh generated files and W1 allowlist records", () => {
    const { problems, count, totalBytes } = checkDictionary();
    expect(problems).toEqual([]);
    expect(count).toBeGreaterThanOrEqual(400);
    expect(totalBytes).toBeLessThanOrEqual(1024 * 1024);
  }, 60000);

  it("accepts the kit's own output and rejects what the style guide forbids", () => {
    expect(checkPicture(good)).toEqual([]);
    // The kit itself rounds every number it writes.
    expect(svg([path("M10.123 10H20Z", P.red)])).toContain("M10.12 10H20Z");
    const variants: [string, RegExp][] = [
      [good.replace("</g>", '<text x="1" y="9">A</text></g>'), /text content/i],
      [good.replace("</g>", '<text x="1" y="9"/></g>'), /<text> is not allowed/],
      [good.replace(P.coral, "#123456"), /palette/],
      [good.replace('viewBox="0 0 120 120"', 'viewBox="0 0 100 100"'), /root/],
      [good.replace("</g></svg>", "</svg>"), /parse/],
      [svg([line("M0 0H9", { sw: 8 })]), /outline weight/],
      [good.replace("M10 10", "M10.123 10"), /two decimals/],
      [good.replace("<path", '<path id="x"'), /attribute id/],
      [good.replace("</g>", '<image href="a.png"/></g>'), /image/],
      [svg([path("M0 0H9Z", P.ink)]), /ink fill/],
    ];
    for (const [text, problem] of variants) expect(checkPicture(text).join("\n")).toMatch(problem);
    // A wide ink stroke is fine when a coloured stroke of the same shape sits on it.
    expect(checkPicture(svg([line("M0 0H9", { stroke: P.ink, sw: 8 }), line("M0 0H9", { stroke: P.sand, sw: 3.5 })]))).toEqual([]);
  });

  it("parses strictly", () => {
    expect(() => parseSvg("<svg><g></svg>")).toThrow();
    expect(() => parseSvg("<!-- x --><svg/>")).toThrow();
    expect((parseSvg(good) as { name: string }).name).toBe("svg");
  });
});

describe("picture loader", () => {
  const first = pictureIndex[0];
  const xml = readFileSync(`content/pictures/svg/${first.id}.svg`, "utf8");

  it("indexes every picture once, by id, word and category", () => {
    expect(new Set(pictureIndex.map((p) => p.id)).size).toBe(pictureIndex.length);
    expect(Object.keys(pictureAssets).sort()).toEqual(pictureIndex.map((p) => p.id).sort());
    expect(pictureForWord(" crab ")?.id).toBe("crab");
    expect(pictureById("no-such-picture")).toBeUndefined();
    expect(picturesInCategory("shapes").length).toBeGreaterThan(0);
    expect(Object.isFrozen(pictureIndex) && Object.isFrozen(first)).toBe(true);
  });

  it("reads through the transport once, verifies size and keeps a bounded cache", async () => {
    let reads = 0;
    const loader = createPictureLoader({ read: async () => (reads++, xml) }, { [first.id]: () => 1 }, 1);
    await expect(loader.load(first.id)).resolves.toBe(xml);
    await loader.load(first.id);
    expect(reads).toBe(1);
    await expect(loader.load("no-such-picture")).rejects.toThrow(/Unknown picture/);
    expect(loader.cached()).toBe(1);
  });

  it("refuses bytes that do not match the manifest, and retries after a failure", async () => {
    let calls = 0;
    const loader = createPictureLoader({ read: async () => (calls++ === 0 ? xml + " " : xml) }, { [first.id]: () => 1 });
    await expect(loader.load(first.id)).rejects.toThrow(/does not match/);
    await expect(loader.load(first.id)).resolves.toBe(xml);
  });
});
