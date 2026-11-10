# Dependency patches

`patch-package` applies these during `postinstall` (`npm ci` locally and on EAS). It runs with `--error-on-fail --error-on-warn`, so a patch that no longer applies, or that was made for a different package version, stops the install.

## expo-audio+57.0.5.patch

**Targets:** expo-audio 57.0.5 (Expo SDK 57). It changes `ios/AudioPlayer.swift` and `ios/AudioPlaylist.swift` only. Android, web, the audio session and the audio mode are unchanged.

**Problem.** Each player registers a periodic status observer with `addPeriodicTimeObserver(..., queue: nil)`, which means the main queue. AVFoundation fires that observer as soon as the player's rate changes, so on every `play()`. The observer builds a status event, and reading `-[AVPlayerItem currentTime]` waits on a MediaToolbox item lock (`itemfig_GetCurrentTime` → `__psynch_mutexwait`) that is contended while the player starts. On the iOS 18.5 simulator, the main thread spent about 4% of its time in that wait (613 of 14,143 samples over 20 seconds). It stalled UI frames on most Arcade tones: in the Lagoon Run W1-8 replay (seed 771), 56–58 of 117 pickup windows had a frame gap over 33.4 ms. The seek completion handler, which AVFoundation also calls on the main queue, made the same read.

The audio session was measured and ruled out. `setActive(true)` in `play()` took a median of 0.06 ms, on the JavaScript thread. Keeping the session active, with no deactivations, still left 56/117 slow windows.

**Patch.** A serial `audioStatusQueue` (user-initiated QoS) delivers the periodic observers of `AudioPlayer` and `AudioPlaylist`, and the status update in `AudioPlayer.seekTo`'s completion. The seek still resumes JavaScript only after its status event is emitted. Status events reach JavaScript as before, and lock-screen updates already hop to the main queue in `MediaController`.

**Result.** With the patch, the same replay on iOS 18.5 had 0/117 slow pickup windows in three runs at 60 fps. The evidence is in the 4.0 program artifacts (`v4/a2-audio/REPORT.md`).

**Guard.** `tests/expo-audio-status-patch.test.ts` fails if the installed expo-audio is not 57.0.5, if the patch file or the `postinstall` step is missing, if any periodic observer is still delivered on the main queue, if the seek completion reads status on the main queue, or if the patch grows to touch the session, audio mode or playback.

**On an SDK upgrade.** The version check fails first. Read the new `AudioPlayer.swift` and `AudioPlaylist.swift`. If upstream no longer delivers status on the main queue, delete the patch, this section and the test. Otherwise port the patch, regenerate it with `npx patch-package expo-audio`, change the target version in the test, and repeat the iOS 18.5 replay measurement before shipping.
