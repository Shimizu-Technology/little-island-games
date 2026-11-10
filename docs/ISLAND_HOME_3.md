# Island Home 3 scene contract

## Scope and acceptance

Private offline family play for Stassie and family. Source base: main `1700d54`, 2 November 2026. The supplied v3 COMMON, core BRIEF, Toca SPEC rules 1–63, home audit and native hands-on report define this work. Existing PRD/QA explain recovery and separate family/public release gates. Brain Dump's bounded project search contained no newer Island Home decision. This slice owns pure scene rules and reducer integration; RUNTIME owns native interaction/rendering and RIG owns precise silhouettes and attachment anchors.

Acceptance is deterministic preview/commit, visible fallback, contained attachment groups, atomic travel/consumption/undo, immutable migration, a passing full engineering gate, audit regression fixtures and a measured resolver benchmark. Browser images establish only the exercised web behavior. Native and physical family acceptance remain with the lead.

## Coordinates and identity

`ScreenPoint` is logical points; `HousePoint` spans the house; `RoomPoint` uses the current 800×560 art; `GridCell` is the legacy placement grid. Only named camera/grid conversion functions cross spaces. A room origin belongs to the affine camera conversion, never a second pointer path. Items have room-qualified scene IDs because old saves reuse item IDs between rooms; characters have global slot IDs.

## Attachment graph

Every entity has one floor, surface, socket, hand, container or staging attachment. `buildScene` derives children, transforms, bounds, hit proxies and depth. Room indexes contain plain serializable arrays/records, prepared after settled edits. No React Native handles enter the scene modules.

Layer order (SPEC 39): background/wall → furniture back → occupants/contents → furniture front → foreground fixtures → transient drag overlay → UI. Within a band, ground anchor y and stable ID determine order. Held objects inherit their owner's band and anchor. Heads never drive depth. Socket front masking is authored by the furniture and only applies to settled occupants.

## Runtime integration

RUNTIME should build one scene/index after a world edit; capture one entity and grip on pointer down; use `screenToRoom` on every pointer update, including camera motion; and pass the exact semantic anchor to `resolve`. Two object pointers can coexist. Background-only pointers own pan/pinch. `transition` returns effects without changing the save.

Render one real-art drag overlay above all room clips, including supported children, occupants and held props. Omit corresponding resting copies while captured. Use `carry` while lifting a character; keep underlying supported pose for cancellation. Keep the overlay alive through commit acknowledgement and settle completion. Do not reset its transform on release before the resting scene contains the same exact proposal contact. This prevents the old-position flash. Do not automatically reframe the camera after every drop.

A proposal includes the world revision, full attachment, projected contact, pose/facing, reason, moved descendants and displaced objects. Preview, drag release, tap-to-move and accessibility all use `resolve` then `apply`. `apply` returns stale when intervening edits invalidate a preview; re-resolve against the new index before showing a different destination. Consumption happens only on apply, never hover/cancel.

## Save and history boundary

The early contract commit kept saves unchanged. The implementation adds the complete graph and v4 migration for staging, exact contacts and pose actions. Preserve legacy layout wherever visible geometry was valid. Migration never mutates source input; the existing personalization/recovery store retains originals. Accepted v4 edits must reload without geometry repair. World undo includes attachments, occupants, consumption and travel together; room navigation and camera state stay outside history, with at least 50 steps.

## Replacement map

