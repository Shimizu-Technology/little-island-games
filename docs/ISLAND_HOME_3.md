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

The first contract commit does not change saves or connect bootstrap functions to live callers. The second push implements the complete graph and v4 migration if staging/pose action fields require it. Preserve legacy layout wherever visible geometry was valid. Migration never mutates source input; the existing personalization/recovery store retains originals. Accepted v4 edits must reload without geometry repair. World undo includes attachments, occupants, consumption and travel together; room navigation and camera state stay outside history, with at least 50 steps.

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
