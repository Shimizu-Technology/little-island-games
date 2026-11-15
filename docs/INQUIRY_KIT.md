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
3. **Result.** A reach plan that missed shows what the model did, then asks for a new plan (`revise`). An observe prediction that missed shows "Surprise!" and moves on: a surprise is a discovery.
4. **Explain.** Pick the reason that fits the model. Each wrong reason counts once and stays greyed out.
5. **Next.** The rule is shown with the accepted reason.

The saved round stores the draft on screen and a short history of evidence: tests (with the prediction and the setup that was tested), revisions, explanations, hints and Next. `validState` replays the history on every load, so a saved round can never say something the rules would not allow. The longest possible round is bounded by `investigationBound` (one test per distinct setup, three hints, each reason once) and the content test proves every round fits `HISTORY_CAP` (160 actions, well under a session's 4,096 bytes).

### Hints

Three stages from the same investigation the checks use: the clue, the model's rule, then an answer. In setup the answer is the outcome the model will show (observe) or one setup that works, found by searching the model (`solve`). In the explain step it is the reason. A hint is help.

### Stars

`clean(progress, level)` is the one rule. Work stays independent when an investigation has no hints and no wrong reasons. At **Levels 4 and 5** (`strictLevel`) each investigation's first test must also match the prediction or reach the goal. The board marks the round helped the moment the engine says work stopped being independent, through the frame's existing `assistance()`; a wrong reason also records `practice(skill, false)`. Stars then come from the unchanged School rule (`schoolProgress.ts`): helped finishes count, with one star.

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
| 4 Gravity lab | Predict a crate's weight on another world; plan a fair test (change only the mass); find a **mystery world** from its weight | Fair tests and identifying from evidence; strict stars |
| 5 Light, tilt & eclipses | Predict light-time at a distance and the season from tilt and leaning; make a solar or lunar eclipse; the **eclipse twist** (Moon in place but the orbit tilted) | Two conditions at once; strict stars |

A child who finds Level 3 too easy gets a real step up at Level 4: a fair test needs one variable held while another changes, and the mystery world can only be found by comparing a measured weight with the model's gravity.

**Numbers.** Weights use `weightNewtons` and the approximate gravity Star Station already showed (Earth 9.81, Moon 1.62, Mars 3.71, Jupiter 23.1 m/s²), rounded to 0.1 N. Moon readings use `visibleMoonPercent`. Light-times use `lightMinutes` (8.3 minutes per AU), rounded to 0.1. Planet widths use the relative circle sizes the old planet scene drew (Earth 3.2). "About the same" means less than a tenth wider; it matches real diameters for every pair (Venus/Earth, Uranus/Neptune).

**Wording.** Every rule and reading names the model ("in this model", "in the size model", "Illustrative model: sizes and distances are not to scale", "this is a model scale"). The drawing's caption always reads "Illustrative model". Facts come from Star Station's existing reviewed facts; no internet claims were added. The eclipse rule keeps "Never look at the Sun without approved protection."

**Dumb players.** Tests play every seed with guess-and-check (every setup in order from the start, reasons in order) and with fixed taps (always choice 0, 1, 2 or 3). None earns independent work at Level 4 or 5 over 1,000 seeds each (the test), nor over 4,000 seeds at any level (measured). A random guesser earned it in 0 of 4,000 rounds at Level 4 and 1 of 4,000 at Level 5; the test requires under 0.2%. At Levels 1–3 a random guesser succeeds in about 1 to 2% of rounds (38 to 68 of 4,000), since all four reasons must be right first time. Each strict round's observe answers are built so no fixed guess is right every time, and every reach investigation starts on a setup that does not work.

## Saves (K8)

Fresh rounds are version 2 (`InquiryState`). A saved version-1 Star Station round still validates through the shared science engine (`legacyEngine`) and resumes on the shared science board with its legacy layout, inside its own geometry-off provider. School stars are unchanged: the frame credits rounds by the same rule for both versions. Star Station keeps `ownLevels`; nothing is flipped.

## Layout

Star Station is a measured School board (`SCHOOL_BOARD_MIN['space-station'] = 140`). The drawing gives up height before Test leaves the measured space, and Test, the result and the explanation are inside `BoardPrimary`. Choice tiles keep a 48-pt minimum and their words fit the tile at AX sizes (`wordFitMultiplier`); the Moon's eight spots stay in two rows. Because it is now a measured board, it also gets the AX entry reveal the other measured boards have (see "Contract note" in the S1a report).

## Speech

Every goal (`title. question`), every rule and the new help line are in `scripts/learn/s1a-inquiry.json`, staged design-only (`.stage`). Narration buttons appear only when a voiced line resolves (`hasSpeech`), so nothing plays silence before the lead generates audio. Regenerate the list with `LITTLE_ISLAND_WRITE_INQUIRY_SPEECH=1 npx vitest run tests/s1a-inquiry.test.ts`.

## Not here

The other science boards (Weather Watch, Food Web, Float/Sink, Tide Pool) are not moved onto the kit yet. No Challenge entry, banks or dares. No timers: nothing in the kit schedules anything.
