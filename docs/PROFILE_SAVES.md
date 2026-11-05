# Local learner saves

Profile separation uses save envelope version 2 with a required validated `profiles.version: 1` namespace. Version-1 backups remain importable through migration. A missing profile namespace cannot be mistaken for a valid older empty save, and older app versions reject the new envelope while preserving its bytes. Backups include every learner, Family practice, shared device settings, earlier family history and pending older-work assignments.

`profiles.people[id]` stores that learner’s paused learning, classic, board and activity rounds; word and race records; favorites, recents and learning coaching; and School completion records. Houses, appearance, badges, Arcade and Library remain in their existing learner namespaces. Top-level game fields are only the active learner’s runtime view. `encodeSave` writes canonical slots once; `parseSave` validates each slot with the existing real engine validators and reconstructs the selected view. Unknown versions, invalid slots, owner mismatches, duplicate live owners and partial profile sets fail through normal recovery.

## Upgrade and older work

Migration validates the original first and never mutates it. Load and restore preserve exact originals before publishing a new shape. Learning rounds retain `round.learner`, or Family practice when missing. A matching classic/board/activity `roundOwners` tag preserves the known owner. Unmatched rounds go to the assignment bucket. Unowned learning also retains an assignment copy; assigning it removes the matching Family live round, so it never becomes two children’s live work.

The grown-up Settings gate contains **Whose earlier work is this?** Before the gate, a short line says older work is waiting. An old learning round is offered only while it is still unfinished in Family practice. A grown-up chooses an owner, or **Not needed**, for each old round, the old device-wide Explore history, practice signals, and favorites/recent places. Assignment first keeps a whole-device recovery copy. It refuses to replace a different target paused round. Library assignment adds saved/recent discoveries, preserves policy and newer fields, and fills old models/search context only into a Library created by this migration that the child has not edited. The exact old Explore archive stays available. Names and active selection never establish ownership. Existing badges stay as saved.

Older word and race aggregates are labeled **Earlier family records**. They cannot be reliably split, so they are neither divided nor copied into personal records. The Family free-play score board stays shared.

## School levels and stars

All five levels stay open. The selected level and completed levels are shown separately. Each learner/game/level record stores best earned stars, completed and independent counts, bounded independent days and deduplication round IDs.

- One star: finish a round, including help or shared play. Family practice is shared, so it earns one star at most.
- Two stars: finish an independent solo round.
- Three stars: finish independent solo rounds on at least two distinct days. The days need not be consecutive.

There is no timer, speed threshold, penalty or automatic advancement. Reading stays untimed. Existing engine help/miss flags, growth clean history, non-winning Reef Race and vocabulary browsing rules determine independence. Unknown old help history earns completion only. Stars never decrease. The result screen shows what the round earned: nothing for a lost round, one star for a helped round, and the level's best for independent work.

Backfill uses actual completed rounds and exact `completed-round` notes. A remembered setup choice, warm-up or aggregate total cannot prove completion. Old notes do not pair assistance and dates with each round, so they never invent third-star dates. Old totals remain intact. New readiness evidence uses `think.level-round-v2`; optional warm-ups retain practice and badge rewards under a separate summary key and do not earn School completion or next-level invitations.

## Ownership and replacement

Switching, restoration, assignment and learner removal advance the callback epoch. Captured classic callbacks check that epoch; learning/activity/board/Arcade writes also check the expected round or learner. Views select only the active profile. Result credit follows an accepted owned transition, and rejected Arcade results show a recoverable Retry.

Removing a learner removes their profile slots, learning notes, Library, appearance, badges, earned items, whole house and Arcade progress. Other learners, earlier family records and the shared Family free-play board remain. Family practice cannot be deleted. Previous saves is a whole-device recovery copy: restoring it replaces all learners’ newer work.

The 2 MB UTF-8 save limit and the shared 1 MB Library limit still apply. Admission failure preserves the last accepted state and reports the error. More profiles do not increase device storage capacity. Native SQLite/Files transport and family-device acceptance are verified separately by the lead.