| Existing module/function | Scene replacement / owner |
| --- | --- |
| drop.resolveDrop | proposal.resolve; old signature becomes a deprecated adapter |
| drop.characterDropRoom | named room conversion and socket proposal routing; RUNTIME chooses room then preserves proposal |
| drop.occlusion / friendBounds | graph precomputed occlusion bands/cells; species pose anchors |
| geometry.floorPoint / spotFromPoint | types.gridToRoom / roomToGrid and camera.screenToRoom |
| geometry.itemPoint / surfacePoint / characterPoint | graph entity contact and attachment transform |
| geometry.characterFrame / characterHand | species anchors + scene contact, read from the canonical RIG anchors |
| geometry.stackSpot / characterDrop | proposal.resolve + apply |
| geometry.*Depth / seatClipTop | graph depth bands/proxies plus authored socket front mask in RUNTIME |
| interactions.dropBody / dropWorld | graph.buildScene and RoomIndex; deprecated compatibility data for old renderer |
| interactions.socketPoint / socketsOf | authored catalog metadata consumed when building targets |
| interactions.characterForSocket | proposal.apply attachment projection |
| freeFloor / placement.clearFootprint | precomputed legal support cells and canonical group projection |
| model.homeReducer placement/use/release/transfer | resolve/apply transaction adapters, stable public action names |
| model.normalizeRoom / migrateHome | one-time legacy migration; v4 validation without live repair |
| useHomeStore.editHistory | atomic world snapshots, ≥50 actions; navigation excluded |
| Drag.tsx / HouseCamera.tsx | RUNTIME consumes controller/camera contract; no rewrite in CORE |
| HomeScreen.tsx | RUNTIME renders scene and overlay; no rewrite in CORE |

## Implemented v4 boundary

`HomeStateV2` keeps its public name and accepts versions 2, 3 and 4 at restore boundaries; new/migrated worlds are v4. Instances keep the original grid `x/y`, `on`, `powered` and `empty`. Characters keep `socket` and `holding`. New fields are instance `in` (container parent), instance/character `staged`, floor-character `at` (exact projected room contact), and character `action` (`eat`/`drink` overlay). Every relation is derived into the single attachment union. The 256-instance room schema bound includes stored/carried content; the catalog still rejects a new visible placement at 48. Transfer of an existing held item remains possible into a full room.

Legacy v1 coordinates are scaled once, v2 gains explicit compatible sockets, and v3 invalid furniture/child envelopes are projected as complete groups. These are documented repairs of previously clipped geometry. Valid visible layout, IDs, colors, states and themes stay intact. V4 initialization validates and returns the accepted object unchanged. Original preservation remains in `state/homeMigration` and the existing Store replacement transaction; both incoming and displaced device bytes are kept during restore.

`homeReducer` routes placement, held release, use, character moves, room transfers, rotation and mirroring through `resolve/apply`. Put-away releases dependent entities before removing their parent. `apply-proposal` is the preferred runtime action and reports stale previews explicitly; `finish-action` clears an ended reaction without a world-history step. The two HomeScreen callback-only changes preserve socket IDs for cross-room floor taps and retain hand/mouth/surface intent for tap-to-move props. Rendering and gesture definitions are unchanged.

Room indexes precompute occupancy, floor contacts and three species' occlusion fractions. Semantic targets use 128-unit spatial buckets; floor fallback scans at most 240 prepared candidates, without per-cell rectangle unions. Moving furniture checks at most the three free friends for displacement, and publishes those moves in the proposal. `dropWorld` caches room preparation by immutable room identity and content token. Consumers should still retain the new scene/index across frames rather than rebuilding it in worklets.

Hysteresis retains an eligible previous target through its 1.25 entry radius, lets a competing exact core win immediately, and carries a pending target/since value for the 60 ms magnet-switch interval. The caller supplies monotonic `now` and passes the previous proposal. Release resolves immediately. Controller reservations name the first preview claimant, are passed into resolver context, and disappear on exit, cancellation or commit. An occupied hand is filtered from ordinary magnets; an explicit Give action may displace its previous prop using a previewed floor/staging move.

## Remaining integration acceptance

RUNTIME must consume the affine inverse for every pointer, own two gesture captures, render real art for each moving group above room clips, draw a visible staging/recycle tray, keep overlays through settle, and stop post-drop camera reframing. It also owns drawer-axis arbitration, accessibility focus, edge pan, actual frame measurements, and native/family acceptance. CORE cannot establish those outcomes while the existing renderer remains active.

Pose metadata comes from `islanderAnchors(base,facing)` and the species anchors. Pip's mouth and fin anchors and the crab's mouth and claw anchors are the points the art draws (`companionContacts` and `Companions.tsx`). Supported base poses are independent of action overlays; the compatibility pose helper no longer substitutes upright eating/drinking for a bed, seat or bath base. RIG still supplies the final upper-body action art.

