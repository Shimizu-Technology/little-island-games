# Little Island 4.0 contract freeze

The 4.0 contract froze at the end of Proofs, on `program/4.0` @ `ef94a25b` (15 November 2026). This page is the index for fan-out slices. It names the frozen surfaces, where their rules are written, what a slice may add on its own, and what needs a lead contract change. The linked documents and code are authoritative. Where this page and they disagree, they win, and this page gets fixed.

The rule (program plan §5): contract changes go through the lead, one at a time, and every affected slice is re-gated. A slice may **add** inside the shapes below. Changing a shape, limit, version or rule that another slice relies on is a **lead change**.

## Lead-change log

- **15 November 2026 — F-frame-2, lead-approved:** extend the existing non-animated
  board-entry/rotation reveal to short landscape windows with window height **< 500 pt**,
  and measure their board space from the revealed 8-pt top, as the AX path does.
  Header structure, pinning, text caps and the Challenge grid budget are unchanged.
  Scrolling up must still expose Back, sound, Help and the learner switch in their
  existing VoiceOver order. At AX, entry/rotation reveal is limited to the ported
  measured School boards (Crab, Beep, Håfa Adai, Reef Race, Weather, Tide Pool,
  Float/Sink, Tide Logic, Logic Lagoon, Slip Tide, Treasure, Canoe Seats) plus Shell Math,
  which already had an AX entry reveal. Unported and reading boards keep their
  existing entry behavior at **>= 500 pt**. Default text keeps the strict 500-pt threshold.
  Next questions in short landscape retain the revealed board position.
  Rotation preserves the round and triggers at most one reveal per rotation;
  no animated scroll is introduced. Required proof: 499/500 threshold tests,
  portrait/landscape/portrait round preservation and iPhone 15 landscape frames
  at default and AX5 text sizes.
  *16 November 2026, O2 (lead-approved):* Canoe Seats joins the ported measured boards. Its floor is
  legibility-first: seat pictures stay at least 56 pt on a phone and 64 pt on an iPad (the board passes
  the per-rung, per-device floor as the hook's minimum), and the page scrolls rather than shrinking them.

- **15 November 2026 — K7, pre-authorized by `c2b-k7/BRIEF.md`:** additive
  revision-1 nested program drafts for Crab, Beep and Turtle, plus compact structural
  edit operations in Crab/Beep replay codecs. Shared AST includes sequences, whole-body
  repeats, nonrecursive songs and one obstacle condition. All written nodes count;
  limits remain 80 nodes, effective depth 4, 512 expanded commands, 512 replay
  actions and 4,096 bytes. No envelope/profile/session version, class, budget,
  or slot changes. Block editing requires explicit `blockEditor: true` on a newly
  authored level/task or puzzle descriptor. Every existing/published descriptor
  keeps its flat editor and exact executed-card/Again/par/best semantics. Opted-in
  card-limit dares count expanded executable cards, not AST nodes. The condition
  sensor is an extensible tagged union: `[4, [0], yes, no]` means
  blocked (edge or obstacle). New sensors append exact tagged payloads and adapter
  predicates with tests; unknown tags fail closed and old tags never change.
  Code Lab/Tide Logic stay separate. Legacy saves remain
  unchanged and retain their compatibility decoders. See SAVE_CONTRACT's K7
  subsection and `tests/k7-{program,parity,saves}.test.ts`. Pre-K7 builds reject the
  whole save after a School draft is stored; originals
  remain preserved by recovery. This includes drafts in existing games.
  Integration must re-gate the affected adapters; SC-01b/c and SC-03 new content remain separate work.
- **15 November 2026 — reserved-slot claims below the high-water mark (lead, `lead/slot-claims`):**
  `root.json`'s `nextSlot` and `nextOrdinal` stay monotonic high-water marks and
  `assertRootAppendOnly` is unchanged. A bake may now claim explicit slots below them,
  each inside the caller's own reservation in `src/content/puzzles/slot-ranges.json`
  (the lead's register, mirroring SLOTS.md), never a pack of any family (retired included),
  not an inline bank in the working save catalog, and not a pack or bank at any published
  tip. A claimed pack's ordinals start at `slot × 1024`. After a claim each counter is
  the larger of itself and what the claim used. The Latin and edge bakes, the kit's
  `bake --range … --owner …` and the Word Search install use this path; the sequential
  default is unchanged. `puzzles verify` now also requires every pack and save-catalog
  bank slot to lie inside a recorded reservation. No published bank, catalog entry or
  save changes. Found by the G7a (P3-6) and T1 (P1-2) reviews; G7a and T1 re-bake their
  unpublished packs through a claim before integration. See `docs/PUZZLE_BANKS.md`
  "Slot allocation" and `tests/slot-claims.test.ts`.

## Saves: envelope 3, profiles 2

- **Rules:** `docs/SAVE_CONTRACT.md` (FND-15 revision 4), `docs/PROFILE_SAVES.md`.
- **Code:** `src/state/`.
- **Tests and fixtures:** `tests/save-contract.test.ts`, `tests/helpers/save-contract.ts`, `tests/fixtures/save-v3/`, `tests/fixtures/catalog-revision/`, `tests/fixtures/launch/`, `tests/fixtures/home-undo-legacy/`.

**Frozen:**
- envelope 3, profiles 2, session and progress revision 1;
- the 3-bit completion table, award bits A and B, and the 4,096-bit dare bitmap;
- the session classes and their 4,096-byte budget, and the 512-action replay cap;
- the 104,000-byte learner and 72,000-byte Cove-person ceilings, the 2,000,000-byte save and the 1,000,000-byte Library;
- capacities and working sets;
- five learners plus four Cove-only people;
- the typed refusals;
- write-behind and boundary writes, migration, restore, rollback and launch recovery;
- Home undo caps: write 15,000 bytes, read 20,480.

**A slice may add:** a codec for its own game inside an existing session class and budget; bank and dare slots from its reserved range; context IDs (ASCII, at most 16 characters); retirement of its own content, keeping the decoder.

**Lead change:** any new envelope, learner or settings field; a new session class or larger budget; capacities, ceilings, refusals or migration. Known upcoming changes, to be scheduled one at a time:
- K7 program saves for Crab, Beep and Turtle;
- HS-01 Home storage;
- MT-01 math best;
- saved drawn puzzles (CV-08);
- the narration queue (FND-07, K9).

## Challenge registry and entries

- **Rules:** `docs/CHALLENGE_CORE.md` ("Registering a slice").
- **Code:** `src/challenge/` (`types.ts`, `replay.tsx`, `registrations/`, `registry.generated.ts`, `registered-ids.json`); `scripts/generate-game-registry.mjs` (`npm run registry:generate`, `registry:check`); `src/state/save-catalog.json` with `scripts/check-save-catalog.mjs` and `scripts/puzzles/save-catalog-banks.ts`.

**Frozen:**
- the shapes of `Puzzle`, `RegisteredDare`, `AwardRule`, `LaunchOptions`, `ReplayPayload` version 1, `Evidence`, `ReplayEngine` and `ChallengeViewProps`;
- paths `deep-water` and `endless`, tiers 1–6, `MAX_DARES = 3`;
- the boolean `idempotentHelp` and the optional `prior`;
- registered IDs are append-only;
- the published set is the catalog contents at the `program/4.0` and `main` tips, and the check fails closed when a ref is missing.

**A slice may add:** one registration per game; puzzles and banks; dares in its range; the optional `defineReplayGame` hooks (`prior`, `prefilledStart`, `completionText`, `helpUI`, `assistance`, `packed`). Workers regenerate shared generated files on their own branch only when their brief allows it. The lead regenerates them at integration.

**Lead change:** new dare rules, metrics, sources or paths; new engine, view-prop or host fields; replay caps; the generator; the publication rule.

## Puzzle kit and packed banks

- **Rules:** `docs/PUZZLE_BANKS.md`, `docs/PUZZLE_HELP.md`.
- **Code:** `src/puzzles/` core (`descriptor.ts`, `bank.ts`, `catalog.ts`, `attempt.ts`, `checks.ts`, `hints.ts`, `flow.ts`, `bots.ts`); `src/content/puzzles/root.json`; `scripts/puzzles/` (`pipeline.ts`, `receipts.ts`, `history.ts`, `order.ts`, `byte-model.ts`, `families/`).

**Frozen:**
- `BANK_CAPS`: 512 slots, 1,024 entries and 128 KiB per pack, a 28 MiB catalog, 4 MiB decoded with two decoded packs, a 25% template share;
- format 1 for root, manifest and pack, and `ROW_LIMITS`;
- immutable, append-only slots;
- `certify` gates 1–8;
- `budget-exhausted` never means unsolvable;
- dumb-player bots, receipts and `--shipping`;
- the shared ordering, and Today pool versions.

**A slice may add:** a family, following "Adding a family"; packs in new slots; a new Today pool version. It may re-bake in place only content that isn't published.

**Lead change:** caps, formats, gates, ordering, the history rule, anything touching a published slot, or byte-model growth past the size budget.

## Slots

The caps are banks 0–511 and dares 0–4095 (`src/state/challenge.ts`, `src/state/catalogManifest.ts`). A slice uses only the range the lead's slot register gives it, and the lead checks `src/state/save-catalog.json` against the register before each merge. Bank ranges are also recorded in `src/content/puzzles/slot-ranges.json`, which `puzzles verify` enforces and packed bakes claim from (`docs/PUZZLE_BANKS.md` "Slot allocation"). A new range, an edit to that file, or anything outside the caps, is a lead change.

## Grid shell

- **Code:** `src/puzzles/grid/` (`GridShell.tsx`, `GridScroll.tsx`, `model.ts`, `checkpoint.ts`, `preferences.ts`, `budget.ts`) and `src/cove/`.

**Frozen:** `GridShellProps`; the Friendly, Plain and Rewind mistake settings with no mistake cap; number-first entry; nearest-cell hit testing; page scroll held while the grid owns a touch; fill-notes for adults only.

**A slice may add:** a family passing its own `spec`, `borders`, `tints`, `overlay`, `frame`, `cellWords` and `status`, or its own board for a genre that isn't a grid.

**Lead change:** props, gesture or scroll arbitration, mistake settings, or the budget constants below.

## Word pipeline gates

- **Rules:** `scripts/words/README.md`.
- **Code:** `scripts/words/` (`guard.mjs`, `check.mjs`, `review.mjs`, `generated-admission.mjs`, `puzzle-admission.mjs`, `density.mjs`); `content/words/registry.ts`; `npm run check:words`, `check:words:export`, `check:words:release`, `check:words:receipt`. CI reads the private policy from a secret, and local locked gates use a private lock that never enters the repo.

**Frozen:**
- every shipped word has two blind reviews from different models, a lead reconcile and a receipt;
- `familySample` is Leon's alone;
- keys and file names never admit vocabulary;
- single-word speech entries are admitted or traced;
- generators admit words at the source;
- CI fails without the policy;
- CHamoru comes only from HåfaGPT source-backed terms.

**A slice may add:** a word game that imports only receipted entries through the existing admission path, and speech lines in `scripts/learn/<slice>.json`.

**Lead change:** policy contents, secrets, exceptions, thresholds, a new generator in the admission inventory, or `REVIEW_PROMPT_VERSION`. The version must be bumped whenever the review context changes.

**Reading records (W1 reading-records contract change, PR #64, awaiting lead approval):** the contract covers reading content as data: banks, records, sentences, passages and growth questions that a child reads, builds or answers. Reading content as data must flow through `provenance.ts`. A new reading game or board must use it, and a static test enforces this for registered reading routes and LearnFrame-selected boards. Hand-authored UI strings are covered by code review and W1's export string scan.
- New reading content comes only through detached W1 admission (`src/learn/reading/admitted/`, minted by `src/learn/reading/tasks.ts`).
- Inherited content (shipped before admission existed) is a digest-checked, frozen, branded snapshot in `src/learn/reading/provenance.ts`, and every source is anchored to the lead-owned baseline `tests/fixtures/reading-inherited-baseline.json`. Changing that baseline is a lead change; inherited content is never added to or edited by re-pinning a digest.
- Accepted residual: a new standalone route that prints hand-written text through ordinary `Copy`/`Text` is not a provenance surface; it is caught by independent review and the export string scan, not by the static test.

## LearnFrame and ChallengeFrame

- **Code:** `src/learn/LearnFrame.tsx` (`LearnFrame({ id })`, `useStepReveal`, the board text cap); `src/challenge/ChallengeFrame.tsx` (`ChallengeFrame({ entry, requestedPuzzle })`, `ChosenDare`, `challengeIntro(entry)`).

Boards receive `ChallengeViewProps`: `state`, `dispatch`, `active`, `width`, `sessionKey`, `onFresh`, `commit`, `onSettled`, `header`, `footer`.

**Frozen frame rules:**
- a compact header;
- the final board stays on the solved screen;
- the intro comes from what the entry offers;
- the help-audio button appears only when its source resolves.

**A slice may add:** boards that use these props and slots, and per-game scroll hooks through `useStepReveal`.

**Lead change:** any prop or frame layout change. These are Foundation files.

## Largest text (AX)

- **Code:** `src/components/wordFit.ts`, `src/components/Text.tsx`, `src/puzzles/grid/budget.ts`.

**Frozen constants:**
- `LARGE_TEXT = 1.5` and `atLarge(fontScale, cap)`, so caps apply only at a text scale of 1.5 or more and default size never changes;
- `CHROME_MAX = 1.5`, `TITLE_MAX = 2`;
- `wordFitMultiplier` with a 3.5 ceiling, `sharedWordFit`, `ellipsize`;
- the `TextFit` context and `TextRegion` (`entryRegion` caps at 44 pt);
- the grid budget: status line 33, button row 44, pad row 56, page pad 20, base board height of 55% of the window up to 620, bar 64, chip row 58, `boardRoom`, `gridViewportMax`, and the edge cell floors.

**Rules:**
- no word breaks mid-word;
- titles cap at about 2× and chrome at 1.3–1.5×;
- at AX5 the board and the first pad row are visible together, on a phone in portrait and landscape and on an iPad;
- the status height is measured from the real sentence;
- "Enlarge cells" sits after the pad at AX sizes;
- long names use an ellipsis, with the full name in the accessibility label;
- rotating re-arms the board reveal.

**A slice may add:** these helpers in its own views. **Lead change:** thresholds, caps, constants or new shared helpers.

Every slice's own acceptance includes AX5 frames on iOS 18.5 and iOS 26.5, in portrait and landscape, before review.
