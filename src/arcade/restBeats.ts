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

const songPhrases = "Phrase count is a within-world wave: levels 1–5 play three phrases and 6–8 play four, so each world restarts it. AR-02 re-measures Shell Song in motif units.";
const flightTarget = "World entry target drops by 2 while speed rises and openings narrow. The spec's target continuity rule, target[i] = max(authored, previous), is AR-07's change.";
const runTarget = "World entry target drops by 2 while speed and chunk demands rise. Target continuity is AR-08's change, re-certified with the Lagoon witnesses.";
const cargoTarget = "Ordinary target drops by one at each world while junk and tides grow. The spec's max rule for Cargo targets, with re-certified budgets, is AR-09's change.";

export const restBeats: readonly EasingNote[] = [
  // Shell Song: each world adds a voice or a new way to listen, so the first phrase is shorter.
  beat("shell-song", "w2-1", "units", 28.6, "a fourth shell", "The new voice is easier to learn on a shorter phrase."),
  beat("shell-song", "w3-1", "units", 25, "a fifth shell", "The new voice is easier to learn on a shorter phrase."),
  beat("shell-song", "w4-1", "units", 33.4, "call and response", "Each round is a new call instead of a growing song, so it starts short."),
  beat("shell-song", "w5-1", "units", 22.3, "paired echoes", "Paired notes double the taps, so the number of things to remember starts lower."),
  ...each({ "w2-1": 25, "w3-1": 25, "w4-1": 25, "w5-1": 25, "w6-1": 25 }, (level, upTo) => owned("shell-song", level, "phrases", upTo, "AR-02", songPhrases)),
  owned("shell-song", "w2-1", "noteMs", 16.3, "AR-02", "World 2 starts 40 ms faster, but its fastest note is 70 ms slower than World 1's last: World 1 shortens notes by 50 ms a phrase over four phrases, World 2 by 20 ms over three. AR-02 keeps playback tempo and recall load separate."),
  owned("shell-song", "w3-1", "noteMs", 2.5, "AR-02", "World 3 starts 10 ms faster, but with three phrases instead of four its fastest note is 10 ms slower than World 2's last. AR-02 keeps playback tempo and recall load separate."),
  owned("shell-song", "w4-1", "noteMs", 11.8, "AR-02", "Call and response starts 22 ms slower than the end of World 3, and its fastest note is 42 ms slower. AR-02 keeps playback tempo and recall load separate."),
  owned("shell-song", "w5-1", "noteMs", 6.6, "AR-02", "Paired echoes start 2 ms slower than the end of World 4, and their fastest note is 22 ms slower. AR-02 keeps playback tempo and recall load separate."),
  owned("shell-song", "w6-1", "noteMs", 7.4, "AR-02", "The finale starts 2 ms slower than the end of World 5, and its fastest note is 22 ms slower. AR-02 keeps playback tempo and recall load separate."),
  // Rail Parade.
  ...each({ "w4-1": 8.9, "w5-1": 5.8, "w6-1": 2.2 }, (level, upTo) => owned("rail-parade", level, "tick", upTo, "AR-03", "Step time resets slower when a new garden arrives. AR-03 applies tick[i] = min(authored, previous) and re-certifies the scored seed pool.")),
  beat("rail-parade", "learn-5", "food", 40, "spelling words", "Learn levels 5–8 switch from counting to spelling three-sound words, so there are three stops instead of five."),
  // Crab Crossing.
  ...each({ "w4-1": 3.1, "w5-1": 2.8, "w6-1": 4.4 }, (level, upTo) => owned("crab-crossing", level, "speed", upTo, "AR-04", "Lane speed resets lower at the world boundary. AR-04 applies speed[i] = max(authored, previous) and certifies hop budgets.")),
  ...each({ "w4-1": 3.2, "w5-1": 2.9, "w6-1": 4.7 }, (level, upTo) => owned("crab-crossing", level, "period", upTo, "AR-04", "The shortest lane period follows the lane speed reset. AR-04's speed continuity removes it.")),
  beat("crab-crossing", "w6-1", "lanes", 12.5, "island hopping", "Still islands replace one moving canoe lane, so there is one fewer moving lane while children learn to hop between islands."),
  // Palm Patrol: march speed eases slightly while each world adds a new kind of beetle behaviour.
  beat("palm-patrol", "w2-1", "speed", 3.6, "diving beetles", "March speed eases by 1.7 px/s while beetles start diving out of formation."),
  beat("palm-patrol", "w3-1", "speed", 3.2, "armored beetles", "March speed eases by 1.7 px/s while armored beetles need two nets."),
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
