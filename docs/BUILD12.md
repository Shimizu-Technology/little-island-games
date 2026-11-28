# Build 12: Kitchen crash and beach swimming

Implementation branch: `p4/b12-kitchen-crash-fix-and-beach-floaty-swim`, based on `program/4.0` at `217ca57d1327374c135a4d9ad3bbfc6b13d00efb`. Draft PR targets `program/4.0`; no public release or TestFlight upload is part of this implementation.

## Context and acceptance

Sources: Leon and Stassie's Build 11 physical-device feedback in the implementation brief, `docs/PRD.md`, `docs/QA.md`, `docs/QA_MATRIX.md`, and the existing Home scene engine. Little Island is an offline family game collection. Home edits must remain reversible, versioned and validated; the 180 published save banks are immutable.

Required affected journeys: rapid Kitchen dragging near trash/appliances/portals without unsafe UI-thread calls; floaty-to-friend and friend-to-floaty; move a wearer around either lagoon; take off or swap the ring; free swimming; tap/drop splash; Undo/Redo and reload; Reduce Motion and hidden-room/unmount cleanup. Agent executes automated/browser checks; Leon/Stassie retain physical iPhone/iPad acceptance.

The floaty's saved relationship uses the existing `holding` field. Runtime scene metadata distinguishes wearing it from holding a hand prop. The character paints the back and front halves around their waist, and a reachable rim still picks the ring independently. Seating a wearer takes it off in the same undoable edit. The additive water-area change accepts higher lagoon positions without changing a save envelope or published bank.

Motion moments: putting on a floaty settles it around the waist; entering or tapping water gives a short splash, bubbles, sparkle, cheerful expression and sound. Visible swimmers bob/sway with concentric ripples and paddling droplets. Reduce Motion leaves still water cues; room visibility/unmount cancels loop clocks.

## Crash prevention

`resolve.ts` reads serialized body capabilities instead of calling JS-only `capabilityOf` from `eligible`. Empty drinks retain separate serialized discard eligibility, without becoming drinkable. The room-hop path checks both the destination room and the resolved proposal before constructing a transfer.

The production Babel audit transforms every Home TS/TSX module with `react-native-worklets/plugin`, verifies worklet markers for captured app functions (including callbacks auto-workletized by animation hooks and gestures), and follows imported helpers. Reanimated UI primitives and callbacks explicitly scheduled through `runOnJS` are the deliberate runtime boundary. A negative test restores the exact Build 11 call and requires the audit to reject it. Runtime closure inspection also asserts `__workletHash` recursively for loaded pure worklets, then runs real resolve/apply transactions near every Kitchen target and both lagoons.

This is regression evidence for UI-thread safety, not proof of native Hermes/Fabric behavior. The final iOS build still needs physical-device acceptance.

## Verification ledger

Evidence directory: `/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/v4/b12-kitchen-fix-beach-swim/`.

- Automated: 109 Home/protected files, 1,249 passed and two existing skipped tests. The two skipped cases are the existing opt-in hull raster audit; see `tests-final.log`. Additional worklet negative cases were then run separately after strengthening the audit's typed component ports. No protected tests or restricted Library/word-game files changed.
- `npx tsc --noEmit`, `CI=1 npx expo lint`, `npm run doctor` (21/21), `npm run save:catalog` (180 unchanged banks), web export and word-export guard passed. The local word receipt explicitly reports `policyDataChecked: false` because no private policy lock is configured; CI must supply that gate.
- Production audit: 296 worklets and 561 verified callable capture references, including the real providers of callbacks passed through interaction/meal component ports. The audit rejects unknown direct callable captures, the original Kitchen call, unsafe auto-worklet hook calls, and removal of a port provider's worklet tag.
- Advisory Impeccable scan: `[]`; not treated as acceptance.
- Browser: isolated Chromium at 1280×900, 1.5× screenshots, local production web export (`d07c9f8736f9` offline shell), fresh synthetic local world. Executed real pointer drags to put on the ring, move the wearer to two ocean positions, reload the saved wearer, transfer to Cocos Island and swim, tap to splash, take off using the quick action, and Undo. Browser-only reverse direction/swapping is covered by runtime/engine tests rather than claimed as an executed browser journey.
- Kitchen browser: brought Islander through the friends drawer, moved her, dragged a banana near the permanent trash target and a mango near the stove. No page exceptions were observed. Browser behavior cannot reproduce or certify Hermes/Fabric crash freedom.
- Requested screenshots: `01-beach-floaty-worn-swimming.png`, `02-beach-floaty-moved-ocean.png`, `03-cocos-island-swimming.png`, `04-kitchen-moving-items.png`. Supporting commands, receipts and browser logs are beside them.
- Native iOS/iPadOS Hermes/Fabric: not run in this implementation session; physical TestFlight retest remains required.
- Review: independent cross-family R1 by Gemini 4 Neon on `1a2ba151669eb60ce0af7801ab3fb03b024e21f9` requested changes. The revision below addresses its five findings; a final-head independent recheck and CI remain lead-owned.


