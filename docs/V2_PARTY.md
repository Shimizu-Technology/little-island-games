# Secret-word Imposter

2026-10-19. Implements V04 from `docs/V2_RELEASE.md`: an offline family game for 3–8 people sharing one device. The intended audience includes Stassie (7), with pictures and short instructions to support readers. It is separate from the character-based Imposter game and uses no network, microphone, AI or backend.

## Fixed house rules

Each person privately sees a card. Everyone receives the same word and original picture except one Imposter, who receives no word or picture. After hiding the card, pass the device to the named next player. One or two complete clue circles follow; each named player gives one short clue aloud without saying or spelling the word. Nobody is eliminated during clues.

Everyone then votes privately for one other player. Self-votes are forbidden. The player with the most votes is the suspect; choosing the Imposter wins for the family, choosing anyone else wins for the Imposter. Tied leaders get one private runoff, with all players voting again among those leaders. A second tie lets the Imposter escape. The result names the Imposter and secret word, but never displays individual ballots.

Replay preserves names, selected pack and clue-circle count, chooses a different word and rotates the Imposter to another player. Starting a different game opens setup while preserving the current round until new roles are dealt.

## Content and design review

Three packs contain 18 familiar words, each with an original vector picture:

- Animal Friends: cat, fish, bird, turtle, butterfly, snail.
- Picnic Basket: apple, banana, watermelon, carrot, pizza, ice cream.
- Outside Wonders: sun, moon, tree, flower, cloud, rainbow.

The vocabulary and drawings were reviewed during authoring for recognizable everyday subjects, readable labels, no frightening/sexual/violent subject matter, and no outside links or factual claims requiring a reference source. The packs are a small party-game vocabulary collection, not the Explore educational library. Physical family recognition and enjoyment remain unverified. All art is created in `PartyPicture.tsx`; there are no third-party image licenses or network assets.

The screen inherits Little Island's cream, teal and coral palette. Role handoffs use the same neutral card back for every player. Large buttons, wrapping name rows, readable full-word cards, explicit hide/pass and vote confirmation provide the interaction. There are no entrance animations, timers or automatic secret announcements; reduced-motion users receive the same static experience. Nicknames are accepted and 3–8 unique names are required.

## Integration

Import from `src/party`:

```tsx
<PartyScreen
  session={save.partySession ?? null}
  active={isVisible}
  width={availableWidth}
  sound={save.settings.sound}
  onChange={(next, previous) => commitPartyIfCurrent(next, previous)}
/>
```

`onChange(next, previous)` supplies the exact previous session object (or null at initial setup). Parent must compare it with the current saved session before committing. The screen also advances its local latest-session ref immediately so repeated/stale events cannot skip a player. External backup replacement should remount the screen. `active` must become false when parent navigation or a covering parent modal hides the activity. The supplied `sound` prop is accepted for shell compatibility; this activity has no narration assets or recording and plays no audio.

Exports include `PartySession`, `PartyIntent`, `createPartySession({ players, pack?, clueRounds?, seed?, id?, previousWord?, previousImposter? })`, `validPartySession(unknown)`, `validPartyNames(unknown)`, `partyAction(session, intent)`, `partyActor`, `partyCandidates`, `topPartyVotes` and `rematchParty`.

The session has `version: 1`, `game: "word-imposter"`, round ID and revision. Every intent carries its expected round/revision and acting player. Wrong-round, stale, duplicate, out-of-order, wrong-phase and terminal intents are identity no-ops. Validation checks names, pack/word consistency, exactly one valid Imposter index, phase/cursor progress, ballot eligibility, runoff necessity, revision totals and derived result. Parent owns envelope migration, persistence/recovery and backup inclusion.

## Privacy and recovery

Role visibility, unfinished ballot choice and handoff acknowledgment are ephemeral UI state. A saved role cursor means “this person is next”; it does not mean “show their card.” Opening a saved game always displays the neutral handoff first. Revealed role/image/text is conditionally mounted only while the current exact player/revision is revealed and the app/route is active. Background/inactive, browser blur/hidden, help, different-game confirmation and unmount conceal secrets; a lost unfinished vote must be chosen again. Completed private votes remain saved for exact recovery, without appearing on later players' screens or in accessibility labels.

This is casual same-device privacy, not encryption or protection from someone inspecting backup files, developer tools, taking a photo or looking over a shoulder. Parent backups/settings remain grownup-controlled. OS app-switcher screenshot timing and actual assistive-technology focus require native acceptance; source event handling alone does not establish them.

## Verification and remaining acceptance

Agent-executed automated scope: 12 tests covering all packs, 3–8 players, one/two clue circles, normalized unique names, stale/duplicate/wrong actor/phase intents, illegal/self votes, family and Imposter wins, tied runoff, second-tie escape, every intermediate save round-trip, fresh rematch, and forged imports/results. Full-worktree typecheck and lint pass, and all 100 tests pass (including 12 party tests).

Root owns actual UI QA. Still **not run in this worktree**: native/browser private role reveals and accessibility tree, hide/pass under rapid taps, background/foreground and covered routes, resumed secret concealment, private vote choices and runoff, large text, narrow phones/tablet landscape, keyboard focus, result/replay, backup replacement and cold launch. Stassie's ability to understand the picture/clue/vote flow remains a family acceptance check. No screenshots or engine test counts substitute for these journeys.

SDK57 index and RN0.86 AppState/TextInput documentation were checked before API edits. No dependencies, package/config, shared Store, registry, routes or type files changed. No runtime resources were started.
