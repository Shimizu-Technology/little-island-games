import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Guards the expo-audio status-queue patch (patches/README.md). Unpatched, every play() made AVFoundation
// fire expo-audio's periodic status observer on the main queue, and its -[AVPlayerItem currentTime] read
// waited on MediaToolbox's item lock while playback started. Every Arcade tone stalled frames on iOS 18.
const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const TARGET = "57.0.5";
const PATCH = `patches/expo-audio+${TARGET}.patch`;
const player = () => read("node_modules/expo-audio/ios/AudioPlayer.swift");
const playlist = () => read("node_modules/expo-audio/ios/AudioPlaylist.swift");

describe("expo-audio status-queue patch", () => {
  it("targets the installed expo-audio version and is applied on install", () => {
    const installed = JSON.parse(read("node_modules/expo-audio/package.json")).version;
    // An SDK upgrade must re-check the patch: port it, or drop it if upstream moved the observer off main.
    expect(installed, `patch targets expo-audio ${TARGET}; see patches/README.md`).toBe(TARGET);
    expect(existsSync(join(root, PATCH))).toBe(true);
    expect(JSON.parse(read("package.json")).scripts.postinstall).toMatch(/^patch-package --error-on-fail --error-on-warn && /);
  });

  it("no periodic status observer is delivered on the main queue", () => {
    for (const swift of [player(), playlist()]) {
      expect(swift).not.toMatch(/addPeriodicTimeObserver\([^)]*queue: nil/);
      expect(swift).toMatch(/addPeriodicTimeObserver\(forInterval: interval, queue: audioStatusQueue\)/);
    }
    expect(player()).toMatch(/^let audioStatusQueue = DispatchQueue\(label: "expo\.modules\.audio\.status"/m);
  });

  it("the seek completion reads status off the main queue and resumes JS after the update", () => {
    const swift = player();
    const seek = swift.slice(swift.indexOf("func seekTo(seconds:"), swift.indexOf("private func setupPublisher()"));
    expect(seek).toMatch(/ref\.seek\(to: time[^{]*\{ \[weak self\] _ in\s*(?:\/\/[^\n]*\s*)?audioStatusQueue\.async \{ \[weak self\] in\s*if let self \{\s*self\.updateStatus\(with: \[\s*"currentTime": self\.currentTime\s*\]\)\s*\}\s*continuation\.resume\(\)/);
  });

  it("changes only status delivery: no audio mode, session or playback logic", () => {
    const patch = read(PATCH);
    expect([...patch.matchAll(/^diff --git a\/(\S+)/gm)].map(m => m[1])).toEqual(["node_modules/expo-audio/ios/AudioPlayer.swift", "node_modules/expo-audio/ios/AudioPlaylist.swift"]);
    // Silent switch, ducking and mixing come from setAudioMode in AudioModule.swift, which the patch leaves alone.
    expect(patch).not.toMatch(/^[-+].*(?:setCategory|setActive|playsInSilentMode|duckOthers|mixWithOthers|playImmediately)/m);
  });
});