## R1 revision

The full review is preserved as `REVIEW-R1.md` in the evidence directory. The original test selection omitted `ocean-beach-cocos-easter-eggs.test.tsx`; the revision gate includes every Home, Ocean and Beach test plus the protected guard suites.

| Finding | Change | Regression evidence |
| --- | --- | --- |
| R1-01 | Updated the unprotected Beach expectation to standing on the floor while wearing the ring; added movement together in water. | Entire Ocean/Beach feature file, included in the combined run. |
| R1-02 | Explicit standalone ring art for drag roots and thumbnails. Every resting waist layer reads the ring's presented/hidden state on the UI thread. Carried children remain suppressed. | Real `DragOverlay` and `SceneView` rendering tests cover dragging, settling, readiness and cancellation. |
| R1-03 | Ring chooser uses standalone artwork; wearer drawer badges omit the redundant held ring. Socket pictures remove the ring, while a ring destination depicts one wearer. | Actual Destinations, FriendDrawer and PosePicture rendering, plus all compatible socket preview plans. |
| R1-04 | Ring geometry centres on the upright body bounds, limits carry size to standing proportions, and clamps the full wearer at room edges. Seated, lying and bathing avatars do not offer or accept a wear target. | Pip geometry in every facing/base, all-slot lagoon moves, and valid lying/bathing/sitting saves with stale target rejection. |
| R1-05 | Quick room/floaty actions stay hidden while the Cocos discovery toast is present, then return after dismissal. | Live HomeScreen selection, toast and dismissal regression. |

Final R1 check results and refreshed browser evidence are recorded in `r1-*.log` and `r1-verification.json` beside the three refreshed Beach screenshots. Native Hermes/Fabric and physical-family acceptance remain separate from these web/runtime checks.

R1 final automated run: 115 files, 1,301 passed and two existing opt-in hull-raster cases skipped (`r1-tests-final.log`). Typecheck, Expo lint, the 180-bank immutable save catalog, production web export and the word-export guard passed. The production audit covers 298 worklets and 567 callable capture references (`r1-worklets.log`). The local word guard still reports no private policy lock; that full policy gate remains for CI.

R1 browser acceptance: on the final production web export (`34455d8d3aa9` offline shell), real pointer pickup of the worn rim showed a visible loose-ring overlay while all original waist layers had zero opacity. Dropping and Undo restored the expected state. The ring chooser contains a loaded image; 16 sitting/lying/bathing destination pictures have no worn-ring layers. The friend drawer has a worn avatar and no redundant empty held badge. The Cocos toast and Take off action are mutually exclusive, and the action returns after toast dismissal. All three requested Beach screenshots were refreshed and inspected; `r1-drag-off-visible.png` and `r1-friend-drawer.png` provide extra evidence. No browser page exceptions were observed.

R1 cleanup: the static server and browser were closed, lifecycle status has no owned resources, and `dist/` and task scratch files were removed. The clean worktree remains on the draft PR branch for lead review.
