# Dependency patches

`patch-package` applies these during `postinstall` (`npm ci` locally and on EAS). It runs with `--error-on-fail --error-on-warn`, so a patch that no longer applies, or that was made for a different package version, stops the install.

## expo-audio+57.0.5.patch

**Targets:** expo-audio 57.0.5 (Expo SDK 57). It changes `ios/AudioPlayer.swift` and `ios/AudioPlaylist.swift` and adds `ios/AudioStatusQueue.swift`. Android, web, `AudioModule.swift`, the audio session and the audio mode are unchanged.

**Problem.** Each player registers a periodic status observer with `addPeriodicTimeObserver(..., queue: nil)`, which means the main queue. AVFoundation fires that observer as soon as the player's rate changes, so on every `play()`. The observer builds a status event, and reading `-[AVPlayerItem currentTime]` waits on a MediaToolbox item lock (`itemfig_GetCurrentTime` → `__psynch_mutexwait`) that is contended while the player starts. On the iOS 18.5 simulator, the main thread spent about 4% of its time in that wait (613 of 14,143 samples over 20 seconds). It stalled UI frames on most Arcade tones: in the Lagoon Run W1-8 replay (seed 771), 56–58 of 117 pickup windows had a frame gap over 33.4 ms. The seek completion handler, which AVFoundation also calls on the main queue, made the same read.

The audio session was measured and ruled out. `setActive(true)` in `play()` took a median of 0.06 ms, on the JavaScript thread. Keeping the session active, with no deactivations, still left 56/117 slow windows.

**Patch.** Each player and playlist owns an `AudioStatusQueue`: one serial queue that every status producer uses. The periodic observer is delivered on it. Seek completion, playback end, KVO, loop changes, playlist changes and media-services reset queue their status on it, in the order they happen, and it builds and emits each status there, off the main queue. Seek still resumes JavaScript only after its status is emitted.

- **Generations.** A counter advances on `play()` (a replay), item replacement, player replacement after a media-services reset, and playlist changes. Each status remembers the generation it was queued in and is dropped if the generation moved on before it is emitted. The periodic observer captures the generation it was registered in, so callbacks from a removed observer that are still in flight are dropped.
- **Playlist edits.** Every track-list change (append, insert, remove, clear, rebuild) goes through `trackListChanged()`. If an observer is registered, it is re-registered for the new generation, so a continuing playback keeps reporting progress. `remove()` finishes its rebuild, and so its invalidation, before `play()` registers the observer.
- **Release.** `sharedObjectWillRelease()` first closes the queue for good, under its lock, before pending seeks are cancelled and the player is torn down. Statuses that are queued, being built, or submitted afterwards (late seek completions, KVO, a media-services reset) are all dropped, and later invalidations don't reopen it. Queued work still runs, so a seek still resumes JavaScript exactly once.
- **Terminal status.** After a `didJustFinish` status, the periodic observer of that generation emits nothing more, so completion is never followed by an older periodic status.
- **Snapshots.** A status takes its player reference under the queue's lock, the same lock `replacePlayer` holds when it assigns `ref`. It then reads that player and one current item without the lock, because those AVFoundation reads can block. A playlist's track list (`sources`, `playerItems`, `previousTrackIndex`) is read and written under the same lock. No AVFoundation call is made, and no object is released, while the lock is held.

Lock-screen updates already hop to the main queue in `MediaController`.

**Result.** With this version, the same replay had 0/117 slow pickup windows in three runs on iOS 18.5 and three on iOS 26.5, at 59.7–60.0 fps with a p99 of 16.7 ms. Status callbacks ran off the main queue in every logged case (384 of 384 on 18.5, 200 of 200 on 26.5). The evidence is in the 4.0 program artifacts (`v4/a2-audio/REPORT.md` and `FIX-REPORT.md`).

**Guards.**
- `tests/expo-audio-status-patch.test.ts` fails if the installed expo-audio is not 57.0.5, if the patch file, `AudioStatusQueue.swift` or the `postinstall` step is missing, if any periodic observer is delivered on the main queue, if a status producer bypasses the queue, if `ref` is assigned outside the snapshot lock, if release doesn't close the queue, if a playlist edit invalidates without re-registering its observer, or if the patch grows to touch the session, audio mode or playback.
- `tests/expo-audio-status-queue.test.ts` (macOS with Xcode; skipped on Linux CI) compiles the installed Swift files unchanged against host stand-ins in `tests/fixtures/expo-audio-status/` with ThreadSanitizer. It drives them as AVFoundation and `AudioModule` do: held and concurrent periodic reads during media-services resets, playback ending while a read is in flight, replay, release, seek, playlist rebuilds, progress after playlist edits, and statuses that arrive after release. The first version of this patch (98137a96) and unpatched expo-audio each fail seven of its eight scenarios; the second (a11e1020) fails the three for playlist edits and release.

**On an SDK upgrade.** The version check fails first. Read the new `AudioPlayer.swift` and `AudioPlaylist.swift`. If upstream no longer delivers status on the main queue, delete the patch, this section, both tests and the fixtures. Otherwise port the patch, regenerate it with `npx patch-package expo-audio`, change the target version in the tests, and repeat the iOS 18.5 replay measurement before shipping.
