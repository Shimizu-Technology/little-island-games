import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import items from "../content/library/items.json";
import naming from "../src/library/naming.json";
import { buildIndex, search } from "../src/library/search";
const scripts = JSON.parse(readFileSync("scripts/learn/library.json", "utf8")) as Record<string, string>;
describe("Isolated local Library warm bank", () => {
  it("has an exact generated local recording for every registered question, narration, word and name", () => {
    const receipt = JSON.parse(readFileSync("scripts/library/audio-receipt.json", "utf8"));
    expect(receipt.voice).toBe("af_heart");
    expect(receipt.networkPlayback).toBe(false);
    expect(receipt.audibleReview).toBe("pending");
    expect(Object.keys(receipt.clips).sort()).toEqual(Object.keys(scripts).sort());
    let bytes = 0;
    for (const [key, text] of Object.entries(scripts)) {
      const clip = receipt.clips[key], data = readFileSync(clip.path);
      expect(clip.path).toBe(`assets/audio/${key}.m4a`);
      expect(clip.transcriptSha256).toBe(createHash("sha256").update(text).digest("hex"));
      expect(clip.sha256).toBe(createHash("sha256").update(data).digest("hex"));
      expect(clip.seconds).toBeGreaterThan(0.08);
      expect(data.includes(Buffer.from("mdat"))).toBe(true);
      bytes += data.length;
    }
    expect(bytes).toBeLessThan(300_000_000);
  });
  it("covers every reader word and keeps naming separate from question playback", () => {
    for (const item of items) {
      if (item.type === "topic") {
        expect(scripts[`library-question-${item.id}`]).toBe(item.title);
        expect(scripts[`library-name-${item.id}`]).toBe((naming as Record<string, string>)[item.id]);
        expect(scripts[`library-name-${item.id}`]).not.toBe(item.title);
      }
      if (item.type === "book") for (const page of item.pages!) for (const sentence of page.sentences) {
        for (const word of sentence.text.split(/\s+/)) {
          const clean = word.toLowerCase().replace(/[^a-z0-9'-]/g, "");
          if (clean) expect(scripts[`library-word-${clean}`], word).toBe(clean);
        }
      }
    }
    expect(scripts["library-pronunciation-familia"]).toBe("Familia");
  });
});
describe("Full-text typo matching bounds", () => {
  const index = buildIndex([{ id: "scope", title: "Telescope", category: "space", aliases: [], tags: ["magnification"] }]);
  const allowed = new Set(["scope"]);
  it("matches single omissions, two edits in long words and internal layer vocabulary", () => {
    for (const query of ["telesope", "telescop", "txlescopx", "magnificaton"]) expect(search(index, query, allowed).map(e => e.id), query).toEqual(["scope"]);
  });
  it("rejects beyond-tolerance spelling and unavailable records before ranking", () => {
    expect(search(index, "txlxsxope", allowed)).toEqual([]);
    expect(search(index, "magnificaton", new Set())).toEqual([]);
  });
});
