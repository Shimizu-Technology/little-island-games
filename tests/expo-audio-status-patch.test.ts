import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Guards the expo-audio status-queue patch (patches/README.md). Unpatched, every play() made AVFoundation
// fire expo-audio's periodic status observer on the main queue, and its -[AVPlayerItem currentTime] read
// waited on MediaToolbox's item lock while playback started. Every Arcade tone stalled frames on iOS 18.
// tests/expo-audio-status-queue.test.ts runs the patched code itself under ThreadSanitizer on macOS.
const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const TARGET = "57.0.5";
const PATCH = `patches/expo-audio+${TARGET}.patch`;
const ios = "node_modules/expo-audio/ios";
const player = () => read(`${ios}/AudioPlayer.swift`);
const playlist = () => read(`${ios}/AudioPlaylist.swift`);
const between = (swift: string, start: string, end: string) => swift.slice(swift.indexOf(start), swift.indexOf(end, swift.indexOf(start)));

describe("expo-audio status-queue patch", () => {
  it("targets the installed expo-audio version and is applied on install", () => {
    const installed = JSON.parse(read("node_modules/expo-audio/package.json")).version;
    // An SDK upgrade must re-check the patch: port it, or drop it if upstream moved the observer off main.
    expect(installed, `patch targets expo-audio ${TARGET}; see patches/README.md`).toBe(TARGET);
    expect(existsSync(join(root, PATCH))).toBe(true);
    expect(existsSync(join(root, ios, "AudioStatusQueue.swift"))).toBe(true);
    expect(JSON.parse(read("package.json")).scripts.postinstall).toMatch(/^patch-package --error-on-fail --error-on-warn && /);
  });

  it("delivers every periodic status observer on the player's own status queue, never the main queue", () => {
    for (const swift of [player(), playlist()]) {
      expect(swift).not.toMatch(/addPeriodicTimeObserver\([^)]*queue: nil/);
      expect(swift).toMatch(/let statusQueue = AudioStatusQueue\(\)/);
      expect(swift).toMatch(/let generation = statusQueue\.invalidate\(\)\s*timeToken = ref\.addPeriodicTimeObserver\(forInterval: interval, queue: statusQueue\.queue\)/);
      expect(swift).toMatch(/self\.deliverStatus\(with: \[\s*"currentTime": time\.seconds\s*\], kind: \.periodic, generation: generation\)/);
    }
  });

  it("builds and emits every other status on the status queue, with the terminal status marked", () => {
    for (const swift of [player(), playlist()]) {
      const update = between(swift, "func updateStatus(with dict:", "private func deliverStatus");
      expect(update).toMatch(/statusQueue\.async \{ \[weak self\] generation in\s*self\?\.deliverStatus\(with: dict, kind: kind, generation: generation\)\s*completion\?\(\)/);
      expect(swift).toMatch(/"didJustFinish": true\s*\], kind: \.terminal\)/);
      // Release closes the queue before cancelling seeks: queued, in-flight and later statuses are all dropped.
      expect(between(swift, "override func sharedObjectWillRelease()", "ref.currentItem?.cancelPendingSeeks()")).toMatch(/statusQueue\.close\(\)/);
      // Seek completion resumes JS only after its status is emitted on the queue.
      expect(between(swift, "func seekTo(", "\n  }\n")).toMatch(/self\.updateStatus\(with: \[:\]\) \{\s*continuation\.resume\(\)\s*\}/);
    }
    const queue = read(`${ios}/AudioStatusQueue.swift`);
    expect(queue).toMatch(/dispatchPrecondition\(condition: \.onQueue\(queue\)\)/);
    expect(queue).toMatch(/!closed && generation == expected && !\(kind == \.periodic && ended\)/);
    // Closing is permanent: invalidate never reopens the queue.
    expect(between(queue, "func close()", "\n  }\n")).toMatch(/locked \{\s*closed = true/);
    expect(queue.match(/^\s*closed = /gm)).toEqual([expect.stringMatching(/closed = $/)]);
  });

  it("replaces the player only under the status snapshot lock, and snapshots it there", () => {
    const swift = player();
    const assignments = [...swift.matchAll(/^\s*(?:self\.)?ref = .*$/gm)].map(m => m[0].trim());
    expect(assignments).toEqual(["self.ref = player"]);
    expect(swift).toMatch(/statusQueue\.invalidate \{\s*self\.ref = player\s*\}/);
    expect(between(swift, "private func deliverStatus", "func seekTo(")).toMatch(/statusQueue\.deliver\(kind, generation: generation\) \{\s*self\.ref\s*\} build: \{ player in/);
    expect(between(swift, "private func replacePlayerItem", "private func enqueueNextLoopItem")).toMatch(/statusQueue\.invalidate\(\)/);
  });

  it("guards the playlist's track list with the status lock", () => {
    const swift = playlist();
    for (const name of ["sources", "playerItems", "previousTrackIndex"]) {
      expect(swift).toMatch(new RegExp(`var ${name}: [^{]+\\{\\s*get \\{ statusQueue\\.locked \\{ guarded`));
    }
    expect(swift).toMatch(/self\.guardedSources = sources\s*self\.guardedPlayerItems = items\s*super\.init\(ref\)/);
  });

  it("keeps a registered playlist observer reporting across track-list edits", () => {
    const swift = playlist();
    // Edits start a new generation only through trackListChanged, which re-registers a registered observer.
    expect([...swift.matchAll(/statusQueue\.invalidate\(\)/g)]).toHaveLength(2);
    expect(between(swift, "private func trackListChanged()", "\n  }\n")).toMatch(/if timeToken != nil \{\s*registerTimeObserver\(\)\s*\} else \{\s*statusQueue\.invalidate\(\)\s*\}/);
    for (const edit of ["func add(source:", "func clear()", "private func rebuildPlaylist("]) {
      expect(between(swift, edit, "\n  }\n"), edit).toMatch(/trackListChanged\(\)/);
    }
    // remove() rebuilds before play() registers its observer; only the branch that doesn't rebuild invalidates.
    expect(between(swift, "func remove(at index:", "\n  }\n")).toMatch(/if index > current \{\s*trackListChanged\(\)\s*\}\s*updateStatus/);
  });

  it("changes only expo-audio's iOS status delivery: no audio mode, session or playback logic", () => {
    const patch = read(PATCH);
    expect([...patch.matchAll(/^diff --git a\/(\S+)/gm)].map(m => m[1])).toEqual([
      "node_modules/expo-audio/ios/AudioPlayer.swift",
      "node_modules/expo-audio/ios/AudioPlaylist.swift",
      "node_modules/expo-audio/ios/AudioStatusQueue.swift"
    ]);
    // Silent switch, ducking and mixing come from setAudioMode in AudioModule.swift, which the patch leaves alone.
    expect(patch).not.toMatch(/^[-+].*(?:setCategory|setActive|playsInSilentMode|duckOthers|mixWithOthers|playImmediately|activateSession)/m);
  });
});
