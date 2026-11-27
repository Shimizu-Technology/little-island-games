# Build 9 Picture Grid crash and game-entry audit

2026-11-28. Executor: implementation agent. Base: `origin/program/4.0` at `1cc37c83f33342055ec672ab0e89d41d845320c1`. Fix branch: `p4/clean-4-fix-picture-grid-and-game-crashes`. This is source and simulator verification for a draft PR; it does not publish a store build.

Little Island is an offline family collection with local, validated saves. Orientation: [PRD](PRD.md), [QA](QA.md), the generated School/Challenge registries, and [Cove shelf](../src/cove/shelf.ts). Historical release notes predate the supplied Build 9 source. The simulator build uses that source's gameplay code, Expo 57, React 19.2.3, React Native 0.86.3, Release Hermes and the New Architecture, with `LITTLE_ISLAND_VARIANT=development EXPO_PUBLIC_LIBRARY_PREVIEW=1`. Its local metadata is 3.0.0 (28), inherited from that source configuration. It is an unsigned local simulator app, not the signed TestFlight binary or a physical-device test.

## Reproduction and cause

On iPhone 17 Pro / iOS 26.5, simulator `10843A3D-08E4-41B5-B92C-55DB8FD3EDDE`:

1. Cold-open Little Island Dev, tap Puzzle Cove, scroll to and tap Picture Grid. **Pass:** StartSheet shows the illustration, all four difficulty choices, summary and Play.
2. Tap Play. **Fail:** the app exits to the iOS Home Screen. The native report records `EXC_CRASH`, `SIGABRT`, `Abort trap: 6` and an uncaught `RCTFatalException`.

The system log at 01:13:42 records:

```text
Unhandled JS Exception: Invariant Violation: `new NativeEventEmitter()` requires a non-null argument.
invariant@5183:25
NativeEventEmitter@26965:30
anonymous@53686:62
loadModuleImplementation@159:43
guardedLoadModule@95:46
metroRequire@43:91
get PushNotificationIOS@34676:20
metroImportAll@69:38
asyncRequire@351658:43
defaultLoadReactNative@390115:64
anonymous@390125:23
commitHookEffectListMount@19522:31
commitPassiveMountOnFiber@20101:49
```

The native last-exception backtrace begins with `__exceptionPreprocess → objc_exception_throw → RCTGetFatalHandler → -[RCTExceptionsManager reportFatal:stack:exceptionId:extraDataAsJSON:] → -[RCTExceptionsManager reportException:] → NSInvocation → ObjCTurboModule::performVoidMethodInvocation`.

The triggered native thread aborts through `objc_exception_rethrow` and `facebook::react::ObjCTurboModule::performVoidMethodInvocation`. The full report is retained as `baseline-crash.ips`, with the full system log and unminified baseline bundle for line matching. After the fix, the native fatal-log scan from 01:22 onward has no matching fatal entries, and the baseline `.ips` remains the only Little Island Dev crash report.

`defaultLoadReactNative = () => import('react-native')` imports the whole CommonJS namespace. Metro's `importAll` reads its enumerable lazy getters, including `PushNotificationIOS`, which constructs `NativeEventEmitter` with an absent native notification module. Expo 57's own `expo/src/async-require/asyncRequireModule.ts` evaluates `asyncRequireImpl` synchronously before wrapping its result with `Promise.resolve`. The loader calls `importer().then(...)`, so an immediate throw occurs before its rejection handler is attached. Metro also reports native module initialization failures through its global fatal handler. Avoiding unrelated module initialization is the root fix.

The fix defers a CommonJS require until controls are needed and selects only `View`, `Text`, and `Pressable`. Both loader calls also enter a promise chain before invoking their importer, so synchronous importer failures use the existing retry state. The board's application-module dynamic import is retained. No dependency, board rule, native prop, saved payload, bank, codec, or save-catalog change is required.

## Audit findings

