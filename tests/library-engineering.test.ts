import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { buildIndex, search } from "../src/library/search";
import {
  editDrawing,
  emptyDrawing,
  normalizedPoint,
  redoDrawing,
  undoDrawing,
  createLibraryPage,
} from "../src/library/drawing";
import { canOpen, catalog, categories, recordSpeech } from "../src/library/catalog";
import { canonicalDestination, exhibitWorld, mayFinishPage } from "../src/library/navigation";
import {
  pendingPage,
  retainPageDraft,
  discardPageDraft,
  pageDraftKey,
  hasPendingPages,
  draftRecovery,
  clearPageDrafts,
} from "../src/library/drafts";
import { TOPICS } from "../src/explore/content";
describe("Production Library discovery", () => {
  it("keeps question playback separate from the original whole-topic narration", () => {
    const topic = catalog.find((record) => record.id === "dolphins")!;
    expect(recordSpeech(topic).key).toBe("library-question-dolphins");
  });
  it("retains all fifty original stable topic IDs, text and sources", () => {
    for (const topic of TOPICS) {
      const record = catalog.find((record) => record.id === topic.id);
      expect(record).toBeDefined();
      if (record?.legacy) expect(record.legacy).toEqual(topic);
    }
  });
  it("indexes layer vocabulary offline and filters before matching", () => {
    const index = buildIndex([
      { id: "reef", title: "Reef", category: "ocean", aliases: ["coral"], tags: ["Symbiosis helps the animals."] },
    ]);
    expect(search(index, "symbiosis", new Set(["reef"]))[0].id).toBe("reef");
    expect(search(index, "symbiosis", new Set())).toEqual([]);
  });
  it("applies collection permissions at legacy and exhibit destinations", () => {
    expect(canOpen("lab-oceans", ["ocean"])).toBe(true);
    expect(canOpen("lab-oceans", ["space"])).toBe(false);
    expect(canOpen("dolphins", ["animals"])).toBe(true);
    expect(canOpen("dolphins", ["space"])).toBe(false);
    expect(
      canOpen(
        "missing",
        categories.map((category) => category.id)
      )
    ).toBe(false);
  });
  it("packages no pending draft fixture in the default production registry", () => {
    execFileSync(process.execPath, ["--experimental-strip-types", "scripts/library/build-index.mjs"], {
      env: { ...process.env, EXPO_PUBLIC_LIBRARY_FIXTURES: "0" },
      stdio: "pipe",
    });
    const generated = JSON.parse(readFileSync("src/library/catalog.generated.json", "utf8"));
    expect(generated.items.every((item: { review: { status: string } }) => item.review.status === "approved")).toBe(
      true
    );
    expect(generated.bytes).toBeLessThanOrEqual(300_000_000);
    expect(Buffer.byteLength(JSON.stringify(generated.index))).toBeLessThan(1_000_000);
  });
  it("replaces the old study and retains an Explore compatibility redirect", () => {
    expect(readFileSync("src/app/explore.tsx", "utf8")).toContain("Redirect");
    expect(readFileSync("src/hub/model.ts", "utf8")).toContain("library: '/library'");
  });
});
describe("Bounded free drawing history", () => {
  it("preserves immutable work through undo, redo and a new branch", () => {
    const initial = { present: emptyDrawing(), past: [], future: [] };
    const one = editDrawing(initial, {
      strokes: [{ color: "#254E4B", width: 4, points: [{ x: 0.2, y: 0.3 }] }],
      stamps: [],
    });
    const two = editDrawing(one, { ...one.present, stamps: [{ id: "moon", x: 0.5, y: 0.4, size: 0.17 }] });
    expect(undoDrawing(two).present).toEqual(one.present);
    expect(redoDrawing(undoDrawing(two)).present).toEqual(two.present);
    expect(editDrawing(undoDrawing(two), emptyDrawing()).future).toEqual([]);
    expect(initial.present).toEqual(emptyDrawing());
  });
  it("bounds history and drawing coordinates", () => {
    let history = {
      present: emptyDrawing(),
      past: [] as ReturnType<typeof emptyDrawing>[],
      future: [] as ReturnType<typeof emptyDrawing>[],
    };
    for (let i = 0; i < 100; i++) history = editDrawing(history, emptyDrawing());
    expect(history.past).toHaveLength(30);
    expect(normalizedPoint(-10, 300, 100, 100)).toEqual({ x: 0, y: 1 });
    expect(normalizedPoint(10, 10, 0, 0)).toEqual({ x: 1, y: 1 });
  });
});

describe("Library review regressions", () => {
  it("rejects unknown authored exhibits instead of defaulting to reef", () => {
    expect(exhibitWorld(undefined)).toBeUndefined();
    expect(exhibitWorld(catalog.find((item) => item.id === "moon"))).toBeUndefined();
  });
  it("keeps canonical exhibit destinations visible in recents", () => {
    expect(canonicalDestination("exhibit", "oceans")).toBe("lab-oceans");
    expect(canOpen(canonicalDestination("exhibit", "oceans"), ["ocean"])).toBe(true);
  });
  it("grants finish-this-page only to pages entered during open hours", () => {
    expect(mayFinishPage("topic", false)).toBe(false);
    expect(mayFinishPage("exhibit", false)).toBe(false);
    expect(mayFinishPage("reader", true)).toBe(true);
    expect(mayFinishPage("wonder", true)).toBe(false);
  });
  it("retains rejected full drafts, including title and drawing, until admitted or discarded", () => {
    const draft = {
      ...createLibraryPage(),
      title: "Unsaved reef",
      strokes: [{ color: "#254E4B", width: 4, points: [{ x: 0.2, y: 0.3 }] }],
    };
    retainPageDraft("test", draft, false);
    expect(pendingPage("test")).toEqual(draft);
    retainPageDraft("test", { ...draft, sentences: "It has coral." }, false);
    expect(pendingPage("test")?.strokes).toEqual(draft.strokes);
    retainPageDraft("test", draft, true);
    expect(pendingPage("test")).toBeUndefined();
    discardPageDraft("test");
  });
});

describe("Pending draft ownership", () => {
  it("keeps drafts reachable across learner epochs and blocks saved-pause claims", () => {
    const page = createLibraryPage();
    const key = pageDraftKey("family", page.id);
    retainPageDraft(key, page, false);
    expect(pageDraftKey("family", page.id)).toBe(key);
    expect(hasPendingPages("family")).toBe(true);
    expect(hasPendingPages("other-child")).toBe(false);
    expect(JSON.parse(draftRecovery()!).pages[0][1]).toEqual(page);
    clearPageDrafts("other-child");
    expect(pendingPage(key)).toEqual(page);
    clearPageDrafts("family");
    expect(hasPendingPages("family")).toBe(false);
  });
});