Worklet primitives live in `scene/spatial.ts` independently of legacy geometry/reducer imports. Worklet callees are declared before their callers because the production transform captures their closures during module initialization. `scripts/check-home-worklets.cjs` exercises the actual installed worklet Babel transform, then initializes and resolves/applies a real scene edit.

The public `proposal.ts` API reexports the independent worklet engine from `resolve.ts` and owns JS apply/validation. Legacy drop/geometry adapters import the engine directly. This keeps their worklet closure initialization independent of model/reducer import order, using static imports in both Metro and Vitest.
## Runtime composition

`HomeScreen` coordinates learner persistence and explicit navigation. `runtime/SceneView` paints the prepared scene with stable entity keys; `DragOverlay` is a sibling above all room clips and building trim. `useInteraction` feeds raw Manual gesture contacts through `scene/controller.transition`, preserving separate object captures and background camera ownership. A stationary tap uses the Manual recognizer's explicit down/up lifecycle rather than waiting for Pan activation. `CameraController` owns inverse mapping, bounded focal zoom and edge pan. `Destinations` uses the same proposals for tap/switch actions. `DesignTools` retains catalog, room style, tint, rotation, mirror and removal controls; its tray exit axis follows its scroll orientation.

Settle uses the explicit critical model m=1, k=900, c=60, velocity=0, capped at 240 ms. The overlay stays at release while commit is queued. It can disappear only after commit acknowledgement, completed settle, and the matching rendered scene revision. Ordinary drops never invoke camera focus. The camera changes only through direct manipulation, an explicit navigation control, or viewport adaptation.

`/home-lab` is available in development, or in a local web export explicitly built with `EXPO_PUBLIC_HOME_LAB=1`. It is absent from ordinary navigation and must stay disabled for distribution. The fixture does not persist into a learner world. Its optional local inspector (`__littleIslandLab`) is read-only and contains no network or action bypass. Stress art is deliberately separate from the validated three-character save model; native throughput and family acceptance remain the lead's gate.

Runtime sleep is an unsaved face after eight seconds of actual stillness in a lying base. Each actor keeps its own timestamp across unrelated edits. Pickup, carried-group movement and use wake the actor; release starts a fresh idle interval. There are no screen-level sleep marks; RIG owns any decorative marks and Reduced Motion behavior.

## Combined RIG boundary

`species.anchorsFor(slot, base, facing, action?)` now reads a plain, precomputed cache from the canonical RIG anchors. The returned geometry is in room units, including the wardrobe envelope. The optional action supports `hold` as well as eat/drink; hold is derived from ownership and never stored as a world pose. `carry` means the lifted rig origin, not a standing character holding a prop. Graph, resolver, render frame and held-child projection use the same base/action geometry. A mouth drink projects the resulting drink hand, while a Give projects the hold hand.

The runtime binds the nearest anatomical feature when switching into upright carry. Nine authored secondary-lag frames are selected by shared UI-thread opacity; their global rig tilt is cancelled because the building overlay applies continuous tilt around the captured grip. The held prop uses the same sampled hand. Pointer position and saved contact never receive lag. This keeps React out of pointer moves; device throughput still requires native measurement.

Runtime destination indexes combine destination geometry with scene-wide entities so attached groups survive cross-room proposals. `apply` additionally returns `identities`, mapping original scene IDs to exact committed scene IDs after collision renaming; overlays and focus use this map. `ResolveContext.intent = 'staging'` requests the visible recovery tray explicitly and cannot fall through to floor placement. These additions preserve the original state/preview API and do not create another placement engine.

## Aim contract (4.0)

Every item in the catalog has a hull: convex pieces of what is actually painted (`art/silhouettes.ts`), with characters drawn from their rig joints (`scene/species.ts`). One table feeds touch, occlusion and support planes. Picking takes the frontmost painted shape; a prop beats its owner only where its own art was touched. Expansion is at most 8 pt and only for objects smaller than a 44 pt target, and only when no loose object's art was hit. In Play, something that stays put (below) gives way to a loose object within reach that is painted in front of it.

Hand and mouth drops are tested against the carried prop's visible centre, not its base. Constants, in screen points at the current zoom:

- Face zone: radius max(32 pt, 1.1 × head radius). Food whose art is on the head counts as a mouth drop, and the mouth stays the anatomical target of the reaction.
- Hand magnet: clamp(24, 0.14 × h, 34) pt.
- Seat magnet clamp(20, 0.22 × h, 48) pt and surface magnet clamp(14, 0.1 × h, 26) pt are unchanged.

On open floor, a character or loose item lands on the exact release point. The grid only decides whether that point is legal, and the save stores the exact point as `at`. Furniture stays on the grid. Nobody new can sit inside the toy shelf; a friend already saved there keeps the seat until moved.

The frozen Play list is `anchoredInPlay` in `world.ts`: beds, baths, large seats, tables, storage, kitchen fixtures, screens and rugs and wall art. They answer taps and drops. A drag on one wobbles and pans the camera with the same finger, and a two-finger pinch that touches one is camera input. Cushions, plants, lamps and props stay movable. Design rearranges everything.

### Home trace (HM-S0)

`runtime/trace.ts` is the local QA log for probes P1–P6: pick, ready, painted, release, commit (with a save transaction hash), frame-time summaries and a layout snapshot, with device and build on the session line. It writes to the app's own Documents folder as `home-trace-<session>.jsonl` and has no network path. It only runs under `lab`, and `HomeScreen` requires it inside a `__DEV__ || EXPO_PUBLIC_HOME_LAB` branch, so a build without that flag folds the module and the hit-shape overlay away. P1 (240 fps video) and P6 (thermal) are physical-device measurements.

## Getting around and smooth (4.0, H3)

- **Idle:** the Home frame callback stops itself after three quiet frames and restarts on the next touch, hint or camera move. Resting art reads one shared resting state that changes only on pickup, press, target and front edges, never per drag frame. Only rooms whose contents changed are sent to the UI thread.
- **Life:** friends in the room on screen blink (four blinks per 18 s, never more than 6 s apart, staggered) and breathe (0.4% scale). The clock is a timer that wakes only at blink edges and in 250 ms breath steps. No life in the overview, other rooms or Reduced Motion.
- **Camera:** room buttons, Find, zoom and double-tap ease over 180 ms on the UI thread; another floor dips through a 180 ms veil that fades in, holds across the swap and fades out. Reduced Motion jumps. A new touch on the room finishes the move at once.
- **Room moves:** a 48 pt edge band on every device. Room buttons are drop targets: a carry held on one for 300 ms switches room and keeps the carry; letting go on one lands on that room's open floor. Cancel still returns to the source.
- **Sand:** a thing let go on the beach below a ground-floor room lands on the nearest open floor, travelling there. Each ground-floor beach has three shells; picking one leaves it on the sand and placing it makes a new shell.
- **Tray:** each choice is a picture of the destination with the chosen thing in the resolved pose. The tray lifts above the selected thing so it never covers it.
- **Friends drawer:** a Friends button beside Find. Each friend has a 64 pt cell (76 pt in larger-target mode). Dragging a cell carries that same friend into the room under the finger; a tap brings them here; a friend let go on the Friends button waits in the drawer (staging), keeping what they hold. Opening and closing takes 160 ms and never moves the camera.
- **Quiet hints:** after 6 s without a touch, one usable thing (a toggle, a food or a shell) gives one ±3° wiggle over 180 ms; at most once per 20 s and three times per quiet spell. Never in Design, with a panel open, or under Reduced Motion. No sound, badge or prompt.
- **Small rules:** a background touch longer than 500 ms is not a tap; a two-finger tap is ignored; a full room shows a picture cue; Redo shows in Play for 10 s after an Undo.

### Saved undo and access (v4 only)

`HomeStateV2` v4 may carry two optional fields, both outside history and validated by `validHome`:

- `undo: { version: 1, steps }` — the last 20 undo steps, each the smallest per-room patch that turns the state after one committed action back into the state before it, at most 6,144 bytes. Every step must rebuild a valid earlier home, or the save is invalid. Navigation is never a step and Redo is not saved. Five learners' worst case fits the measured whole-save headroom in `docs/evidence/f1-save/SIZE.json`.
- `access: { largeTargets: true }` — the grown-up larger-target mode, set only behind the typed grown-up question in More. Never an undo step.

Older saves and saves without these fields are unchanged; migrations never write them.
