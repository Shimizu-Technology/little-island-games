# V2 cards: implementation and integration contract

## Purpose and acceptance

2026-10-19, inherited source `cbd1107`, approved scope in `docs/V2_RELEASE.md`. Stassie and family need complete offline card rounds on iPhone/iPad and shared web, with readable rules, clear results, honest computer play, private pass-device hands, durable progress and replay. This slice adds Go Fish and original Island Eights; it does not alter shared routes, Store, registry, dependencies or existing games. The existing cream/teal island design supplies controls and text; original shell, leaf, sun and wave marks distinguish suits by shape and color. A full 52-card deck retains 13 ranks and four suits.

## Fixed rules

Both games have two players, seven-card deals, one local computer or two people passing one device. Difficulty does not secretly change the rules or let the computer see concealed cards. The local policy is deliberately modest and deterministic.

Go Fish: ask only for a rank currently held; receive every opponent card of that rank and retain the turn. Otherwise draw one. Drawing the requested rank retains the turn; a different rank passes it. Four matching cards automatically become a book. An empty hand refills with up to seven cards while stock remains; a player with no cards and no stock waits. All thirteen books ends the round; most books wins. The public message reveals a matching draw (because it earns a public extra turn), but never identifies a nonmatching drawn card.

Island Eights: match rank or active suit; any eight is wild and requires an explicit suit choice, including the last card. If no card is playable, draw exactly one; only that newly drawn card may then be played, or the player can finish. No stacking, draw-two or skip effects. Empty hand wins. Eights count 50, pictures 10, ace 1, other ranks their number; the winner earns the opposing hand total. Empty stock recycles all discards except the visible top. Two genuinely blocked turns resolve by lowest hand total and award the difference; equal totals tie. With a conserved full deck and wild eights, such a blocked state is ordinarily unreachable (an eight remains available or the discard can recycle). Defensive transition behavior and import rejection of impossible truncated-deck fixtures are tested separately.

Rule references reviewed: [Bicycle Go Fish](https://bicyclecards.com/how-to-play/go-fish), [Bicycle Crazy Eights](https://bicyclecards.com/how-to-play/crazy-eights). These are explicit Little Island house rules rather than a claim that every variant matches those sources.

## Parent integration

Import pure engines from `src/cards/engine.ts`; import `CardGameScreen` from `src/cards` only in UI code. This keeps RN modules out of engine tests.

- `CardGame = "go-fish" | "crazy-eights"`.
- `createCardSession(game, options, seed?, id?)` returns a version-1 serializable `CardSession`. Explicit seeds/IDs support repeatable fixtures. Normal UI uses a fresh seed/ID for each round.
- `validCardSession(unknown)` checks bounded structure, identity, options, suit/rank ranges, complete unique 52-card conservation including booked cards, collected-book invariants, drawn-card ownership and terminal-result consistency. Save/import integration must invoke it before rendering or applying a restored session.
- `cardAction(state, action, actor?, expectedRevision?)` returns the same object for an invalid, wrong-player, stale or terminal action; accepted actions increment `revision` exactly once. No input state or nested arrays are mutated.
- `cardPublicView(state)` redacts opponent cards and stock order. `chooseCardAction(publicView)` cannot access those values; `computerCardTurn` uses that public contract and the same transition engine as humans.
- Screen props: `{ state, onChange(next, previous), width, active, sound, onFeedback? }`. The parent atomically replaces a saved session only if its current ID and revision match `previous`. New-round creation deliberately changes the ID. Parent should treat the callback as a compare-and-replace operation, preserving other saved games/settings.
- **Set `active=false` on parent route blur or whenever a parent modal overlays this screen.** Private UI remounts on recipient/route visibility changes. Every human hand requires explicit reveal; no revealed-hand flag is persisted. App background, Android focus blur and browser document visibility also conceal. Help/new-round sheets conceal immediately. A wild suit picker is part of the active private turn and is dismissed on interruption.
- CPU work is one 650 ms revision-bound timer, canceled while inactive, backgrounded, or in help/setup. Save a pending computer turn normally; resuming executes one valid decision at a time. The timeout is pacing, not an animation or game rule.
- Optional `onFeedback` connects an existing app sound effect. It is never called when `sound=false`. No speech, generated audio, native module or dependency was added by this slice.

Each card is at least 86×132 points; all action controls use shared 44-point-or-larger buttons. Hands scroll horizontally without shrinking labels or tap areas. Shape/name plus color identifies suits. Reduced motion needs no separate path: only immediate pressed-state opacity changes are used. Cards hide by removal from the rendered tree, including accessibility content, rather than a visual-only mask.

## Automated evidence and remaining journeys

Agent-executed engine tests include 100 full deterministic rounds per game with conservation/validation at every decision, private-information CPU contract, full-rank transfer/books/refill, extra turns, invalid and stale actions, wild last-card win, single draw and finish, recycling, blocked-score/tie defensive transitions, exact JSON resume and malformed imports. These checks establish engine behavior, not native privacy or usability acceptance.

Parent owns integrated browser/native QA under V03/V08/V09/V10 in `docs/V2_RELEASE.md`. Required remaining journeys: finish a real solo and two-person round of each; hide/show and alternating private hands; background during human hand, CPU wait and suit choice; parent help/setup/routing interruption; restore exact saved human/CPU/drawn-card positions; cancel versus confirm fresh round; phone/tablet portrait/landscape and large text; web keyboard focus and cold offline; update and backup round trip. Confirm actual screen contents and saved results. Physical family iPad, spoken VoiceOver and sustained real-device comfort remain operator acceptance.

No server, browser tab, simulator, emulator or container was started for this slice.

Slice verification: Node 22, `npm run typecheck`, `npm run lint` and `npx vitest run tests/cards.test.ts` passed (14 tests; 200 simulated full rounds included). Impeccable advisory scan returned `[]`. UI/runtime acceptance is explicitly not run in this isolated slice and remains assigned to the integration owner above.
