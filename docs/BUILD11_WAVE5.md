# Build 11 Wave 5: Home and groceries

Base: `ec830954` on `program/4.0`, including Waves 1–4. Executor: implementation agent. Draft PR only; no merge, public deployment, or store release.

Little Island is an offline family game collection. Home lets a child dress and move family characters, keep a room, and play with food. The relevant contract comes from `PRD.md`, `QA.md`, the Home scene engine, and the Wave 2 fridge and Wave 3 Places implementations. Historical project context in Brain Dump's 2026-11-26 portfolio audit identifies family TestFlight use; it does not establish the current delivered build. This task changes source only.

The change uses the existing version 4 item, container, cooked-food, and Undo representations. The Market is a shopping destination in Places; its four groceries live in a normal Kitchen Carry Basket, so leaving or reopening the Market preserves them without introducing a second inventory schema. Unpacking fills only free fridge slots and leaves overflow in the basket. The permanent pedal bin is room scenery, with an edible-only target; furniture and characters cannot be discarded. Stove drops light the burner in the accepted drop transaction, and an authored standing chef socket supports every Islander.

Motion confirms two actions: approaching the bin crossfades its lid over 120 ms; moving between rooms follows the existing eased camera/door veil. Reduced motion makes the lid switch immediate. Existing steam, sizzle and sparkles confirm cooking. Closet uses a windowed tile list and crop-specific thumbnail signatures; appearance changes flow through a stable character renderer. These code changes do not establish physical iPhone frame rates.

Required affected-flow acceptance:

| Case | Expected result | Agent evidence/status |
| --- | --- | --- |
| W5-01 | Repeated rapid feeding and interrupted native presentation recover without Undo; later input works | Automated hook regression passed, including lost commit acknowledgement |
| W5-02 | Dropped/zero/cancelled touches and a pan interruption return orphaned avatars to supported positions | Automated hook regression passed |
| W5-03 | Pantry food dropped in pan lights stove, cooks, and shows sizzle/steam; Islander can stand at stove; Undo works | Engine regression passed; browser scenarios and screenshots recorded below |
| W5-04 | Pedal bin opens only for edible drops; discard and relaunch Undo restore exact item; permanent objects refused | Engine regression passed; browser scenarios and screenshots recorded below |
| W5-05 | Ladder and doorway tap/drag move characters and held items, while existing arrows/Friends/Whole House remain usable | Engine regression passed; browser scenarios and screenshots recorded below |
| W5-06 | Market shelves add by tap/drag, basket stops at four, put-back and Undo work, Carry Home preserves groceries, fridge stops at eight | Engine regression passed; browser scenarios and screenshots recorded below |
| W5-07 | Closet fits phone/tablet/landscape and updates the live look without remounting the renderer | Renderer mount regression passed; phone/tablet/landscape browser QA passed |

Automated validation and final browser evidence are recorded below as they complete. Native gesture interruption, audible iPhone sizzle, physical 60 fps, and independent family-device acceptance remain separate operator checks under `QA.md`.

Assets: the approved market JPEG was converted to optimized WebP. Built-in imagegen performed background extraction on each approved bin JPEG, with prompts to preserve the design, contours, watercolor texture, proportions and orientation and remove only the white studio backdrop with antialiased alpha. The resulting transparent images were converted to WebP under `assets/home/props/`. No new food word lists or save-bank edits are required.


Agent QA used an isolated Chromium context and the local production web export on port 43827, with service workers disabled. Fixtures were a new family Home and groceries added through the Market UI. Viewports: 1024×768 tablet, 390×844 phone, and 844×390 short landscape. Browser keyboard activation, pointer drags and taps exercised the same proposal engine as Home. The requested native device tests were not run in this source-only task.

- W5-01/02: six runtime hook regressions cover eight rapid feeds without native meal completion, a lost JS commit callback, zero-touch/cancel/pan interruptions, and a real drag onto the ladder. These are deterministic regressions; physical iOS dropped-touch reproduction remains a family-device check.
- W5-03/04: an Islander was moved to the authored chef socket. Dragging a fruit-bowl portion over the bin opened the lid; closed/open screenshots show the transparent assets at Kitchen scale. Food was placed into the stove through the destination UI; the accepted save lit the burner and changed the ingredient to cooked. Browser QA found pan food painted behind the stove; the final patch puts the pan above its stove and adds an order assertion. Engine and history tests verify edible-only disposal and exact saved Undo restoration.
- W5-05: the scene ladder/door cues and the 48-point selected-friend rail use shared destinations. The short-landscape rail moved the Islander from Kitchen to Beach hut and followed her; the resulting saved character was grounded in Beach hut. Whole House and Friends remain available. A runtime regression separately drags an Islander onto the ladder and checks the destination and retired capture.
- W5-06: Market taps filled the four-slot basket, refused a fifth grocery, supported put-back/Undo, and returned groceries to Kitchen. Stock fridge filled the existing six groceries to eight and left overflow in the basket. A second browser run unpacked two groceries, verified the open fridge label at eight, and left no overflow. Short landscape now places basket/actions alongside shelves so both remain usable.
- W5-07: Closet was inspected in all three viewports and a style was changed. On the compact phone, FlatList mounted 12 tiles initially and 16 after batching from 30 available choices. A renderer regression verifies that changing the look updates the existing live character without remounting its body. No physical frame-rate claim is made.