- The runtime import scan covered all `src/**/*.ts{,x}`. Picture Grid was the sole dynamic import of the React Native core namespace. The regression guard distinguishes runtime calls from TypeScript `import()` types.
- All sibling `React.lazy` imports target application board modules, which export ESM namespaces. They do not enumerate React Native's CommonJS getters. Their registered boards mount in the new registration-wide regression test; native Challenge samples test the real lazy path.
- `LazyLatinBoard`, `LazyBridgesBoard`, `LazyLineBoard`, `LazySolitaireBoard`, and the Originals' wrappers defer named `require` access. No matching namespace-enumeration hazard was found.
- `StartSheet` → `CoveMotif` / `DifficultyPills`, and `difficultyOptionsFor` → `sizeTag` / `tierSummary` / `bankFacts`, were inspected. Metadata uses pure engines/packed descriptions. The old native StartSheet itself passed before the fix.
- `Asset.fromModule` / `downloadAsync` / `readAsStringAsync` paths in puzzle-bank and picture transports use the SDK 57 legacy file-system entry point. The standalone native checks exercise packaged `.lipuzzle` files, rather than Metro URLs.
- `useBoardHud` updates command refs while `CoveRound` compares a serialized command shape before updating HUD state. The inspected path does not loop merely because callbacks change identity.
- `useEffectEvent` appears in Picture Grid hint scrolling and Cove animation effects. The installed React Fabric renderer implements it; calls occur from effects. The native Picture Grid hint check exercises the path.
- Native `accessibilityRole`, `tabIndex`, `onKeyDown`, numeric border widths, `StyleSheet`, `PanResponder`, nested `ScrollView`, Sheet modal and Reanimated sites were inventoried. Typecheck and native entry checks cover the selected paths. This source audit is not a claim that every layout/input combination or every game completion was tested on iOS.

## Automated coverage

- `registry:check`: 35 School games and 33 Challenge adapters.
- `save:catalog`: unchanged published catalog, 180 banks at the supplied program base.
- Typecheck, lint with zero warnings, and Expo Doctor 21/21 pass after the fix.
- 131 targeted checks pass across eight files: all 31 playable Challenge/Cove registrations, separate Solitaire Draw 1/Draw 3/FreeCell cases, 35 School start-state cases across the five level settings, the native namespace guard, synchronous import/retry regressions, and the existing Picture Grid/Cove checks.
- A further 26 Arcade/Library checks pass across four files, including the all-Arcade worklet scan and runtime boundary checks. The final focused native-loading run passes 5/5 checks.
- The registration-wide test mocks native adapters and kit surfaces, runs real registration/session/board logic, and adapts Vite's unsupported deferred CommonJS TSX boundaries. It does not substitute for the native results below. The two word registrations without published content are asserted unavailable, rather than supplied invented production fixtures.
- Full gate on the isolated Linux runner: registry/catalog checks and all 18,049 puzzle entries pass. The first `npm run check` invocation then exhausted Node’s default 2 GB heap during typecheck. Resumed typecheck, lint and the full suite pass with `NODE_OPTIONS=--max-old-space-size=4096` and two Vitest workers: **570 files passed, 2 skipped; 7,742 tests passed, 13 skipped**, in 750.05 seconds. The skips are the Linux-inapplicable Swift ThreadSanitizer probe and the opt-in raster hull audit. Web export passes with 7,542 offline-shell resources; export admission/guard passes (7,544 guarded files); final Linux Doctor passes 21/21. All `npm run check` stages have passed across the original and resumed invocations. The local export reports `policyDataChecked: false`; private-policy release validation was not run or bypassed.

## Native entry ledger

All rows use the rebuilt standalone Release/Hermes simulator app. `passed` for an entry means the visible shelf/setup, start action and actual board were inspected without a crash. It does not mean a whole puzzle was solved. Only Picture Grid has the expanded paint/cross/undo/hint/cold-relaunch scenario. At the normal four-paused-round cap, only empty rounds owned by the new `Crash QA` fixture were replaced. The Family practice round used for persistence stayed separate.

Representative journeys beyond Cove also pass: Hall Coconut Drop setup/tutorial → column drop and computer response; Hall Tic-tac-toe setup → human move and computer response; Checkers capture Challenge → lazy tactics board; Arcade Shell Song level map/setup/tutorial → shell input; School Håfa Adai setup → picture response; Library Reef Food Web → a completed connected chain. These used real native screens, not test-renderer mocks.

### Cove shelf

