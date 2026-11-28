# Build 11 Wave 1: island atmosphere and AB-1 splash

Implementation branch: `p4/b11-1-global-atmosphere-and-splash`, from `program/4.0` at `a4de404c4387ddf64d3eb66c0484c08f9474b4d7`. This is a draft integration PR; no store publication or build submission is included.

## Context and acceptance

Little Island is an offline family game collection. Stassie should see the sky chosen in Home throughout the island, especially Fruit Bat Flight, and be able to change it from the map. The product and acceptance references are `docs/PRD.md`, `docs/QA.md`, Home's validated personalization model, and the Build 10 playtest request. The older portfolio note in Brain Dump predates the AB-1 icon merge; the specified source commit is the implementation baseline.

The active Islander's existing `HomeStateV2.atmosphere` remains the only saved sky. The hook reads it without migration or writes on render. Map edits use Home's reducer, bounded undo history, and the learner/epoch-fenced Store personalization transaction. No schema, catalog, game engine, score, collision, or protected test changes are introduced.

Day/clear mounts no weather field or extra lighting layer. Other moods reuse Home's particle engine, stop motion while away/inactive, and show a small static field with Reduce Motion. Map stars borrow the existing tide clock; Flight glints borrow its gameplay clock. Sunset/night changes preserve bright foreground art and paper score surfaces. Headers use pale paper accents with weather confined to header bounds; puzzle grids, learning choices, and reading text are outside those accents.

The map shortcut has a 48pt target and the label “Sky and Weather.” It opens the shared picker, including unlocked seasonal sky presets and links to decorate inside Home. Its weather stays live while the picker is open.

The local iOS config plugin copies the committed AB-1 PNG and writes a centered 200pt cream launch storyboard into the generated project. It adds no package, leaves generated `ios/` uncommitted, and supports both app variants. SDK 57 splash/config-plugin documentation was checked before implementation:

- https://docs.expo.dev/versions/v57.0.0/sdk/splash-screen/
- https://docs.expo.dev/config-plugins/mods/

## Verification — 28 November 2026

Agent-executed affected-flow checks used a fresh isolated web origin and the default fictional Family profile. Screenshots are clean rendered proofs of the live exported DOM with bundled image/font bytes embedded. Shared-preview screenshot/action capture timed out; DOM evaluation and the HTML renderer remained available. The fallback Chrome screenshot surface was unavailable, and its task-created window was closed.

| Required scenario | Result and evidence |
| --- | --- |
| Default save read; map/Home shared updates; undo; invalid/stale callback refusal | Passed by `tests/global-atmosphere.test.tsx`, using the real Home reducer, personalization validation, and save encoder/parser. |
| Map picker: Night + Snow, six destinations, saved field, narrow layout | Passed in the exported web app at 390×844; durable Home field confirmed, Home → Sunset + Leaves → map synchronization also passed, no horizontal overflow, 24 particles across map/header; `map-night-snow.png`. |
| Fruit Bat Flight: saved Night + Snow reaches free flight | Passed in exported web app; night sky, 18 snow particles, indigo header, star glints, crisp bat/obstacles/fruit/HUD; live particle transforms changed between observations; Finish free flight reached the result; `flight-night-snow.png`. |
| Sunset + Leaves; day/clear zero-field path | Passed by render/unit tests for map and Flight sky. |
| Background/inactive/Reduce Motion | Passed by render tests for all four particle kinds; animation cancellation and three static reduced-motion particles verified. Native timing/performance is not established. |
| Other Arcade scenes and destination chrome | Shared scene/weather integration and affected render suites passed. Full interactive playthroughs of all nine games are not claimed. |
| Default and development iOS prebuild | Passed in separate temporary copies, both removed: exact AB-1 image bytes, 200pt center constraints, cream background, storyboard registered in Xcode. Apple `ibtool` compiled the storyboard successfully. |

Automated checks:

- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with zero errors; existing repository warnings remain.
- `npx expo-doctor`: 21/21 passed.
- Requested targeted sweep, plus Home seasonal/performance and premium Flight coverage: 39 files, 424 tests passed, `--maxWorkers=2`.
- Affected destination/game render sweep: 35 files, 355 tests passed. Existing narrow native mocks were extended for decorative boundaries; assertions were preserved.
- Final affected retests: passed after the map live-preview and star-glint refinements. The final atmosphere suite has 14 passing cases, including numeric AA contrast checks for the new text/background pairs.
- Web export: passed; 7,542 offline resources (final fingerprint in the evidence export log).
- Advisory Impeccable scan: `[]`.
- Six protected tests and `src/state/save-catalog.json`: unchanged from the task base. Wave 2/3 ownership files and private policy: untouched.

Local evidence directory: `little-island-games-artifacts/v4/b11-global-atmosphere/` (outside Git). It contains sanitized PNG/HTML proofs, both generated storyboards, prebuild verification logs, and the automated logs.

Native device gameplay, installed-release splash appearance, real family device acceptance, and final independent review remain for integration/release. Expo documents that development builds do not fully reproduce release splash behavior. Public release stays a separate gate in `docs/QA.md`.

## R1 fixes and R2 verification — 28 November 2026

Independent review R1 requested four changes on `e2ee63701fd451587eb571b4b602855c4eb6160a`. Each is addressed:

- **R1-01:** Non-Flight arenas receive only six subtle foreground particles, using measured arena dimensions. Sky and lighting remain in `PlayScene` behind the board. Subtle mode suppresses sky/tint defensively, even when a caller requests them. Render tests launch all eight non-Flight screens and inspect the playing board's actual ancestors and overlays.
- **R1-02:** Sunset retains the authored illustrated backdrop with a translucent warm glow. Night renders its own sky without mounting or decoding a hidden day/sunset bitmap. Gradient definitions use sanitized React IDs. Portrait and landscape render tests cover image presence/absence and independent gradient references.
- **R1-03:** The plugin clears only its generated splash imageset, explicitly sets `UILaunchStoryboardName`, and repairs missing typed file/resource registration in the app target without duplicate references. Both app variants were prebuilt again after injecting stale images and removing launch registration; both recovered. `ibtool` and `actool` passed without ambiguous-content/unassigned-child warnings. Temporary projects were removed.
- **R1-04:** Full-bleed headers default to square corners; inset headers explicitly request rounding and have breathing padding without shrinking their original content width. Layout callbacks ignore zero dimensions and unchanged sizes and retain only width/height. Tests cover corner modes, padding, and redundant layout events.

The separate CI failure in `p4-reef-sweep-ui.test.tsx` is also fixed. The shared weather component loads the particle module through React lazy/Suspense only for non-clear weather, so clear screens never evaluate Reanimated through this import path. The Reef Sweep test is unchanged and passes. A dedicated module-loading test throws if clear day/sunset/night evaluates the particle module; all three cases pass. Native module loading remains green.

The final combined targeted/affected sweep passed **698 tests in 68 files**, with two workers. The atmosphere suite now has 32 cases, and the separate clear-loading suite has three. Typecheck passed; full lint has zero errors (274 existing warnings), and lint on changed code is clean. Expo Doctor passed 21/21. The final web export passed with offline shell `c4e585636057`.

The refreshed 390×844 DOM-rendered proofs are `map-night-snow.png`, `flight-night-snow.png`, and `flight-sunset.png` in the existing external evidence directory. Original night proofs are retained in `r1-before/`. These show rendering and layout; native performance and family acceptance remain separate. R1's original report is preserved unchanged; the fixes still need independent re-review on the new PR head.

R1 runtime cleanup: the task-created preview tab and port 43832 server were closed/stopped; no owned runtime resources remain. Evidence is retained outside Git; the draft worktree remains available for the lead.