Evidence lives outside the repository at `/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/v4/b11-home-wave5/`: `kitchen-trash-closed.png`, `kitchen-trash-open.png`, `kitchen-cooking.png`, `market-basket-full.png`, `market-phone.png`, `market-phone-landscape.png`, `ladder-room-hop.png`, `quick-room-hop-phone-landscape.png`, and the three `closet-*.png` images. Only the final production export is used for the final cooking and landscape Market captures.

The first full `npm run check` passed registry/save/puzzle/type/lint gates, then found three test files failing: chef geometry had enlarged the stove's placement silhouette; two existing render harnesses needed pure default-look/SVG dependencies. Those issues were fixed without editing protected tests. The three-file retest passed 23 tests. The final pan-order and rendering/runtime retest passed 107 tests across four files. The later full run found two old pan-paint assertions that required the food to stay behind its stove. Those assertions were updated for the visible pan behavior, while retaining the fridge-in-front occlusion check; the five-file final cooking/runtime/renderer retest passed 136 tests. Full-suite and final export results follow below.

Remaining acceptance is explicit: native iPhone/iPad gesture interruption, audio playback, installed-build performance, and Stassie's family-device experience are not established by web resizing or hook tests. There is no EAS build, TestFlight submission, public deployment, or store release in this draft PR.


Final web QA on source `e19982d8` and offline export `9a071295dd12` confirmed that one Market drag adds exactly one grocery (an earlier drag also fired a tap and added two; the final guard suppresses that follow-on tap). Independent taps filled the basket to four; a fifth was refused. Put-back followed by the Market's Undo restored the grocery. Three carried groceries filled two free fridge slots and retained one in the basket. The cooked banana stayed visible above the lit stove beside the chef, was eaten, was restored by Undo, was discarded through the pedal bin, and was restored by Undo again. No JavaScript page errors occurred in the final browser context. The screenshot browser and preview tab were closed after QA.


Validation completed after implementation:

| Gate | Result |
| --- | --- |
| `npm ci` | Passed using the lockfile; no dependency changes |
| Registry and puzzle gates inside `npm run check` | Passed: 35 School games, 33 Challenge adapters; 19 puzzle families, 98 packs, 18,049 entries |
| `npm run save:catalog` | Passed; all 180 immutable published banks unchanged |
| `npm run doctor` | 21/21 passed |
| Home/Personalization regression run | 88 files passed, one skipped; 994 tests passed, two skipped before the final visual fixes |
| Final full-suite run | 576 files passed, one skipped; 7,858 tests passed, two skipped. Five failures in four files were then resolved and rerun as described below |
| Final cooking/runtime/renderer retest | Five files, 136 tests passed. Includes the updated pan paint/selection contract and the unchanged nearer-fridge occlusion test |
| Full-run timeout retest | Three files, 21 tests passed with `LITTLE_ISLAND_SLOW_HOST=1`; the word-pipeline, loop brute-force, and memory simulation tests exceeded their normal 120-second budget under contention. No assertions or timeout configuration files were changed |
| Web export | Passed; final offline shell `278901cba8d6`, 7,558 bundled resources |

The final full-suite failures were two obsolete pan-paint expectations plus three existing test timeouts. The final reruns above cover all five failures. The full suite has not been rerun again after those passing retests; CI on the PR head remains a lead-owned gate. An earlier full run overlapped a pan-source edit and picked up the new assertion with the old cached module; that result was discarded and replaced by the final full run above. The first `npm run check` invocation therefore did not exit green as a single command; its constituent gates were rerun after fixes rather than repeating the unchanged puzzle verification.

Runtime cleanup: the task-owned Chromium processes, shared-preview tab, and static server on port 43827 were closed/stopped through their exact identities. Lifecycle session `01a2202e-90bb-79e2-b5a6-71f457fc86f2` reports no active owned resources. The draft branch/worktree is retained for lead review. Library paths, the word-games route, protected tests, and immutable save banks were not edited. `program/4.0` advanced with Wave 6 while this task ran; this branch retains the requested `ec830954` base and does not revert or modify that parallel work.


Final source commit: `d57af440`. The last source edit extracts the identical `Date.now()` gesture clock into a named worklet for the React purity lint rule; it changes no interaction timing or visuals. Final typecheck passed and repository-wide lint passed with zero errors and 275 existing warnings. The affected Market advisory Impeccable scan returned `[]`. Both 512×512 bin WebPs have an alpha channel and pass `webpinfo` validation. The final export after this lint-only edit is `278901cba8d6`; the browser screenshots above were captured immediately before that extraction on the identical visual/gesture behavior.


