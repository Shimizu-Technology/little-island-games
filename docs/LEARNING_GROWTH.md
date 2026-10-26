# Learning that grows with the family

Authorized 26 October 2026 after Leon/Stassie's TestFlight12 feedback. Base 992dd03 (application aba07b2), private 1.6.0(12). Family-first offline collection, no accounts, analytics, purchases, live AI or child-data transmission. Prior held PR13/14 and native acceptance gaps are preserved. Integration owner: parent agent. New isolated branch feat/learning-growth.

## Contract and acceptance

- Retain every beginner activity and validated saved round. Add two clearly described concept stages to all twelve learning games, with free parent choice and help at every stage. Three-question rounds are untimed, answers settle before explicit Next/Finish, and assisted completion remains successful practice.
- Numeric tracks: Shell Math make-ten/place value/equal groups; Number Hop chosen jumps, crossing tens, unknown starts; Quick Practice varied unknown positions, equivalent equations/two-step problems; Reef Race predicted landings, skip-count and route reasoning; Island Market exchanging tens/ones, multi-step orders and payment strategies.
- Literacy tracks: Sound Boat two-syllable words, endings and word families; Which One multi-condition instructions, references and cause/effect; Turtle Tales sequencing, inference and textual evidence; Hafa Adai practical contextual choices using only the existing reviewed vocabulary, no invented CHamoru phrases or unreviewed spoken pronunciation.
- Discovery tracks: Tide Pool controlled comparisons and transfer; Float or Sink material/shape/air comparisons, trials and capacity; Crab Commands debugging, block repeats and equivalent programs. Scripted models must describe their limits rather than claim a real physics simulation.
- Additive `LearnOptions.stage?: GrowthStage` uses `stretch|deep`. Absent stage routes to the original engine/state. Pure growth content and replay engine are independent of React. All hints, validation, feedback, speech and scoring derive from the same questions. Unknown stages/IDs/actions are rejected; restores preserve originals on failure.
- Worker modules are `src/learn/growth/numbers.ts`, `NumbersVisual.tsx`, `literacy.ts`, `LiteracyVisual.tsx` and their focused tests. Parent owns shared types/engine/registries/Frame, all Store/profile/save changes, discovery tracks, audio, QA/release. Workers may not edit protected integration files or shared runtime resources.
- A track contains a stable bank of at least twelve substantive questions per stage. Selection is bounded and interleaves skills. Choice values are unique, the answer exists exactly once, explanations substantiate it. Word/program construction uses tiles joined with `|`. Visuals must not expose answers before a try/help. Interactive demonstrations invoke `onHelp` and count as assistance.
- Optional local learners: retain legacy family practice separately, select a learner without accounts, preserve session ownership on resume and guard against stale profile/restore callbacks. Record specific independently completed and helped tasks without asserting mastery. Suggestions require independent work across sessions/days and never advance/lock automatically. Together/versus practice does not establish individual proficiency.
- Separate narration, effects, automatic speech and narration volume. Explicit tap-to-hear stays available when automatic speech is off. Mute/background/navigation/restore cancel playback and queued speech. No stale callback may restart muted audio. Keep offline text alternatives and no required network playback.
- Produce warmer narration, normalize volume, shorten coaching, audition candidates before the final default. Provider access/rights and listening evidence must be explicit. Future CHamoru speech requires native review. Private family beta only; public release remains separate.
- Optional pre-game practice follows grown-up-selected skills/ranges, always accepts help, and never interrupts saved/in-progress games. Validate legacy within10/20 settings and saves.

## QA ledger (agent executed unless noted)

All cases initially not_run. Record exact commit/build, actual UI and persisted outcome, evidence, viewport/device and limitations. Automated tests do not replace runtime scenarios.

| ID | Required scenario | Status |
| --- | --- | --- |
| G01 | Original twelve activities and existing saves continue; new stages freely selectable per game | not_run |
| G02 | Both new stages of all twelve: first action, wrong answer, help, correct answer, explicit next and finish | not_run |
| G03 | Phone/tablet controls reachable; long text/tiles, landscape and larger text | not_run |
| G04 | Resume after reload/background; replay; switch stage without silently replacing a round | not_run |
| G05 | Learner ownership, independent/helped records, no family-to-child migration or shared-player mastery | not_run |
| G06 | Restore/replace/switch learner invalidates pending callbacks and suggestions; malformed data preserves originals | not_run |
| G07 | Narration/effects/autoplay/volume independence; explicit hear; mute/background/navigation cancellation | not_run |
| G08 | Offline all original/new speech present; voice samples and device listening | not_run |
| G09 | Optional math/reading/mixed practice, help, cancel, bypass; saved Continue and racer/nearby safety | not_run |
| G10 | Full check, Doctor, advisory design scan, final independent code review and required CI | not_run |
| G11 | Exact unused next private build, signed source/assets, Apple processing and existing tester availability | not_run |

Physical child comfort, actual touch/VoiceOver and Stassie's independent play are operator acceptance, reported separately from agent checks. Sources for the progression direction: Common Core 2.NBT, RF.2 and RL.2; IES elementary math guide (2021). This is practice content, not a certified curriculum or proficiency assessment.
