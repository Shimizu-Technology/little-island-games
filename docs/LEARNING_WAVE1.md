# Learning games — wave 0 and wave 1

25 October 2026. Leon asked for fun learning games across reading, math and science, with solo, together and versus play, CHamoru words, and everything fitting the app. Research: sibling `little-island-games-artifacts/reviews/2026-10-25-learning-games-research.md`; plan and decisions: `…/2026-10-25-learning-games-plan.md`. Baseline main `237f812` (TestFlight 1.3.0 (9)).

Leon's decisions: Home with islands and Try today; we write the stories (checked by a decodability tool); grown-up practice view; CHamoru as text and pictures only — no CHamoru audio. About Stassie: sounds out short words, rushes when reading alone, reads well with someone; enjoys math; curious about science.

## Design rules
- The learning action is the game action; no quiz gates, timers, coins, unlocks, streaks or lures.
- Reading games never reward speed. Turtle Tales advances one word per tap in order; Which One? uses near-miss pictures; read-together modes alternate sentences.
- Every instruction is spoken; any word in a reading game can be heard on request.
- Problems mix within a round and missed skills come back (local spacing memory, never shown as a grade).
- Modes per game: on my own, with a grown-up (cooperative) and take turns with a family score.

## Scope
- **Foundation (wave 0):** pure engine registry and session envelope (`src/learn`), strict save validation (`learn`, `skills`, `recentLearn`), stale-round guards, shared `LearnFrame`, `/learn` route, per-slice speech modules, contract test for every engine.
- **Home:** Continue across all game kinds, favorites, Try today, islands (Reading, Numbers, Science, Thinking, Classic games, Explore) with shelf screens; Explore "Try it" links.
- **Grown-up view:** "What she's been practicing" behind the existing gate, without numbers.
- **Games:**
  - **Reading:** Sound Boat, Turtle Tales, Which One?, Håfa Adai Island (CHamoru).
  - **Numbers:** Reef Race, Island Market.
  - **Science:** Tide Pool Lab, Float or Sink.
  - **Thinking:** Crab Commands.
- **CHamoru:** source-backed HåfaGPT vocabulary (exact spelling, citations), Håfa Adai Island and a CHamoru Memory pack.

Saves stay version 1; new fields are optional and validated. Old saves load unchanged.

## Acceptance

| Case | Scenario | Status |
| --- | --- | --- |
| L01 | Full gate: typecheck, lint, tests (incl. contract test for all nine engines), web export, Doctor | Pass — 424 tests / 32 files (contract test for all nine engines), typecheck, lint, web export (1,665 offline resources), Doctor 21/21, Impeccable `[]` |
| L02 | Every learning game: every offered mode to a finished round, Play again, reload mid-round, phone and iPad layouts | Pass — each worker played every offered mode to a finished round with Play again and mid-round reload at 390×844, 375×667, 768×1024 and 1024×768 (numbers 24 layouts, science 24 cases, reading 28, home 23); lead combined pass opened every game at phone and iPad landscape without page errors or overflow |
| L03 | Reading content passes the decodability checker; stories/sentences/words have speech | Pass — decodability checker runs over every word, sentence, story, prompt and question (tests); speech exists for all of them. Lead rewrote the 12 stories with small plots, fixed letter-name segment hints (now 'Back has three sounds'), the pig drawing and red-object scenes |
| L04 | Home: islands → shelf → game → back keeps shelf; Continue resumes the latest of any kind; favorites incl. learning games; Try today + Shuffle | Pass — browser and native: Try today + Shuffle, islands → shelf → game → back keeps the shelf, Continue resumes the latest learning game, favorites include learning games |
| L05 | Grown-up practice view shows recent skills without numbers | Pass (browser, worker) — gated practice view lists recent skills as 'getting easier' / 'practicing' with no numbers |
| L06 | CHamoru: only source-backed terms, exact spelling, no CHamoru audio; Håfa Adai Island and Memory pack | Pass — 51 source-backed HåfaGPT terms match the source spelling exactly (lead re-verified); all bundled speech is English directions; Håfa Adai Island and the CHamoru Memory pack play solo and take-turns |
| L07 | Legacy saves from 1.3.0 load and play | Pass — save tests keep every legacy shape valid; new fields optional and strictly validated |
| L08 | Native Release on owned iPhone and iPad simulators | Pass — Release build on owned iPhone 16 Pro and iPad mini (A17 Pro) simulators, iOS 18.5, no Metro: Maestro 49-step flow on both (Home, Try today, islands, a full Turtle Tales page read word by word, every learning game opened, Continue) plus iPad landscape Home and Island Market |
| L09 | Independent final-code review | Pending |

Physical family devices, VoiceOver speech, audio quality, and whether Stassie chooses these games on her own remain operator checks after TestFlight.
