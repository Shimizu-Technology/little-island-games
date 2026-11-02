import { describe, expect, it } from "vitest";
import { sceneCategory } from "../src/library/sceneContext";
import { sceneVector } from "../src/library/sceneVector";

describe("Library scene framing", () => {
  it("lifts only a full-canvas paper rectangle, preserving the reviewed diagram", () => {
    const subject = '<path d="M10 20h30"/><rect x="20" y="30" width="40" height="50" fill="red"/>';
    const input = `<svg viewBox="0 0 320 196"><title>Reviewed subject</title><rect width="320" height="196" rx="22" fill="#FFF9E6"/>${subject}</svg>`;
    expect(sceneVector(input)).toBe(`<svg viewBox="0 0 320 196"><title>Reviewed subject</title>${subject}</svg>`);
    expect(input).toContain('rx="22"');
  });
  it("supports paired rect tags used in older reviewed pictures", () => {
    expect(sceneVector('<svg viewBox="0 0 120 120"><rect width="120" height="120"></rect><circle r="20"/></svg>')).toBe(
      '<svg viewBox="0 0 120 120"><circle r="20"/></svg>'
    );
  });
  it("keeps unknown and partial diagram backgrounds intact", () => {
    for (const input of [
      '<svg><rect width="320" height="196"/></svg>',
      '<svg viewBox="0 0 320 196"><rect width="319" height="196"/></svg>',
      '<svg viewBox="0 0 320 196"><rect x="12" width="320" height="196"/></svg>',
    ])
      expect(sceneVector(input)).toBe(input);
  });
});

describe("pictured habitat versus browsing collection", () => {
  it("places marine plants and animals in water while preserving their collections", () => {
    const entries = [
      { id: "seagrass", category: "plants" },
      { id: "dolphins", category: "animals" },
    ];
    expect(entries.map((entry) => sceneCategory(entry.id, entry.category))).toEqual(["ocean", "ocean"]);
    expect(entries.map((entry) => entry.category)).toEqual(["plants", "animals"]);
  });
  it("keeps terrestrial island topics and unknown future categories unchanged", () => {
    expect(sceneCategory("limestone-forest", "guam")).toBe("guam");
    expect(sceneCategory("future-topic", "future-category")).toBe("future-category");
  });
});