| Game | Actual route | Native entry |
| --- | --- | --- |
| sudoku | cove | passed |
| killer | cove | passed |
| cage-math | cove | passed |
| greater-than | cove | passed |
| bridges | cove | passed |
| loop | cove | passed |
| pearl-loop | cove | passed |
| skyline | cove | passed |
| picture-grid | cove | passed |
| reef-sweep | shortcut | passed |
| solitaire | cove | passed |
| freecell | cove | passed |
| slip-tide | school | passed |
| canoe-seats | school | passed |
| gate-crab | school | passed |
| shell-scale | school | passed |

Word Search has no published banks on this base. Crossword has no registration. Neither appears on the native shelf; these are availability limits, not successful play tests. FreeCell shares Solitaire's registration/save slot. The four Originals use School routes; Reef Sweep uses Challenge.

### All Challenge registrations

| Registration | Automated start / board | Native host checked |
| --- | --- | --- |
| beep-bot | passed | not_run |
| bridges | passed | Cove: passed |
| cage-math | passed | Cove: passed |
| canoe-seats | passed | not_run |
| checkers | passed | passed |
| code-lab | passed | not_run |
| crab-commands | passed | not_run |
| drop-puzzles | passed | not_run |
| fishing-nets | passed | not_run |
| gate-crab | passed | not_run |
| greater-than | passed | Cove: passed |
| hidden-canoes | passed | not_run |
| killer | passed | Cove: passed |
| logic-lagoon | passed | not_run |
| loop | passed | Cove: passed |
| memory | passed | not_run |
| pattern-path | passed | not_run |
| pearl-loop | passed | Cove: passed |
| picture-grid | passed | Cove: passed |
| reef-sweep | passed | passed |
| shape-shift | passed | not_run |
| shell-math | passed | not_run |
| shell-pits | passed | not_run |
| shell-scale | passed | not_run |
| skyline | passed | Cove: passed |
| slip-tide | passed | not_run |
| solitaire | passed | Cove: passed |
| sound-boat | unavailable content asserted | not_run |
| sudoku | passed | Cove: passed |
| tic-tac-toe | passed | not_run |
| tide-logic | passed | not_run |
| turtle-draw | passed | not_run |
| word-search | unavailable content asserted | Cove: not_run |

### School

| Game | Source / automated audit | Native entry |
| --- | --- | --- |
| reef-race | valid starts across five level settings | not_run |
| island-market | valid starts across five level settings | not_run |
| sound-boat | valid starts across five level settings | not_run |
| turtle-tales | valid starts across five level settings | not_run |
| which-one | valid starts across five level settings | not_run |
| tide-pool | valid starts across five level settings | not_run |
| float-sink | valid starts across five level settings | not_run |
| crab-commands | valid starts across five level settings | not_run |
| hafa-adai | valid starts across five level settings | passed |
| shell-math | valid starts across five level settings | not_run |
| number-hop | valid starts across five level settings | not_run |
| quick-practice | valid starts across five level settings | not_run |
| beep-bot | valid starts across five level settings | not_run |
| turtle-draw | valid starts across five level settings | not_run |
| tide-logic | valid starts across five level settings | not_run |
| code-lab | valid starts across five level settings | not_run |
| pattern-path | valid starts across five level settings | not_run |
| shape-shift | valid starts across five level settings | not_run |
| logic-lagoon | valid starts across five level settings | not_run |
| weather-watch | valid starts across five level settings | not_run |
| food-web | valid starts across five level settings | not_run |
| space-station | valid starts across five level settings | not_run |
| times-tide | valid starts across five level settings | not_run |
| fraction-feast | valid starts across five level settings | not_run |
| treasure-algebra | valid starts across five level settings | not_run |
| letter-lagoon | valid starts across five level settings | not_run |
| word-workshop | valid starts across five level settings | not_run |
| story-studio | valid starts across five level settings | not_run |
| slip-tide | valid starts across five level settings | passed |
| canoe-seats | valid starts across five level settings | passed |
| gate-crab | valid starts across five level settings | passed |
| shell-scale | valid starts across five level settings | passed |
| island-colors | valid starts across five level settings | not_run |
| reef-sounds | valid starts across five level settings | not_run |
| splash-count | valid starts across five level settings | not_run |

### Arcade

