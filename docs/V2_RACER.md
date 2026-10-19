# Island races: implementation and integration

2026-10-19. Scope source: `docs/V2_RELEASE.md`, V05. Family-first offline action game for Stassie (7) and family, sharing Little Island's cream/teal/coral visual system. This is an original side-on 2.5D platform racer, not a 3D arena clone. Raised SVG platform faces, shadows and runner depth create the island scene; collision is deliberately two-dimensional and readable.

## Delivered source

- Training: First Footsteps teaches a coral hurdle, water gap and checkpoint.
- Lagoon Leap: hurdles, rolling coconuts, three water gaps.
- Canopy Climb: raised terraces, lifting gates, roller, four gaps.
- Sunset Shuffle: forward/reverse conveyors, rollers, lifting gate, four gaps.
- Each full course offers solo Practice and a four-runner Race. Training is solo.
- All runners use the same fixed-step acceleration, jumping, gravity, ground landing, obstacle collision, fall and checkpoint recovery. CPU uses a bounded local look-ahead controller, with deterministic seed-dependent speeds. It does not teleport or receive predetermined finishes.
- Run left/right, simultaneous run+jump, one-tap running toggle, discrete short step, keyboard arrows/Space and accessible Jump activation. Held and toggled controls clear on pause, interruption or navigation.
- Real timer, current progress/rank, finish placement, individual completed CPU times, honest “still on course” labels, three-minute timeout/retry, per-course/per-mode best records.

## Integration contract

Import from `src/racer`:

```tsx
<RaceScreen
  session={save.raceSession}
  records={save.raceRecords}
  active={isVisible}
  onSave={(session, record) => persistRace(session, record)}
  onExit={backToGames}
/>
```

`createRaceSession(course?, mode?, seed?, id?)`, `validRaceSession(unknown)`, `validRaceRecord(unknown)`, `validRaceRecords(unknown)`, `raceRecord(session)` and `mergeRaceRecord(records, record)` are exported. Serialized `RaceSession` is schema 1, `game: "racer"`, round `id`, course, mode, seed, fixed simulation tick, status, and up to four bounded runner states. `RaceRecords` is keyed `course:mode`; merge is idempotent and retains the faster completed time. No result is recorded for timeout/abandonment.

Parent must validate on load/import, include both fields in backups, commit latest session plus merged record transactionally, and prevent stale old-round saves overwriting a newer round. New-round `onSave` introduces its new ID. The screen saves at start, every two simulation seconds, checkpoints, terminal result, explicit pause, background, and unmount. Callback identity may change without resetting the animation loop. Parent should remount on external backup replacement; normal same-round save notifications do not reset live controls or physics.

Opening a running saved round resumes into Paused. Explicit Resume continues exact positions, velocities, obstacle phase and CPU progress; it never advances wall time while absent. Falling/hitting an obstacle returns to the last reached grounded flag and freezes that runner for 0.7 active seconds; the race clock and others continue. App background, browser blur/hidden, help and route suspension stop all simulation. A frame interruption over 0.5 seconds auto-pauses; smaller catch-up is capped at six steps, avoiding unseen leaps. Timers measure active simulation time, so real device performance remains an acceptance requirement.

## Renderer and motion

Physics runs at 60 fixed steps per active second. Static course geometry is retained between bounded HUD updates (five per second); per-frame movement changes only camera/runner/hazard SVG transforms through `setNativeProps`, rather than React/layout updates for every object. Native uses transform matrices; react-native-svg's web implementation takes its documented source-level `style` wrapper. The rAF loop stops when paused, choosing, help or terminal. Parent must profile actual Release builds; no frame-rate claim has been established by source tests.

Mechanical movement is essential game information and remains present for reduced-motion users. There are no cosmetic camera shakes, parallax motion, confetti, pulsing or idle bobbing; pressed controls provide immediate small feedback. The two expressive moments are the visible jump arc (communicates landing) and the static result panel (clear completion without delayed controls).

SDK/API references checked before implementation: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [SVG](https://docs.expo.dev/versions/v57.0.0/sdk/svg/), [RN 0.86 AppState](https://reactnative.dev/docs/0.86/appstate), [Pressable](https://reactnative.dev/docs/0.86/pressable), [direct manipulation](https://reactnative.dev/docs/0.86/legacy/direct-manipulation), and installed react-native-svg 15.15.4 `G.tsx` / `WebShape.ts`.

## Verification ledger

Agent-owned automated scope: courses, fixed-step rules, CPU traversal, results, validation and exact serializable recovery. Fifteen tests pass, including 64 full physical traversals across four courses/16 seeds, differing actual CPU finish times, collisions, falls, gates/rollers, gravity/no midair flight, pause/resume, capped catch-up, timeout, terminal no-ops, separate/idempotent records, invalid sessions/records. Full-worktree typecheck and lint pass; all 68 tests (53 original + 15 racer) pass.

Native/browser integration remains **not run in this worktree**, by agreed parent ownership. V05 still needs: play all four courses through actual controls, simultaneous two-finger touch, discrete/keyboard alternatives, finished placement and best persistence, timeout/retry, background mid-jump and exact Resume, help suspension, save/cold-launch and backup replacement. Test phone/tablet portrait/landscape and large text; record on-device performance, focus and actual physical iPad usability. Training and all authored courses are proven traversable by engine input; that is not a substitute for native game-feel evidence.

No servers, simulator, emulator or browser tabs were started. No dependencies, shared types, registry, routes, config or Store were changed.
