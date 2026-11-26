# Picture Grid

The authored bank contains 30 Easy (5×5), 28 Medium (8×8 and 10×10), 9 Hard (12×12), and 11 Expert (15×15) pictures. Size and the number of rounds of forced row and column deductions determine the tier. The runtime solver and a second checker that enumerates line placements both certify every picture.

A saved round keeps the current 2-bit grid, a 2-bit grid from before the oldest retained move, and up to 512 three-byte strokes. The validator replays those strokes and checks the resulting board. Edits, resets, and help counts survive Undo and restore.

Draw a Puzzle runs in memory. Passing the device removes the drawing from the screen and discards its marks. The next player starts with the derived clues and a blank grid. When line logic stalls on a family drawing, the game accepts any solution that matches its clues.

## Wire into Cove

1. Add `pictureGridFamily` from `scripts/puzzles/families/picture-grid.ts` to the family index. Record the lead's owner for the 110–139 reservation in the slot register.
2. Bake with `npm run puzzles -- bake --family picture-grid --range 110-139 --owner <registered-owner> --seed 1 --attempts 32`. Seed 1 and the source drawing order produce four packs at 110–113. The tests bake these twice in a scratch catalog and compare the full packs.
3. Build the registration with `definePictureGrid(pictureGridBankFacts(manifest))`. Optional `cleanDares` take a bank, row, slot (1700–1799), ID, and label. Export its `registration`, `Payload`, `Action`, and `State` through the Challenge registry source, then regenerate the registry and save catalog with the existing tooling.
4. Wire the Cove start sheet and board callbacks. The board also exposes Draw a Puzzle through More. On a small viewport, Move grid pans the 44-point cells with the clues pinned to their axes. Test native panning, drag-to-paint, VoiceOver, and the handover on phone and iPad after the route is available.
