# Lagoon measurement app

Use Expo SDK 57 and the lockfile. `LITTLE_ISLAND_VARIANT=development` resolves a separate app named **Little Island Dev**, bundle/package `com.shimizutechnology.littleisland.dev`, scheme `littleisland-dev`. Without the variable, the family identifiers, versions and builds are unchanged. The dev app has its own sandbox, SQLite and Documents; never change an installed family's bundle identifier or copy its saves into this app. No shared app group or keychain group is configured.

Lead signing/install preparation (no Apple actions performed by this slice):

```sh
npm ci
npm run ios:dev -- --prepare
/tmp/li3-pod-install.sh "$PWD/ios"
# Or build/install the dev app directly after selecting the intended test device:
npm run ios:dev -- --device
```

The guarded command sets the variant, checks the resolved `.dev` identifier and measurement marker, refuses an existing family native project, generates through Expo, and checks again before building. Run it from an isolated dev checkout. Never use the unguarded `ios` command for measurement.

Open `littleisland-dev://arcade?game=lagoon-run&budget=1`. Pick W1-8. The hidden meter writes one `lagoon-*.json` under Documents at finish and when leaving an unfinished round. Files exposes the dev app's Documents. The receipt distinguishes UI callback gaps from presented frames and includes OS, round seed, level, event-tagged gap histograms, callback cost and observed cadence changes. Pause/resume discards the suspension gap. It does not measure GPU time or finger latency.

For reproducible automatic measurement open `littleisland-dev://arcade?game=lagoon-run&budget=1&replay=1`. It uses W1-8, seed 771 and the legal `fixtureInput` control driver, without changing hearts, collision or scene contents. Replay does not award progress. Before the separate A1 map-unlock work lands, start the available first level after opening this URI; the hidden replay replaces it with W1-8/771. The meter identifies the replay even if the surrounding map header still names the selected level. Changing replay mode remounts the runtime so an existing round cannot contaminate its seed. Use the same revision, seed and scene on each comparison, and record the source SHA with the JSON and clips.

Record the hardware model alongside each receipt. Run three 60-second samples on the iPhone 15 (iOS 18) with Low Power Mode off, cool device, Reduce Motion off; repeat Low Power Mode on, then iPad mini 6 (iOS 26). Target steady **60 Hz**: p95 at one refresh, p99 at two, no pickup gap above two refreshes. Repeat a ten-minute warm run for memory and thermal behaviour. Capture Instruments Animation Hitches and Time Profiler on a development-signed app; calculate main-thread CPU milliseconds/frame separately. Film real swipes at 240 fps with a second phone to count finger-start to first visible movement. Confirm offline cold launch, pause/background/resume and sound comfort. Simulator timings do not pass these device gates. Both family devices are 60 Hz; 120 Hz and dynamic-rate flag rebuilds are not acceptance gates.


Receipt schema 2 assigns event tags to the first **following** callback gap, with `eventWindows` retaining the next three gaps and their maximum. Use complete pickup windows for the two-refresh gate; an incomplete trailing window is not a pass. A callback gap measures scheduling, not presented display frames. Capture hardware model and Low Power state in the receipt with `EXPO_PUBLIC_LAGOON_DEVICE_MODEL` and `EXPO_PUBLIC_LAGOON_LOW_POWER`; unset fields explicitly say `unrecorded`. Dev file writes and replay both require the resolved `extra.lagoonMeasurement === true`; a family `budget=1` URL cannot enable them. The dev app omits family-room Bonjour configuration.

For same-tick scene comparisons the dev replay accepts `&witness=<fixed tick>` (maximum 10000). It freezes the legal W1-8/771 simulation at that tick, including poses, without overriding collision or powers; the label identifies the frozen tick. This is evidence capture, never a performance sample. Remove `witness` for quiet runs. The contact-witness regression defines reproducible captures. A separate `&quietHud=1` dev replay diagnostic suppresses the HUD only for cause isolation; it never qualifies as complete-scene acceptance.

The 120 ms ready beat is premount time, **not** a bitmap-decode signal. On the physical iPad, verify all twelve floor frames, rails, hull/cargo/outrigger and all ramp sections appear in the first motion frames with no decode hitch. Measure actual decoded/GPU memory in Instruments; the previous 73 MB pixel calculation is not a measurement. Keep Low Power/thermal and audible comfort checks explicit.

The soft visual teaching hint replaces the old repeating hazard warning sound intentionally: continuous warnings compete with action/pickup notes. Record this change when judging family sound comfort. Splash uses water droplets; near misses use gold sparkles, both with complete fade lifetimes. Reduced Motion keeps the small non-moving opacity dip on contact.
