import type { EasingNote } from "./boundaries";
/**
 * Reviewed reasons for every easing in the generated boundary table (AR-00).
 * A rest beat eases one parameter while the world teaches something new. Every other
 * easing names the ledger row that owns its fix; that row deletes the note when it lands,
 * and a note with no matching easing fails the build.
 *
 * `upTo` is the largest easing reviewed for the note, as a percentage of the earlier level's
 * value, across the parameter's start and peak columns. A larger drop fails the build until
 * someone reviews it and writes a fresh reason.
 */
const beat = (game: EasingNote["game"], level: EasingNote["level"], metric: string, upTo: number, teaches: string, reason: string): EasingNote => ({ game, level, metric, upTo, restBeat: { teaches, reason } });
const owned = (game: EasingNote["game"], level: EasingNote["level"], metric: string, upTo: number, owner: string, reason: string): EasingNote => ({ game, level, metric, upTo, owner, reason });
type Boundary = "w2-1" | "w3-1" | "w4-1" | "w5-1" | "w6-1";
/** One reason at several world entries, each with its own reviewed bound. */
const each = (bounds: Partial<Record<Boundary, number>>, note: (level: Boundary, upTo: number) => EasingNote) => (Object.entries(bounds) as [Boundary, number][]).map(([level, upTo]) => note(level, upTo));

const flightTarget = "World entry target drops by 2 while speed rises and openings narrow. The spec's target continuity rule, target[i] = max(authored, previous), is AR-07's change.";
const runTarget = "World entry target drops by 2 while speed and chunk demands rise. Target continuity is AR-08's change, re-certified with the Lagoon witnesses.";
const cargoTarget = "Ordinary target drops by one at each world while junk and tides grow. The spec's max rule for Cargo targets, with re-certified budgets, is AR-09's change.";

export const restBeats: readonly EasingNote[] = [
  // Shell Song (AR-02): each world adds a voice or a new way to listen, so its first phrase holds fewer
  // motif units. Phrase count and playback tempo never fall back at a world entry.
  beat("shell-song", "w2-1", "units", 14.3, "a fourth shell", "The new voice is easier to learn on a phrase one unit shorter."),
  beat("shell-song", "w3-1", "units", 12.5, "a fifth shell", "The new voice is easier to learn on a phrase one unit shorter."),
  beat("shell-song", "w4-1", "units", 22.3, "new phrases", "Each round is a new phrase instead of a growing song, so the longest starts two units shorter."),
  beat("shell-song", "w5-1", "units", 11.2, "paired echoes", "Each unit is now a pair of taps, so the longest phrase starts one unit shorter."),
  // Rail Parade (AR-03): step time never slows at a world entry.
  beat("rail-parade", "learn-5", "food", 40, "spelling words", "Learn levels 5–8 switch from counting to spelling three-sound words, so there are three stops instead of five."),
  // Crab Crossing (AR-04): lane speed never slows at a world entry.
  beat("crab-crossing", "w6-1", "lanes", 12.5, "island hopping", "Still islands replace one moving canoe lane, so there is one fewer moving lane while children learn to hop between islands."),
  // Palm Patrol: march speed eases slightly while each world adds a new kind of beetle behaviour.
  beat("palm-patrol", "w2-1", "speed", 4.9, "diving beetles", "March speed eases by 1.7 px/s while beetles start diving out of formation."),
  beat("palm-patrol", "w3-1", "speed", 3.7, "armored beetles", "March speed eases by 1.7 px/s while armored beetles need two nets."),
  beat("palm-patrol", "w4-1", "speed", 2.9, "aimed tosses", "March speed eases by 1.7 px/s while the toss starts aiming."),
  beat("palm-patrol", "w5-1", "speed", 2.6, "shield gaps", "March speed eases by 1.7 px/s while shield gaps change the safe toss paths."),
  beat("palm-patrol", "w6-1", "speed", 2.4, "a fourth wave", "March speed eases by 1.7 px/s while every level adds a fourth wave."),
  // Beach Ball.
  ...each({ "w2-1": 3, "w3-1": 2.9, "w4-1": 2.7, "w5-1": 2.6, "w6-1": 2.5 }, (level, upTo) => owned("beach-ball", level, "serve", upTo, "AR-06", "Serve speed resets 8 px/s lower at every world. AR-06 applies speed[i] = max(authored, previous) and checks two-ball timing.")),
  beat("beach-ball", "w3-1", "wind", 25, "a second ball", "Wind restarts gentler while a second ball joins the rally."),
  beat("beach-ball", "w4-1", "wind", 22.8, "edge spin", "Wind restarts gentler while edge returns start to spin."),
  beat("beach-ball", "w5-1", "spin", 29.2, "changing gusts", "Spin restarts gentler while gusts start changing direction."),
  owned("beach-ball", "w5-1", "wind", 20.9, "AR-06", "Wind also restarts at World 5, alongside the spin rest beat. AR-06 decides wind continuity with serve speed."),
  beat("beach-ball", "w6-1", "spin", 29.2, "the shifting tide", "Spin restarts gentler while the turtle tide starts moving."),
  owned("beach-ball", "w6-1", "wind", 19.3, "AR-06", "Wind also restarts at World 6, alongside the spin rest beat. AR-06 decides wind continuity with serve speed."),
  // Fruit Bat Flight and Lagoon Run.
  ...each({ "w2-1": 10, "w3-1": 7.7, "w4-1": 6.3, "w5-1": 5.3, "w6-1": 4.6 }, (level, upTo) => owned("fruit-bat-flight", level, "gates", upTo, "AR-07", flightTarget)),
  ...each({ "w2-1": 9.6, "w3-1": 7.7, "w4-1": 6.5, "w5-1": 5.6, "w6-1": 4.9 }, (level, upTo) => owned("lagoon-run", level, "markers", upTo, "AR-08", runTarget)),
  // Canoe Cargo.
  ...each({ "w2-1": 14.3, "w3-1": 11.2, "w4-1": 9.1, "w5-1": 7.7, "w6-1": 6.7 }, (level, upTo) => owned("canoe-cargo", level, "canoes", upTo, "AR-09", cargoTarget)),
  beat("canoe-cargo", "w4-1", "garbage", 14.3, "narrow tide gaps", "Garbage arrives one load later while the narrow tide and a third junk row arrive."),
  beat("canoe-cargo", "w5-1", "garbage", 16.7, "shifting tides", "Garbage arrives one load later while the tide starts shifting and a fourth junk row arrives."),
  beat("canoe-cargo", "w6-1", "garbage", 20, "the crowded hold", "Garbage arrives one load later while the hold gets crowded and a fifth junk row arrives."),
  owned("canoe-cargo", "learn-5", "sum", 33.4, "AR-09", "Learn sums rise 9, 12, 15, 18 and then drop to 12. AR-09 reorders them to 9, 9, 12, 12, 15, 15, 18, 21 with versioned descriptors."),
];
