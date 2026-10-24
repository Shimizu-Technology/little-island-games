# Design and family-play polish — 24 October 2026

Leon asked for the whole 24 October design/functionality audit to be implemented, tested and delivered to TestFlight for his phone. Audit: sibling `little-island-games-artifacts/reviews/2026-10-24-design-functional-audit/REPORT.md` (Impeccable native rubric 12/20, Taste lens, Emil Kowalski motion review, plus every game). Baseline main `71252f7` = TestFlight 1.2.0 (8).

## Scope

- **Leon's reports:** Hangman long words fit one row (balanced rows only at very large text); the family-word Start sits in a pinned sheet footer above the keyboard and Return starts; Tic-tac-toe keeps a family score, lets players choose X/O and who starts.
- **Family match** (Tic-tac-toe, Memory, Checkers, Go Fish, Crazy Eights): optional remembered names, who starts or alternate each rematch, running score stored with the round (earlier rounds only, current result derived live, so undo un-counts and reload never double-counts), immediate "Play again". Crazy Eights keeps cumulative points and explains the scoring. Solo Checkers shows the child's pieces at the bottom.
- **Bugs:** Hangman levels are ranges (3–4, 5, 6+) with 32 new 6–8 letter words and clue audio; pace choice hidden without a computer opponent; card copy spacing; Habitat detective explanation; empty-search recovery; Picnic vote result names the accused, role and tally; host Room details during play; Dash recovery advice; Maze/Number "together" label removed.
- **Reachability:** pinned sheet footers everywhere; compact game header; iPad landscape two-column boards; Secret Word Deal and private vote actions pinned; Picnic job panel above a compact map; Explore shortcuts above the map and lab feedback beside the task; Dash help in a sheet.
- **Feel:** platform push transitions (fade under Reduce Motion), bottom sheets with swipe-down, press scale, light haptics on feedback tones (iPhone), mark/line/flip/shake motion that never delays input, SVG icons instead of Unicode glyphs, Settings switches, a typed times-table grown-up gate, Home star favorites.
- **Explore audio:** optional "Hear this" for dynamic lab feedback (44 locally generated Samantha clips; the speech-rights gate in PRIVACY.md still applies).
- Expo patch updates (57.0.31 / router 57.0.29 / sharing 57.0.24) restore Doctor 21/21. Added `expo-haptics` (native build required). No backend, accounts or networking changes; nearby protocol unchanged.

Saves stay version 1. Every new session field is optional and validated; legacy rounds keep their original behaviour (X first, no match). A save written by this build can carry O-first Tic rounds or new fields that older builds reject, so restore a backup only into the same or a newer build.

## Execution

Lead: Claude (foundation, Home/Settings, integration, QA, release). Codex workers in isolated worktrees implemented the original-six games/play shell, cards/Secret Word/Dash, and Picnic/Explore; each ran its own browser QA on owned ports and cleaned up.

| Case | Scenario | Status |
| --- | --- | --- |
| P01 | Full gate: typecheck, lint, tests, web export, Doctor, Impeccable advisory | Pass — 259 tests / 25 files, Doctor 21/21, Impeccable `[]` |
| P02 | Hangman family word BUTTERFLIES via Return key, one row at 375/390/1024; Big words gives 6+ letters | Pass (browser) |
| P03 | Tic two-player names → win → score → Play again alternates starter → reload keeps score; O-first; undo after win un-counts | Pass (browser 390/375/1024; worker matrix) |
| P04 | Memory/Checkers matches, solo Checkers flipped, Maze/Numbers/Hangman controls reachable without scrolling at 390×844 and 1024×768 | Pass (browser); SE 375×667 needs a short scroll for the last Memory row and Number close |
| P05 | Cards, Secret Word, Dash (worker A) and Picnic/Explore (worker B) slice journeys | Pass (workers' browser QA) |
| P06 | Every route at phone/tablet: no page errors or horizontal overflow; Home filter kept after closing a first setup | Pass |
| P07 | Native Release on owned iPhone 16 Pro / iPad mini (A17 Pro) simulators (iOS 18.5), no Metro | Pass — Maestro 52-step flow on both: native keyboard BUTTERFLIES with Start visible above the keyboard and Return/go starting the round, one-row tiles, Tic names/win/Play again score, Settings gate, solo Checkers at the bottom, Picnic Garden actions in view. iPad landscape Maze two-column with arrows beside the board |
| P08 | Independent final-code review and CodeRabbit | Pass with fixes — CodeRabbit (Free plan) posted summaries only, so a completed independent Codex review is the advisory fallback. Round 1 (208159f): two material findings (Tic board 85pt in phone landscape; hidden family word exposed under a bullet overlay) and one minor (12 letters wrapped at the real 319pt width), fixed in dc4535d. Round 2 confirmed all three resolved, no new material issues. Greptile (historical, advisory) repeated those and added a stale Tic hint and an audio-mapping gap in the generator, fixed in 7a68649 and verified in the browser (hint clears on move and undo; generator is a no-op on current files) |

Native evidence (screenshots, Maestro logs/flows) is in sibling `little-island-games-artifacts/polish-1.3.0`. The simulator build was generated before the version bump, so it reported 1.2.0 (8) with identical application code. Host load (load average above 600) delayed the Maestro driver until owned simulators were reduced; T3 device tools were unavailable (daemon lock). Physical family devices, VoiceOver speech, audible speech quality, haptics on hardware and nearby multi-device play are not covered by agent QA.
