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
- Review: implementation worker self-review only; independent final-code review and CI belong to the lead.
