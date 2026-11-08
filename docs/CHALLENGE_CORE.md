# Challenge core

F2 builds on `docs/SAVE_CONTRACT.md` revision 3. Envelope 3, profiles 2, Challenge session/progress 1, the seven completion codes, permanent award bits and admission ceilings are unchanged. Old School stars remain separate. This branch registers the existing 28 School games and their bounded signal contexts; it registers no new puzzle or game.

## Precedence and evidence

PLAN section 3's precedence table wins over the older School/Play drafts. Beginners keep their existing help. Challenge adapters derive a whole submission through their real engine; F4 owns the shared neutral-draft and hint interface. Hearing a question is not solution help. No invitation reads speed, duration, calendar day, app-open counts or time away.

| Dare | Replay evidence | Independent requirement |
| --- | --- | --- |
| Par | Named cost metric at or below the launch budget | Registration names whether help is allowed |
| Clean | Solved, no solution help or failed Run/Check | Solo |
| Plan | Actual Run/Check count, retained through reset/edit/reload | Registration names whether help is allowed |
| Blind | Support-off option fixed at launch | Registration names whether help is allowed |
| Whole | One successful whole Check, no earlier failure/help | Solo |
| Two ways | Canonical winning solution hash differs from every retained first hash; hashes copied into launch payload | Help and Together allowed |
| Pick up | Engine's terminal objective set | Help and Together allowed |
| Own read | Own-read chosen at launch, no read-aloud before answer, no solution help or failure | Solo |
| Edits | Engine metric measured against the original draft | Registration names whether help is allowed |

Marks are permanent bits; no badges, rewards or gates are inferred from them. A failed dare still accepts a valid solved puzzle. Together does not write personal invitations. Real-time Arcade cannot register a paused replay codec; it keeps engine-published, owner/epoch/round-bound terminal callbacks.

## Registering a slice

School registration lives beside each game as `registration.json`, with an immutable `id`, append-only `slot`, and group `levels` or `originals`. A complete engine and view must exist. Run `npm run registry:generate`, commit its outputs, and run `npm run check`. The generated `learnIds`, engine and view maps drive save validation and shelves. Adding any of the six originals needs its complete registration; this core does not expose placeholders. Thinking shows **Levels** and, when nonempty, **Island originals**. Removing or reordering a committed ID fails the build.

For a replay Challenge adapter, add `src/challenge/registrations/<game>.ts`. Export exact `Payload`, `Action`, and `State` types and a `registration` built by `defineReplayGame`. The generated mapped `Registry` binds these types. Keep React views inside the typed closure; only the validated storage boundary receives `unknown`. No adapter uses `any`.

Each immutable puzzle includes its exact F1 ref, source, tier, path, descriptor, dare rules and optional lower/upper par bounds. Register immutable meanings in `src/state/save-catalog.json` before hydration. Every bank entry must retain its ordinal, rules, hash and award capabilities forever. Retired content needs its compatibility decoder. The save-catalog history check remains the authority. Registration must include actual engine witnesses and the relevant adapter tests; the fixture maze in tests is not shipping content.

`defineReplayGame` keeps launch options and first-solution hashes fixed, replays only legal typed engine actions, retains help/run/check/reset evidence, rejects actions after terminal state and derives the terminal result and marks. Replay logs are capped at 512 actions plus the 4,096-byte session limit. Checkpoint engines must supply their own typed bounded codec using F1's packing/rings and prove monotonic audit extension; this replay helper is not a checkpoint implementation.

`ChallengeFrame` has explicit Start, accessible Help/Back/Easier/Another puzzle, per-person remembered path, a separate paused slot, and explicit attempt replacement through one guarded `challengeSave` with `expected.replace`. Start/finish is awaited before writing working choices. A refused transition keeps saved work. Draft durability failures retain Store's accepted revision and offer Retry/export through SaveStatus. No real-time frame log is added.

## Saved School boards

For replacement Levels 4–5, set `nativeStages: true` in the game's new engine. Never flip `ownLevels` on one of the twelve shared-board games. `withGrowth` creates the new engine state for new rounds, but validates and dispatches a saved `type: 'growth'` state through the archived board. LearnFrame, help, feedback, stars and evidence dispatch on saved state. Keep old growth questions and old generated-task revisions available.

