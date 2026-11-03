import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { availableItems, categories, itemById, searchIndex } from "../src/library/catalog";
import { categoryAfterTyping, search, searchCategory } from "../src/library/search";
import { hearTitleLabel, libraryBack, libraryTabs } from "../src/library/navigation";
import { isPageSwipe, swipeTarget } from "../src/library/swipe";

const everything = categories.map((category) => category.id);
const lookup = (query: string, allowedCollections: readonly string[], category: string) => {
  const allowed = new Set(availableItems(allowedCollections as never).map((item) => item.id));
  return search(searchIndex, query, allowed, searchCategory(query, category)).map((entry) => entry.id);
};

describe("L1 search scope", () => {
  it("a typed query ignores whichever category chip was chosen earlier", () => {
    const guam = categories.find((c) => c.id !== "books" && lookup("", everything, c.id).length > 0)!;
    const sample = search(searchIndex, "", new Set(availableItems(everything as never).map((i) => i.id)), undefined)
      .filter((entry) => entry.category !== guam.id)
      .find((entry) => itemById(entry.id));
    expect(sample, "a catalog item outside the first browsable category").toBeTruthy();
    const word = sample!.title.split(" ")[0];
    expect(lookup(word, everything, guam.id)).toContain(sample!.id);
    expect(lookup(word, everything, "all")).toContain(sample!.id);
    // Without a query the chip still narrows browsing.
    expect(lookup("", everything, guam.id).every((id) => itemById(id)?.category === guam.id)).toBe(true);
  });
  it("finds the turtle topic from inside the Guam category chip", () => {
    expect(lookup("turtle", everything, "guam")).toEqual(lookup("turtle", everything, "all"));
    expect(lookup("bread", everything, "guam")).toEqual(lookup("bread", everything, "all"));
  });
  it("blank or punctuation-only text keeps the chip because nothing was searched for", () => {
    expect(searchCategory("  ", "guam")).toBe("guam");
    expect(searchCategory("...", "guam")).toBe("guam");
    expect(categoryAfterTyping("  ", "guam")).toBe("guam");
    expect(searchCategory("turtle", "guam")).toBeUndefined();
    expect(categoryAfterTyping("t", "guam")).toBe("all");
    expect(categoryAfterTyping("", "all")).toBe("all");
  });
  it("never leaks a collection the learner is not allowed, whatever the category", () => {
    const owner = categories.find((c) => c.id !== "books" && lookup("", everything, "all").some((id) => itemById(id)?.category === c.id))!;
    const hidden = everything.filter((id) => id !== owner.id);
    const hiddenIds = new Set(availableItems(everything as never).filter((i) => i.category === owner.id).map((i) => i.id));
    expect(hiddenIds.size).toBeGreaterThan(0);
    const word = [...hiddenIds].map((id) => itemById(id)!.title.split(" ")[0]).find(Boolean)!;
    for (const category of ["all", owner.id, hidden[0]])
      expect(lookup(word, hidden, category).filter((id) => hiddenIds.has(id))).toEqual([]);
    expect(lookup(word, everything, "all").some((id) => hiddenIds.has(id))).toBe(true);
  });
});

describe("L3 Back", () => {
  it("leaves the Library for the Island map from each tab root", () => {
    for (const tab of libraryTabs) expect(libraryBack(tab), tab).toBe("island");
    expect(libraryBack("wonder", "")).toBe("island");
  });
  it("walks the visit history inside topics, books, exhibits, pages and Grown-ups", () => {
    for (const place of ["topic", "reader", "exhibit", "authored-exhibit", "grownups"])
      expect(libraryBack(place, "x"), place).toBe("history");
    expect(libraryBack("make", "page-1")).toBe("history");
    expect(libraryBack("make", "")).toBe("island");
  });
});

describe("L4 speaker labels", () => {
  it("names the title, never a question", () => {
    expect(hearTitleLabel("A Fish and a Gift")).toBe("Hear title: A Fish and a Gift");
    expect(hearTitleLabel("x")).not.toMatch(/question/i);
  });
});

describe("L2 page swipes", () => {
  it("accepts clearly horizontal drags and leaves vertical scrolling alone", () => {
    expect(isPageSwipe(-60, 5)).toBe(true);
    expect(isPageSwipe(60, 20)).toBe(true);
    expect(isPageSwipe(10, 0)).toBe(false);
    expect(isPageSwipe(40, 80)).toBe(false);
    expect(isPageSwipe(30, 30)).toBe(false);
  });
  it("turns the page only for a long swipe and clamps at the covers", () => {
    expect(swipeTarget(-80, 1, 3)).toBe(2);
    expect(swipeTarget(80, 1, 3)).toBe(0);
    expect(swipeTarget(-80, 2, 3)).toBe(2);
    expect(swipeTarget(80, 0, 3)).toBe(0);
    expect(swipeTarget(-30, 1, 3)).toBeUndefined();
  });
});

describe("L4 no speaker still asks a question about a title", () => {
  it("has no 'Hear question' label anywhere in the Library", () => {
    for (const file of readdirSync("src/library").filter((name) => /\.tsx?$/.test(name)))
      expect(readFileSync(`src/library/${file}`, "utf8"), file).not.toMatch(/Hear question/);
  });
});