| Game | Source / automated audit | Native entry |
| --- | --- | --- |
| reef-builder | source/native import guard; Arcade worklet scan | not_run |
| shell-song | source/native import guard; Arcade worklet scan | passed |
| rail-parade | source/native import guard; Arcade worklet scan | not_run |
| crab-crossing | source/native import guard; Arcade worklet scan | not_run |
| palm-patrol | source/native import guard; Arcade worklet scan | not_run |
| beach-ball | source/native import guard; Arcade worklet scan | not_run |
| fruit-bat-flight | source/native import guard; Arcade worklet scan | not_run |
| lagoon-run | source/native import guard; Arcade worklet scan | not_run |
| canoe-cargo | source/native import guard; Arcade worklet scan | not_run |

### Hall classics

| Game | Source / automated audit | Native entry |
| --- | --- | --- |
| checkers | source/native import guard | not_run |
| tic-tac-toe | source/native import guard | passed |
| memory | source/native import guard | not_run |
| word-rescue | source/native import guard | not_run |
| maze | source/native import guard | not_run |
| numbers | source/native import guard | not_run |

### Hall boards

| Game | Source / automated audit | Native entry |
| --- | --- | --- |
| coconut-drop | source/native import guard | passed |
| shell-pits | source/native import guard | not_run |
| fishing-nets | source/native import guard | not_run |
| hidden-canoes | source/native import guard | not_run |
| reef-sweep | source/native import guard | not_run |

### Hall activities

| Game | Source / automated audit | Native entry |
| --- | --- | --- |
| go-fish | source/native import guard | not_run |
| crazy-eights | source/native import guard | not_run |
| racer | source/native import guard | not_run |
| island-mystery | source/native import guard | not_run |
| word-imposter | source/native import guard | not_run |

### Library

| Game | Source / automated audit | Native entry |
| --- | --- | --- |
| Library | source/native import guard | passed |

## Evidence and remaining acceptance

Evidence directory: `/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/v4/post-b9-crash-fix/`.

- Crash: `baseline-crash.ips`, `baseline-crash-system.log`, `baseline-crash-summary.txt`, `baseline-bundle.js.gz`, `baseline-bundle.sha256`.
- Native verification: `picture-grid-ios-working.png`, `picture-grid-ios-start-sheet.png`, `picture-grid-ios-fresh-play.png`, `picture-grid-ios-resumed.png`, `picture-grid-expert-ios-working.png`, per-game `*-ios-working.png`, `native-actions.jsonl`, `native-results.json`, and board/setup text snapshots.
- Inventory and source identity: `registration-inventory.json`, `source-audit-inventory.json`, `native-loader-hook-sites.txt`, `native-prop-sites.txt`, `verified-source-sha256.json`, `protected-source-check.json`. The six protected test files and `src/state/save-catalog.json` are byte-identical to the supplied base.
- Check outputs: `full-check-asus.log` (catalog/engine pass then default-heap OOM), `full-check-asus-resume.log` (all remaining stages pass), targeted check logs and `verification-summary.json`.
- Build evidence: baseline and fixed build/bundle logs and `fixed-bundle.sha256`. The fixed native Release target was rebuilt; Metro then regenerated the embedded JS/assets using its cache and the same `hermesc -O` compilation as the Xcode phase. No dev server is involved in either simulator app.

Physical family iPhone/iPad, iOS versions other than 26.5, Android, VoiceOver, rotation, larger text, audible comfort, every game's full solve/recovery journey, and public release are not established by this run. Native School/Arcade/Hall coverage is representative where a row says `not_run`.

Observed outside the crash path: the Puzzles-only grown-up Add button can be covered by the software keyboard on this phone. The form's Enter submission works. This is recorded as a separate usability issue; no profile/save behavior was changed in this fix. On the Expert Picture Grid, tools and hint feedback are below the initial phone viewport; scrolling the clue gutter reaches them. This run records that layout limit separately from the passing board and hint-scroll checks.

The task’s iPhone 17 Pro simulator was closed and shut down through Device Tools. Task-generated `ios/`, `DerivedData/`, `node_modules/`, and `.expo/` were removed; no task Metro/server was started. The borrowed CSG Connect simulator was untouched. The Linux validation command has exited successfully. Lifecycle cleanup reports no active owned resources. Final PR/head are recorded in the implementation handback.