The final `npm run check:words:export` passed against export `278901cba8d6` with the existing private policy loaded (`policyDataChecked: true`): admission checked 14,374 files; the bundle guard checked 7,560 files and 72 source files. No new policy exceptions were added. Existing policy exception counts were five terms and one source unit. Final lint and typecheck both exited zero; lint retained 275 existing warnings.


## R1 review response

Reviewed head: `8644e453ed9a6747aac505e6f34035a61a375929`. Fix source: `61e3d23948cf60c38e00967542b8ef3315546009`. All seven findings were read and addressed. This records implementation and verification; the independent review remains REQUEST_CHANGES until the lead's re-review.

| Finding | Change and regression evidence |
| --- | --- |
| R1-01 | Reduce Motion stamps both commit and settle clocks before queuing JS. Watchdogs ignore zero sentinels and use a creation-clock fallback. Move/feed tests tick native frames before delivering JS and verify one valid commit; a separate test covers zero timestamps. |
| R1-02 | Orphan sweeps retain queued up/cancel events and recognizer-owned external pointers. Canvas touch inventory no longer cancels drawer pointers. Tests cover both concurrent drops during a delayed commit, canvas taps during -500/-100/positive drawer drags, and recovery if an external pointer itself is lost. |
| R1-03 | Entity hits and selected-item placement precede room-hop interception. Scene portals render only in the active single room and disappear in Overview, Design, overlays, or behind an open fridge. Drag interception also checks overview/camera scale and active room. Hops cancel captures and transfer from the selected friend's actual room. Screen, real SceneView, and runtime drag regressions cover these cases. |
| R1-04 | Grocery dragging requires a 180 ms hold; taps stay immediate. Web tiles permit native vertical panning. A Market-scoped, nonpassive touch handler cancels scrolling only during an active held carry and is removed on unmount. Tests cover configuration, unsuppressed ordinary movement, held-only prevention, and one add per drop. |
| R1-05 | The bin cue is inset from the room edge. The static spoon element is reused across renders and angles below the face; the chef faces the stove. Pan lift is measured against the illustrated skillet rather than the retired SVG stove. Memo and paint/selection tests pass; the refreshed cooking/open-bin screenshots were inspected. |
| R1-06 | Trash targets bypass surface-capacity admission. Valid full-Kitchen fixtures dispose food from a fridge, basket, and another room and verify valid saved outcomes. |
| R1-07 | Unpacking opens the fridge with active state. A fully emptied staged shopping basket is removed; a basket already placed by the child is retained. Tests verify exact saved Undo restoration and preserve overflow. |

Verification on the completed source:

- Home, Personalization, style, native-module loading and protected Home regression run: 89 files passed, one skipped; 1,016 tests passed, two skipped. All new R1 cases passed.
- Focused Market/runtime/model run: three files, 27 tests passed.
- `npm run save:catalog`: passed, all 180 immutable published banks unchanged.
- `npx tsc --noEmit` and `npx expo lint`: exit 0.
- `npm run export:web && npm run check:words:export`: passed. Final offline export `d426b26c0d09`, 7,558 resources. Private policy checked; existing exception counts unchanged.
- Impeccable advisory scan of changed UI files: `[]`.

Browser QA used isolated Chromium, with 1024×768 Kitchen/room views and a 390×667 touch viewport. The four requested files were refreshed and inspected: `kitchen-cooking.png`, `kitchen-trash-open.png`, `kitchen-fridge-stocked.png`, and `ladder-room-hop.png`. The spoon clears the face, food sits in the skillet, the full trash label is visible, the open fridge has no portal overlay, and the empty basket bar is gone. A real drag discarded the cooked serving; Undo restored it. Unpacking two groceries produced eight fridge contents and removed the staged basket; a room hop grounded the Islander in Beach hut.

The final Market build was reloaded without temporary input overrides. A held touch added one Mango and a tap added one Banana. A vertical swipe starting on a grocery then scrolled shelves 116 px, left the two-item basket unchanged, and produced ten touch-move events with no default prevention and no carry ghost. An earlier swipe attempt left scroll position unchanged; the subsequent instrumented swipe confirmed normal scrolling without changing source. Physical iOS/Android testing remains separate from browser touch emulation. The final browser had no JavaScript page errors.

Kitchen/room images were captured from export `2a9138c60f5e`; final Market touch checks used `d426b26c0d09`. The intervening source edits affect Market touch scrolling only. No protected tests, Library files, word-games route, or save banks were changed. The task-owned server, browser processes, and preview tab were cleaned; lifecycle session `01a2202e-90bb-79e2-b5a6-71f457fc86f2` reports no active owned resources. The draft branch/worktree is retained for lead review.
