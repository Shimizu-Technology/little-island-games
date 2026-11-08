# Lagoon measurement app

Use Expo SDK 57 and the lockfile. `LITTLE_ISLAND_VARIANT=development` resolves a separate app named **Little Island Dev**, bundle/package `com.shimizutechnology.littleisland.dev`, scheme `littleisland-dev`. Without the variable, the family identifiers, versions and builds are unchanged. The dev app has its own sandbox, SQLite and Documents; never change an installed family's bundle identifier or copy its saves into this app. No shared app group or keychain group is configured.

Lead signing/install preparation (no Apple actions performed by this slice):

```sh
npm ci
LITTLE_ISLAND_VARIANT=development npx expo config --type public
LITTLE_ISLAND_VARIANT=development npx expo prebuild --platform ios --no-install
/tmp/li3-pod-install.sh "$PWD/ios"
# Lead lists the generated workspace/schemes, then signs the dev target for registered test devices.
# Keep LITTLE_ISLAND_VARIANT=development on every prebuild/build command.
```

Open `littleisland-dev://arcade?game=lagoon-run&budget=1`. Pick W1-8. The hidden meter writes one `lagoon-*.json` under Documents at finish and when leaving an unfinished round. Files exposes the dev app's Documents. The receipt distinguishes UI callback gaps from presented frames and includes OS, round seed, level, event-tagged gap histograms, callback cost and observed cadence changes. Pause/resume discards the suspension gap. It does not measure GPU time or finger latency.

For reproducible automatic measurement open `littleisland-dev://arcade?game=lagoon-run&budget=1&replay=1`. It uses W1-8, seed 771 and the legal `fixtureInput` control driver, without changing hearts, collision or scene contents. Replay does not award progress. Before the separate A1 map-unlock work lands, start the available first level after opening this URI; the hidden replay replaces it with W1-8/771. The meter identifies the replay even if the surrounding map header still names the selected level. Changing replay mode remounts the runtime so an existing round cannot contaminate its seed. Use the same revision, seed and scene on each comparison, and record the source SHA with the JSON and clips.

Record the hardware model alongside each receipt. Run three 60-second samples on the iPhone 15 (iOS 18) with Low Power Mode off, cool device, Reduce Motion off; repeat Low Power Mode on, then iPad mini 6 (iOS 26). Target steady **60 Hz**: p95 at one refresh, p99 at two, no pickup gap above two refreshes. Repeat a ten-minute warm run for memory and thermal behaviour. Capture Instruments Animation Hitches and Time Profiler on a development-signed app; calculate main-thread CPU milliseconds/frame separately. Film real swipes at 240 fps with a second phone to count finger-start to first visible movement. Confirm offline cold launch, pause/background/resume and sound comfort. Simulator timings do not pass these device gates. Both family devices are 60 Hz; 120 Hz and dynamic-rate flag rebuilds are not acceptance gates.
