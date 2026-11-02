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
| geometry.characterFrame / characterHand | species anchors + scene contact; exact RIG anchors replace provisional metadata |
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

RIG should replace provisional pose metadata with `islanderAnchors(base,facing)` and authored species silhouettes/hand/mouth anchors. The Islander's temporary metadata preserves today's rig geometry; Pip and crab mouth/hand defaults remain explicitly provisional. Supported base poses are independent of action overlays; the compatibility pose helper no longer substitutes upright eating/drinking for a bed, seat or bath base. RIG still supplies the final upper-body action art.

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