## Invitations and comfort

A completed personal solo puzzle adds one bounded context signal and one bounded aggregate practice count. Two consecutive clean finishes can offer a stretch; a first clean finish at a higher School level can offer further up; a clean-at-budget Challenge finish can offer a dare. Three helped finishes can offer a gentler choice, without commentary. A face appears at most every third completion in that context, in place of an invitation. Too easy can open the related challenge directly. Dismissal is saved until another puzzle finishes. Family/Together, leaving and backgrounding supply no personal readiness inference.

Behind the existing grown-up gate, `settings.learningComfort[learner]` stores `offers`, `youngChild`, and an opening level 1–5. The map has at most five existing learner IDs and strictly validated values. It is optional for old saves. It does not alter F1 Challenge/session/profile formats. A saved round and remembered game choice take priority over the default opening level. Young-child mode hides dares and Challenge invitations, while help remains available.

Beep Bot has no Deep Water registration and Level 5 can offer Crab Commands. Letter Lagoon can offer Sound Boat. The Cove bridge is readiness-controlled and must stay hidden until G1/CV-02 supplies the actual route. Code Lab retains ages 9–14; its top end is for older learners/adults.

## Routes and acceptance

`gameDestination` is shared by shelves and the reachability ledger. Every current School game is three taps or fewer from the map; Hall and Arcade games are two. Arcade shelf entries use `/arcade`. Every world, valid level and Endless is open with zero stars; persisted historical star/open-world metadata remains valid without migration. Terminal validation still rejects invalid levels, malformed results, duplicate credit and stale owner/epoch/round callbacks.

Automated tests cover all nine evidence types through the actual Maze engine, reset/reload assistance retention, forged payload/results, F1 atomic credit and merge, all twelve saved board games, bounded offers, policy backup, all Arcade level IDs and registration/reachability. Native iOS 18.5/26.5, physical-family feel and final adapter UI remain lead integration acceptance; this brief assigns no simulator and forbids workers from sharing the lead's devices.

## Independent-review corrections (9 November 2026)

Explicit replacement uses one guarded `challengeSave` start with `expected.replace`; the frame never discards before constructing/committing the new attempt. Terminal credit frees its paused slot atomically, while the live frame retains the result until leaving. Full unfinished slots offer Continue, Settings export and an explicit replacement choice. Blind/Own Read options derive from the selected dare at launch. A/B awards declare `{rule, help}` and use the same help/Together evidence policies as dare marks.

Bridge choice/dismissal is retained per learner and game in validated `settings.learningBridges`, including Family. All result controls require the saved round's owner and solo mode. A face consumes the round card on every answer. Ratings remain until the next third-finish face; a gentler invitation is hidden at the floor.

FND-13's `registeredDestinations.taps` is a declared navigation budget, not an observed click count. Route, shelf and route-file coverage are enforced. Actual navigation remains part of UI QA; a future navigation change must update the path/budget and QA evidence.

### K1-SPEECH — named integration acceptance for F2 result cards

Owner: F2 supplies lines and controls; program lead generates the two voice banks (COMMON.md makes audio regeneration lead-only). This is K1 result-card acceptance, not an unspecified F5 speech-planner task. Eight proposed lines are preserved in the sibling artifacts folder as `v4/f2-challenge/f2-challenge-speech-proposal.json`, to be installed by the lead into `scripts/learn/f2-challenge.json` together with generated audio (the current gate rejects an incomplete live manifest): feeling/options, dare, harder, easier, three bridges, paused capacity. Before child/family acceptance, the lead must register and generate these keys in both voice banks, wire their Hear actions to the result card/bridge, and verify audible playback offline on iOS 18.5 and 26.5. No generated narration files or audio registries are changed by this worker. The existing School harder invitation's `Hear the invitation` action is restored now using its recorded `learning-try-level-N` line; this is covered by component and web QA. New face/bridge narration remains an explicit K1-SPEECH integration gate, not claimed as audible here.
