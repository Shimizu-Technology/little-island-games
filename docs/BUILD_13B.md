# Build 13B — beach water and native board gestures

Implemented from `fa5547e5199371298b4795d6854bde416cf2a504` on `program/4.0`, for Leon’s iPhone TestFlight screenshots. Little Island remains an offline family game collection; this draft does not authorize public distribution.

Swimming bodies now meet the painted bay at the waist or floaty rim. The lower body is clipped, with a faint turquoise silhouette and foreground foam/ripples. Sand and airborne pickup retain the full body. Derived picking, held-item offsets and pickup bindings follow the painted position. The published save floor remains `256`; new drops and older saved positions render below the horizon at `268` or lower. Motion still follows Home visibility and Reduce Motion.

The native gesture adapter uses RNGH’s zero-distance Pan recognizer before the enclosing native scroll view’s movement threshold. Game callbacks run on JS; existing parent scroll locks remain. Web retains its responder path and `touchAction: none`. Disabled, tap/accessibility and explicit board-pan modes retain their existing controls.

| Surface | Audit result |
| --- | --- |
| Word Hunt | Native pan; tracing begin/release/cancel and tap mode retained |
| Word Search | Native pan with independent pointer identities for two-person tablet play |
| Bridges; LineBoard (Loop/Pearl Loop); GridShell | Native pan; preview, paint, two-finger board pan and page-lock callbacks retained |
| Picture Grid; Solitaire | Native pan; release coordinates and inner scroll locks retained |
| Shape Shift current/challenge/legacy; program palette; Letter Lagoon trace | Native pan; drop/cancel and accessible alternatives retained |
| Library Earth lab | Native pan; tap and horizontal swipe turn, vertical drag does not turn |
| Library Maker | Already uses native zero-distance Pan; unchanged |
| Slip Tide; Times Tide | Already use native Pan (3/2-point thresholds); unchanged |
| Maze; Crossword; Canoe Seats | Tap/keyboard/accessibility controls, no JS drag surface to upgrade |
| Reader/Look & Listen page swipes; sheet dismissal | Navigation gestures, outside the game-board drag scope; unchanged |

Agent QA uses isolated saves and a 375×812 Chromium viewport. Evidence is in the sibling artifacts folder `v4/b13b-water-and-scroll/`: Leon’s original screenshot, four requested scene captures, browser receipts and verification logs. Browser captures do not establish installed-iOS recognizer behavior. Native iPhone vertical/diagonal traces, two-person tablet Word Search, physical Reduce Motion and family acceptance remain lead/operator checks before release. No simulator or TestFlight build was produced.

The final verification receipt records typecheck, Expo lint, Doctor, immutable save catalog, production worklet closure audit, web export/word guard, and the affected Home/Word Games/puzzle/Library/protected-test regressions. PR #150 paths and all protected tests remain untouched. Independent final review and CI belong to the lead; this PR remains a draft.

## Independent R1 corrections

Gemini 4 Neon’s review of `35a043c3` found native event-sequence errors and three failing suites omitted by the original affected-file filter. All seven findings are addressed in the follow-up:

- Pan and Tap race with one shared grant/terminal transaction. A stationary iOS pan failure leaves Tap eligible; cancelled active drags terminate without committing.
- Raw touch-up uses the remaining touch count, rather than the iOS list that still includes the lifted pointer.
- Native hit regions reject starts outside exposed movable Solitaire cards or Bridges islands on the UI thread. Stock/empty-place/water taps remain available through Tap; their swipes can scroll. Earth uses horizontal activation and vertical failure criteria.
- Web/Node adapters return the original child View. Adapter-only props never reach it; GridShell’s protected responder slice and Cove/Challenge render-tree hashes remain unchanged.
- Mock-safe style helpers replace the two new Platform accesses. Seat/vehicle socket occupants do not receive swimmer geometry or overlays.

The R1 receipt records the requested targeted run, the full `npm test` result, and every engineering gate. `tests/word-search-scroll.test.tsx` is absent from this checkout; the existing Word Search suites run in the full suite. Native event sequences are covered by component tests and native hit-gate callbacks; installed-device gesture arbitration still requires lead/operator acceptance.
