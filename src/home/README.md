# Island Home integration

This is an offline, no-fail room for the family's Islanders. The implementation follows `docs/ISLANDER_2.md` and the Island Home design study, from `feat/islander` at `bedb78d`. The `/island-home` route is intentionally unlinked. No existing save, game or reward files change.

## Boundaries

- `HomeScreen` accepts `ownedItems`, `ownedWallpapers`, `ownedFloors`, `badges`, `initialState`, and `renderCharacter(slot, pose)`. Update earned-item props without replacing state: earning never rearranges a room. Remount with a learner key on learner switch or restore so session history cannot cross owners.
- `renderCharacter` receives slots 0–2 and `stand`/`sit`. Supply a fixed roughly 60-point render box. The fallback is a neutral mannequin for slot 0, Pip in a bowl for slot 1 and existing Poko art for slot 2. Map these two poses to the rig's pose IDs at integration.
- `useHomeStore` is **session-only**, deliberately without localStorage, SQLite or the global Store. Navigation/remount reloads the furnished starter room. The screen says this explicitly. Replace the hook's state adapter with a learner-scoped `personalization.home` transaction through the existing Store commit/recovery boundary. Persist only validated `HomeState`, after accepted settled actions; surface actual saved/failed/retry state. Do not persist undo/redo history.
- `validHome(unknown)` is the version-1 namespace validator. Unsupported or malformed input is rejected without mutation; the adapter exposes the original as `recoveryOriginal`. The integration must preserve it using the existing recovery store before any replacement, and must prevent ordinary writes during restore or owner changes. This slice does not invent a second recovery/storage system.
- `homeReducer` returns the original state and a human message for rejected edits. Reset returns `snapshot` referencing the exact pre-reset state; history makes that reset undoable. History is bounded to 40 steps outside `HomeState`.
- Starter items are always owned. Pass earned furniture IDs and `sticker:<existing arcade StickerId>` through `ownedItems`. `homeStickerItems` adapts the existing sticker array. Putting an instance away changes placement only. Duplicate sticker and furniture instances are supported; ownership is reusable.
- Badge IDs currently identify six track placeholders, not finalized milestone artwork. Map earned track/milestone records onto `BadgeId[]` at integration; replace the corkboard placeholders when badge art lands. Room's earn labels are track/set descriptions, pending final milestone IDs from the reward phase.

## Placement and art

Floor coordinates are integer cells in a 10×6 grid, with columns 8–9 reserved for the door. Wall decorations use an 8×2 anchor grid. Rugs/mats occupy a separate ground layer and may sit beneath furniture; items on the same layer cannot overlap footprints. All instances count toward 32, including decals. Furniture supports 0°/180° views; wall objects stay upright. Both directions use coherent illustrated views rather than turning a chair sideways in screen space. Art uses the same muted teal/coral/honey palette and 2.5-unit outlines throughout, with no imported imagery or unreviewed CHamoru text or latte-stone decorations.

Objects and characters share depth sorting by floor contact point. Floor coverings and wall decals render first. Tap placement and the labelled 48-point directional controls both feed the same preview/model. All object pressables are at least 48 points; the model does not rely on drag or pinch. Compact landscape keeps the full room visible and lets controls scroll separately.

Interactive objects immediately change their illustration and announce a short response. The aquarium moves Pip to another swimming position; the shell chime changes its hanging shells. There are no continuous animations or automatic motion, so Reduce Motion has the same static state feedback. No sound is required or played. Native gesture/hit-target behavior and actual rig seating need lead verification.
