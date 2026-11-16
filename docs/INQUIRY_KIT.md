# K6 inquiry kit and Star Station (S1a)

The inquiry kit turns a science board into predict → test → explain work around the model it already has. Star Station (SC-09) is the first game on it. Sources: ledger rows K6, SC-09 and K8, PLAN §1 and §16, and the S1a brief (16 November 2026).

## Why

Leon asked for games that get "progressively harder… for all games" and for real learning for Stassie (2nd grade) and older kids. Before this slice, Star Station's goal text often stated the answer ("Set mass to 18 kg and select the Moon"), the model showed the result while the child was still choosing, and Level 5 asked for the same tapping as Level 1.

## The kit (`src/learn/inquiry/`)

| File | What it holds |
| --- | --- |
| `engine.ts` | Pure. The `Investigation` shape, the saved `InquiryState` (version 2), `replay`, `move`, `validState`, `clean` (the star rule), `solve`, `hintText`, `testedBefore`, `undo`, `investigationBound` and `describeSetup` |
| `InquiryBoard.tsx` | The School board: step line, measured model drawing, setup controls, prediction, Test, result, explanation, Undo, Hint and narration buttons |
| `speech.ts` | `inquirySpeechKey(text)`, a stable hash of the exact sentence |

No React, clocks or `Math.random` in `engine.ts`. The board, the hints and the test bots all run the same functions.

### An investigation

A game supplies a list of investigations. Each has:

