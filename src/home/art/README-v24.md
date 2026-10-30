# Island Home 2.4 art integration

Phase 1 supplies rendering and capability data. HomeScreen, saved relationships,
placement, targeting, and native acceptance remain engine/lead work.

- Use `ItemArt` / `MoreItemArt` with `layer="back"`, the occupant, then
  `layer="front"`. Default `all` renders both furniture layers. Keep all three
  under the same mirror transform. Do not also paint the legacy SeatFront.
- `capabilityOf(item).sockets` uses square viewport-normalised coordinates.
  The original catalog ID `bed` is named Cloud bed; no second cloud-bed ID is
  needed. Bunk bed has lower/upper sockets, bench has left/right sockets.
- Resolve `sit` to `sit-front`, `lie` to `lie` or `lie-asleep`, `bathe` to `bathe`.
  `sit-relaxed` remains unchanged; `sit-side` is a compatibility alias for the
  same seated skeleton. Holding, eating and drinking use the right hand.
- `poseBox(resolvePose(...))` gives the rendered box and contact anchor in rig
  units. Normal poses use 80×132; lying uses **144×92**, anchor **(44,46)**.
  The lying transform rotates every wardrobe layer together. `Islander.size`
  means the scale of a 132-unit standing rig, including for lying. At size 224,
  lying renders 244.36×156.12; do not stretch it into an 80×132 container.
- For a square item of scene size S and character scale C/132, position the
  character at `socket.at*S - poseBox.anchor*C/132` relative to the item's
  square top-left. Mirror this complete group about the item's centre. This is
  exactly the placement in SocketGallery. Draw every occupant between the same
  back/front pair (especially two occupied bunks). The old lap clip must go.
- Pass SVG content sized in a 24×24 box to `held`. It is centred at the right hand,
  after the arm and before the front finger stroke. It follows the pose and the
  lying transform. A held node must be SVG content, not a native View.
- Pass `reduced` to Islander and CrabFriend to hide sleep marks. These components
  have no timers. When occupied, animate the complete furniture/occupant group,
  or disable the optional furniture motion, to keep contact stable.
- CrabFriend has stand/sit/lie/held and an optional mirrored flag. Its box is
  120×110 and ground contact is (60,96). Replace the ArcadeArt home crab at the
  engine seam; the arcade game art is unchanged.
- `visualBox(item, rotation, mirrored)`, also exported from world.ts, reports a
  conservative **full SVG square**, relative to the current itemPoint anchor:
  left `-S/2`, top `-.85*S`, width/height S. This includes transparent padding.
  It matches geometry.itemSize for every catalog entry. Use this for safe display
  clamping; it does not change saved footprint rules. Bed at x=0 still has an
  engine-centred box extending left of its room: art alone cannot fix that.
- Added free items: bathtub, bubble-bath, bench. No food, light, sink, fridge or
  other Phase 2 behavior has been added.

## Reproduce the dev fixture

After `npm ci` with Node 22:

```sh
npm run export:web
V24_ART_GALLERY=dist npx vitest run tests/home-art-v24.test.tsx
LITTLE_ISLAND_PORT=43893 node scripts/serve.mjs
```

Open `/art-gallery.html`. The generated `/wardrobe.html` is for checking SVG
bounds. The fixture imports the production rig and SeatShape, uses catalog
scene sizes and published sockets, and includes every socket in both facings
and three wardrobe looks. It is not a public app route or a saved-state journey.
