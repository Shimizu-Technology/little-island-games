import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import categories from "../content/library/categories.json";
import { FOOD_CHAIN, HABITAT_CHOICES, HABITATS, PLACES } from "../src/explore/activities";
import { waterLabels } from "../src/library/exhibits";
import { WordLabel } from "../src/library/WordLabel";
vi.mock("react-native", () => ({ View: "View" }));
vi.mock("../src/components/Text", () => ({ Text: "Text" }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: ReactTestRenderer;
afterEach(async () => { if (root) await act(async () => root.unmount()); });
describe("word-safe exhibit and category labels", () => {
  const labels = [...FOOD_CHAIN, ...HABITAT_CHOICES, ...HABITATS.map(x => x.animal),
    ...PLACES.map(x => x.name), ...Object.values(waterLabels), ...categories.map(x => x.title)];
  it.each([1, 2])("fits whole words at %sx text and permits line breaks only between words", async (scale) => {
    await act(async () => { root = create(<>{labels.map((label, i) => <WordLabel key={i}
      textStyle={{ fontSize: 16 * scale }}>{label}</WordLabel>)}</>); });
    const words = root.root.findAll(node => String(node.type) === "Text");
    expect(words.map(node => node.children.join(""))).toEqual(labels.flatMap(label => label.split(/\s+/)));
    for (const word of words) {
      expect(word.props.numberOfLines).toBe(1);
      expect(word.props.adjustsFontSizeToFit).toBe(true);
      expect(word.props.style.at(-1)).toMatchObject({ maxWidth: "100%" });
    }
  });
});
