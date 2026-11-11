import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Compiles the installed (patched) expo-audio AudioPlayer.swift and AudioPlaylist.swift, unchanged, against host
// stand-ins (tests/fixtures/expo-audio-status) with ThreadSanitizer, then drives them the way AVFoundation and
// AudioModule do. These are the independent review's R1 race and R2 ordering probes turned into checks: the
// status-queue patch at 98137a96 fails player-race, player-order, playlist-race and playlist-order, and
// unpatched expo-audio fails them by delivering status on the main queue. Needs Xcode's swiftc, so CI (Linux)
// skips it; tests/expo-audio-status-patch.test.ts still guards the patch there.
const root = join(__dirname, "..");
const fixtures = join(root, "tests/fixtures/expo-audio-status");
const installed = join(root, "node_modules/expo-audio/ios");
// xcrun supplies the macOS SDK that swiftc needs.
const swiftc = process.platform === "darwin" && spawnSync("xcrun", ["--find", "swiftc"]).status === 0;
const scenarios = ["player-race", "player-order", "player-seek", "playlist-race", "playlist-order"];
const slow = process.env.LITTLE_ISLAND_SLOW_HOST === "1" ? 4 : 1;

describe.skipIf(!swiftc)("expo-audio status queue under ThreadSanitizer", () => {
  let dir = "";

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "expo-audio-status-"));
    const sources = ["AudioPlayer", "AudioPlaylist", "Playable", "StringConversions"].map(name => join(installed, `${name}.swift`));
    for (const file of sources) expect(existsSync(file), file).toBe(true);
    // Optional so the probe also builds, and fails on behaviour, against older versions of the patch.
    if (existsSync(join(installed, "AudioStatusQueue.swift"))) sources.push(join(installed, "AudioStatusQueue.swift"));
    copyFileSync(join(fixtures, "Probe.swift"), join(dir, "main.swift"));
    const flags = ["-swift-version", "5", "-sanitize=thread", "-g", "-Onone"];
    execFileSync("xcrun", ["swiftc", ...flags, "-parse-as-library", "-emit-library", "-static", "-emit-module", "-module-name", "ExpoModulesCore", join(fixtures, "ExpoModulesCore.swift")], { cwd: dir, stdio: "pipe" });
    execFileSync("xcrun", ["swiftc", ...flags, "-I", dir, "-L", dir, "-lExpoModulesCore", "-o", join(dir, "probe"), ...sources, join(fixtures, "Stubs.swift"), join(dir, "main.swift")], { cwd: dir, stdio: "pipe" });
  }, 600_000 * slow);

  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it.each(scenarios)("%s", scenario => {
    const run = spawnSync(join(dir, "probe"), [scenario], { cwd: dir, encoding: "utf8", timeout: 240_000 * slow, env: { ...process.env, TSAN_OPTIONS: "halt_on_error=1" } });
    const output = `${run.stdout}${run.stderr}`;
    expect(output, output).toContain(`PASS ${scenario}`);
    expect(output).not.toContain("ThreadSanitizer");
    expect(run.status).toBe(0);
  }, 300_000 * slow);
});
