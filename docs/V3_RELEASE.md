# Little Island 3.0.0 (25): family preview

An internal TestFlight build for Leon's family devices. It isn't a public release. The Library ships in **family-preview** mode: reviewed content is admitted, but records stay unpromoted until Leon accepts the narration on the device.

## What's new
- **The Island:** an illustrated map home replaces the card list. A plain list view stays available.
- **Living Island Home**, a rebuilt interaction layer:
  - one drag controller with a top-layer carry overlay;
  - upright carry poses and an opaque pose handoff;
  - settle glides with no snap-back;
  - what's previewed at release is what commits;
  - real food from the fridge;
  - fixtures stay put in Play;
  - Design with whole-room collision;
  - edge carry, Undo, and Find my Islander.
- **Island Library (replaces Explore):**
  - 118 wonders in three reading layers, with sentence replay;
  - 9 openly licensed picture books;
  - exhibits you touch;
  - Make (drawing plus a story) and My Shelf;
  - baby Look & Listen with a hold-to-exit lock;
  - search kids can use;
  - grown-up collection controls and optional hours.
  
  New collections: CHamoru culture, Plants & Food, Island History (off for new learners) and Our Catholic Faith (off for new learners). Existing learners migrate with both on.
- **Content process:** content was independently fact-reviewed and reviewed by two blind family/values reviewers, then reconciled. Leon recorded the family decisions. Art was redrawn in the hub style and reviewed independently.
- **Fixes from native QA:**
  - iOS 26 full-screen swipe-to-pop is turned off (left-edge back remains); Look & Listen and the drawing canvas have no back gesture;
  - drawing strokes are safe;
  - Dynamic Type caps on chrome and headings;
  - the creator sheet's Done saves;
  - scroll bounce no longer fails saves;
  - CHamoru words are visible in the picture game;
  - VoiceOver can reach reader words.

## Verification
The source, tests, native simulator QA (iPhone and iPad mini, including the upgrade from 2.5.0) and the delivery receipts are recorded in the private artifacts folder (`v3/`). Each delivery's TestFlight receipt is added to [TESTFLIGHT.md](TESTFLIGHT.md).

## Family device checklist
These items can't be verified on a simulator:
- **Narration:** listen to Library narration, including the CHamoru words (the neural voice was accepted for now).
- **Home feel:** drops into bed, chair, tub and rug; the short pause after a drop.
- **Offline:** airplane mode, with everything still working.
- **Interruption:** press Home in the middle of a drag or drawing, then return.
- **VoiceOver:** a short real-VoiceOver pass in the Library and Home.
- **Stassie's profile:** the faith and history shelves are on, Explore saves moved into the Library, and her Home and Islander are intact.
