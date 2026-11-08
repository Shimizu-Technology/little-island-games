# Cove integration work still open

TD-02 Tide Table selects three available shelf genres, filters hidden refs first, and keeps Monday gentler. Its refs are ordinary open pack entries, with no expiry or daily record.

Family Ladder: OPEN. The landscape spec defines this as the **same Word Ladder** for everyone with each person's actual route shown after solving, not a list of their latest games. G6 must expose validated route/reveal presentation from its Word Ladder adapter and retain those routes after atomic completion; G1 then mounts the comparison view. Required acceptance: two different valid routes for the same immutable ref, owner isolation, force-close/reopen, quiet per-person reveal without ranking, phone/iPad interaction. The current save keeps solution hashes, which cannot reconstruct word routes. No route data or completed view is invented here.

Island Postcard: OPEN. The Picture Grid adapter/art must provide the day's original place/picture and a validated finished-picture reveal for the album. G4 supplies that presentation; G1 mounts the postcard/gallery. Required acceptance: solve any day's registered ref, picture retained in the album in any order, no expiry, hidden-new suggestions excluded while saved work remains available, native phone/iPad reveal. The existing generic finished-ref album is implemented; it is not accepted as the picture-backed postcard view.

These two views remain unaccepted portions of TD-02 until those adapter contracts and native journeys pass. This records their dependency and ownership; it does not cancel either requirement. The independent fix review explicitly allowed formal deferral of these two adapter-dependent views. Edge input is separately open under G2 in ../puzzles/grid/README.md.