- **controls** with options. A `fixed` control shows the setup but cannot change;
- **outcomes**, in the model's order;
- **observe(settings)**, the model. It returns the outcome and a `reading` sentence. Every number a child sees comes from here;
- a **question**. It never names the outcome, the setting that reaches it, or the reason;
- an **explain** step: a prompt, three reasons and the one that fits the model;
- a **clue** (where to look) and a **rule** (the model's rule, which says it is a model);
- optionally **given**: evidence shown before any test, such as the mystery world's weight. Never the answer.

There are two kinds:

- **observe**: the setup is given. The child picks a prediction, then tests.
- **reach**: the goal names an outcome ("make a lunar eclipse"). The child plans a setup. The plan is the prediction.

### Steps and checks

1. **Setup.** Changing a control or the prediction is free and is not saved as evidence. Undo puts back an earlier draft, only in this step.
2. **Test.** An observe test needs a prediction. A setup can be tested once per investigation, so repeating a failed plan adds nothing. The result appears only after the test: before it, the drawing and its VoiceOver label show the setup and say the result is hidden.
3. **Result.** A reach plan that missed shows what the model did, then asks for a new plan (`revise`). After a revision the drawing and its VoiceOver label show no result for the new draft; the earlier result stays visible only as "Last test (its own tested settings): reading" (`Progress.previous`). An observe prediction that missed shows "Surprise!" and moves on: a surprise is a discovery.
4. **Explain.** Pick the reason that fits the model. Each wrong reason counts once and stays greyed out.
5. **Next.** The rule is shown with the accepted reason.

The saved round stores the draft on screen and a short history of evidence: tests (with the prediction and the setup that was tested), revisions, explanations, hints and Next. `validState` replays the history on every load, so a saved round can never say something the rules would not allow. The longest possible round is bounded by `investigationBound` (one test per distinct setup, three hints, each reason once) and the content test proves every round fits `HISTORY_CAP` (160 actions, well under a session's 4,096 bytes).

### Hints

Three stages from the same investigation the checks use: the clue, the model's rule, then an answer. In setup the answer is the outcome the model will show (observe) or one setup that works, found by searching the model (`solve`). In the explain step it is the reason. A hint is help.

### Stars

`clean(progress, level)` is the one rule. Work stays independent when an investigation has no hints and no wrong reasons. At **Levels 4 and 5** (`strictLevel`) each investigation's first test must also match the prediction or plan. The board marks the round helped the moment the replay says work is not independent, through the frame's existing `assistance()`; a wrong reason also records `practice(skill, false)`. **The replay is authoritative at the credit boundary:** the engine's optional `helpedWork(state, options)` reports a version-2 history that shows help, and School credit (`independentRound`, `recordLevelRound`) treats such a round as helped whatever its saved `levelHelped` flag says. The saved round is never rewritten for this; a restored round with a contradictory flag is marked helped on its next move. Version-1 rounds keep their own evidence (the flag).

Levels 1–3 forgive a surprising prediction, so a curious child is not punished for being wrong. A reach plan that misses at Levels 1–3 is also forgiven.

### Free exploring

The kit grades only Test, explanations and hints. Changing a control before testing is never scored, and the kit does not touch any free-play surface.

## Star Station (SC-09)

`src/learn/games/space-station/`: `model.ts` (the model functions), `investigations.ts` (seeded content), `Scene.tsx` (the drawing), `engine.ts` and `view.tsx` (K8 dispatch).

| Level | What the child does | New demand |
| --- | --- | --- |
| 1 Day & night | Predict what the island has after a turn; turn Earth to bring night or day | Predict from a picture |
| 2 Moon phases | Predict how the Moon looks from Earth at a spot in its orbit; move it to hide or show the lit half | Predict from a position in an orbit |
| 3 Planet builder | Predict which of two planets is wider in the size model; find a planet more than twice Earth's width, or narrower | Compare against a reference and sort rocky and giant planets |
| 4 Gravity lab | Predict a crate's weight on another world; plan a fair test (heavier or lighter, and put the world back when the plan starts elsewhere); find a **mystery world** from its weight; compare two worlds | Fair tests and identifying from evidence; strict stars |
| 5 Light, tilt & eclipses | Predict light-time at a distance and the season from tilt and leaning; make a solar or lunar eclipse; the **eclipse check** (which body is in the middle, and whether the Moon is on the Sun–Earth line right now) | Two conditions at once; strict stars |

A child who finds Level 3 too easy gets a real step up at Level 4: a fair test needs one variable held while another changes, and the mystery world can only be found by comparing a measured weight with the model's gravity.

**Numbers.** Weights use `weightNewtons` and the approximate gravity Star Station already showed (Earth 9.81, Moon 1.62, Mars 3.71, Jupiter 23.1 m/s²), rounded to 0.1 N. Moon readings use `visibleMoonPercent`. Light-times use `lightMinutes` (8.3 minutes per AU), rounded to 0.1. Planet widths use the relative circle sizes the old planet scene drew (Earth 3.2). "About the same" means less than a tenth wider; it matches real diameters for every pair (Venus/Earth, Uranus/Neptune).

**Wording.** Every rule and reading names the model ("in this model", "in the size model", "Illustrative model: sizes and distances are not to scale", "this is a model scale"). The drawing's caption always reads "Illustrative model". Facts come from Star Station's existing reviewed facts; no internet claims were added. The eclipse rule keeps "Never look at the Sun without approved protection."

**Planet widths.** Any planet whose circle is smaller than Earth's is "narrower than Earth", Venus included (3 against 3.2; NASA lists 12,104 km against 12,756 km). There is no tolerance band anywhere: in a pair, whichever circle is wider is wider, however close. Before Test the hidden planet never sets the drawing's scale, so Earth's reference circle keeps one size whatever is chosen.

**Eclipses.** The Moon's orbit is tilted about 5° to Earth's path around the Sun, so in most months the new or full Moon passes above or below the Sun–Earth line and there is no eclipse. Eclipses happen only when the Moon is lined up near a node, where its tilted path crosses that line (an eclipse season). The model never offers "untilted": its two conditions are which body is in the middle (Moon between Sun and Earth, Moon behind Earth, or off to the side) and **the Moon's path right now** ("Crosses the line" or "Passes above or below"). A miss is explained by this position (the Moon passed above the line, or above Earth's shadow), never by tilt alone. Sources: [NASA, eclipse periodicity, seasons and nodes](https://eclipse.gsfc.nasa.gov/SEsaros/SEperiodicity.html) and [NASA, Eclipses and the Moon](https://science.nasa.gov/moon/eclipses/). Every eclipse sentence (rule, clue, questions, readings, reasons and distractors) was re-read against these.

**No habit earns the top rungs** (`tests/s1a-habits.test.ts`). At Levels 4 and 5 the four investigations come in a seeded order; prediction tiles and plan options are shown in a seeded order, separate from the model's order; each answer varies from round to round (heavier or lighter, every world, solar, lunar or no eclipse); and the right reason is the longest, middle or shortest of the three equally often (`balancedWhy` chooses from pools of wordings with overlapping lengths) and lands in any place. The test searches every fixed habit exhaustively on the review's 8,192 seeds: a prediction tile by position or label, a fixed reach plan (each control left alone, set to a position or set to a label), and a reason picked by position, letter-length rank or word-count rank, keyed by step number or by investigation type. The lead's threshold is 0.5%. Measured best: Level 4 0.05% (step) and 0.17% (type); Level 5 0.09% (step) and 0.21% (type). The reviewer's public-information adversary earns 0 of 8,192 at both levels. A reasoning strategy earns every round.

## Saves (K8)

Fresh rounds are version 2 (`InquiryState`). A saved version-1 Star Station round still validates through the shared science engine (`legacyEngine`) and resumes on the shared science board with its legacy layout, inside its own geometry-off provider. School stars are unchanged: the frame credits rounds by the same rule for both versions. Star Station keeps `ownLevels`; nothing is flipped.

## Layout

Star Station is a measured School board (`SCHOOL_BOARD_MIN['space-station'] = 140`). The drawing gives up height before Test leaves the measured space; Test, the result and the reasons are inside `BoardPrimary`. Once tested, the result and the reasons sit directly under the drawing. Every SVG label is drawn at the School floor (13 pt, 19.5 pt at AX) by dividing by the scene's scale, with no length clamp; labels inside the drawing are short (at most eight characters, such as a number, a mass, a world or "Mystery") and placed where they fit at that size. Longer words ("Right: the Moon as seen from Earth", the island's time of day, the season, the Moon's path) are a legend below the drawing in text that scales and wraps.

At AX sizes (`atLarge`): the step line names only the current step; the title, question, prompts, result text, control names and buttons stop at `CHROME_MAX` (1.5×) so the drawing and Test stay in view together; Hear it reads them aloud. Choice tiles keep a 48-pt minimum, their words fit the tile (`wordFitMultiplier`), short options (a mass, a world, a turn) share one row, three to five outcomes keep at least 96 pt per tile, and reasons (sentences) stack one per row. Measured natively on iPhone 15 / iOS 18.5 and iPad mini 6 / iOS 26.5 at default and AX5: the setup step of every level shows the drawing and Test together.

Because Star Station is now a measured board, it also gets the AX entry and rotation reveal the other measured boards have, recorded in `docs/CONTRACT_4.0.md` (F-frame-2 entry) and proved in `tests/r0b-frame-largest-text.test.tsx`. A new round started from the options sheet begins at the page top, as the frame does for every board; the reveal applies on entry, rotation and each following step.

## Speech

Every goal (`title. question`), every rule and the new help line are in `scripts/learn/s1a-inquiry.json`, staged design-only (`.stage`). Narration buttons appear only when a voiced line resolves (`hasSpeech`), so nothing plays silence before the lead generates audio. Regenerate the list with `LITTLE_ISLAND_WRITE_INQUIRY_SPEECH=1 npx vitest run tests/s1a-inquiry.test.ts`.

## Not here

The other science boards (Weather Watch, Food Web, Float/Sink, Tide Pool) are not moved onto the kit yet. No Challenge entry, banks or dares. No timers: nothing in the kit schedules anything.
