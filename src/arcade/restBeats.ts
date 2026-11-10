import type { EasingNote } from "./boundaries";
/**
 * Reviewed reasons for every easing in the generated boundary table (AR-00).
 * A rest beat eases one parameter while the world teaches something new. Every other
 * easing names the ledger row that owns its fix; that row deletes the note when it lands,
 * and a note with no matching easing fails the build.
 */
const beat = (game: EasingNote["game"], level: EasingNote["level"], metric: string, teaches: string, reason: string): EasingNote => ({ game, level, metric, restBeat: { teaches, reason } });
const owned = (game: EasingNote["game"], level: EasingNote["level"], metric: string, owner: string, reason: string): EasingNote => ({ game, level, metric, owner, reason });
const worlds = ["w2-1", "w3-1", "w4-1", "w5-1", "w6-1"] as const;

const songPhrases = "Phrase count is a within-world wave: levels 1–5 play three phrases and 6–8 play four, so each world restarts it. AR-02 re-measures Shell Song in motif units.";
const flightTarget = "World entry target drops by 2 while speed rises and openings narrow. The spec's target continuity rule, target[i] = max(authored, previous), is AR-07's change.";
const runTarget = "World entry target drops by 2 while speed and chunk demands rise. Target continuity is AR-08's change, re-certified with the Lagoon witnesses.";
const cargoTarget = "Ordinary target drops by one at each world while junk and tides grow. The spec's max rule for Cargo targets, with re-certified budgets, is AR-09's change.";

export const restBeats: readonly EasingNote[] = [
  // Shell Song: each world adds a voice or a new way to listen, so the first phrase is shorter.
  beat("shell-song", "w2-1", "units", "a fourth shell", "The new voice is easier to learn on a shorter phrase."),
  beat("shell-song", "w3-1", "units", "a fifth shell", "The new voice is easier to learn on a shorter phrase."),
  beat("shell-song", "w4-1", "units", "call and response", "Each round is a new call instead of a growing song, so it starts short."),
  beat("shell-song", "w5-1", "units", "paired echoes", "Paired notes double the taps, so the number of things to remember starts lower."),
  ...worlds.map(level => owned("shell-song", level, "phrases", "AR-02", songPhrases)),
  owned("shell-song", "w4-1", "noteMs", "AR-02", "Call and response starts 22 ms slower than the end of World 3. AR-02 keeps playback tempo and recall load separate."),
  owned("shell-song", "w5-1", "noteMs", "AR-02", "Paired echoes start 2 ms slower than the end of World 4. AR-02 keeps playback tempo and recall load separate."),
  owned("shell-song", "w6-1", "noteMs", "AR-02", "The finale starts 2 ms slower than the end of World 5. AR-02 keeps playback tempo and recall load separate."),
  // Rail Parade.
  ...(["w4-1", "w5-1", "w6-1"] as const).map(level => owned("rail-parade", level, "tick", "AR-03", "Step time resets slower when a new garden arrives. AR-03 applies tick[i] = min(authored, previous) and re-certifies the scored seed pool.")),
  beat("rail-parade", "learn-5", "food", "spelling words", "Learn levels 5–8 switch from counting to spelling three-sound words, so there are three stops instead of five."),
  // Crab Crossing.
  ...(["w4-1", "w5-1", "w6-1"] as const).flatMap(level => [
    owned("crab-crossing", level, "speed", "AR-04", "Lane speed resets lower at the world boundary. AR-04 applies speed[i] = max(authored, previous) and certifies hop budgets."),
    owned("crab-crossing", level, "period", "AR-04", "The shortest lane period follows the lane speed reset. AR-04's speed continuity removes it."),
  ]),
  beat("crab-crossing", "w6-1", "lanes", "island hopping", "Still islands replace one moving canoe lane, so there is one fewer moving lane while children learn to hop between islands."),
  // Palm Patrol: march speed eases slightly while each world adds a new kind of beetle behaviour.
  beat("palm-patrol", "w2-1", "speed", "diving beetles", "March speed eases by 1.7 px/s while beetles start diving out of formation."),
  beat("palm-patrol", "w3-1", "speed", "armored beetles", "March speed eases by 1.7 px/s while armored beetles need two nets."),
  beat("palm-patrol", "w4-1", "speed", "aimed tosses", "March speed eases by 1.7 px/s while the toss starts aiming."),
  beat("palm-patrol", "w5-1", "speed", "shield gaps", "March speed eases by 1.7 px/s while shield gaps change the safe toss paths."),
  beat("palm-patrol", "w6-1", "speed", "a fourth wave", "March speed eases by 1.7 px/s while every level adds a fourth wave."),
  // Beach Ball.
  ...worlds.map(level => owned("beach-ball", level, "serve", "AR-06", "Serve speed resets 8 px/s lower at every world. AR-06 applies speed[i] = max(authored, previous) and checks two-ball timing.")),
  beat("beach-ball", "w3-1", "wind", "a second ball", "Wind restarts gentler while a second ball joins the rally."),
  beat("beach-ball", "w4-1", "wind", "edge spin", "Wind restarts gentler while edge returns start to spin."),
  beat("beach-ball", "w5-1", "spin", "changing gusts", "Spin restarts gentler while gusts start changing direction."),
  owned("beach-ball", "w5-1", "wind", "AR-06", "Wind also restarts at World 5, alongside the spin rest beat. AR-06 decides wind continuity with serve speed."),
  beat("beach-ball", "w6-1", "spin", "the shifting tide", "Spin restarts gentler while the turtle tide starts moving."),
  owned("beach-ball", "w6-1", "wind", "AR-06", "Wind also restarts at World 6, alongside the spin rest beat. AR-06 decides wind continuity with serve speed."),
  // Fruit Bat Flight and Lagoon Run.
  ...worlds.map(level => owned("fruit-bat-flight", level, "gates", "AR-07", flightTarget)),
  ...worlds.map(level => owned("lagoon-run", level, "markers", "AR-08", runTarget)),
  // Canoe Cargo.
  ...worlds.map(level => owned("canoe-cargo", level, "canoes", "AR-09", cargoTarget)),
  beat("canoe-cargo", "w4-1", "garbage", "narrow tide gaps", "Garbage arrives one load later while the narrow tide and a third junk row arrive."),
  beat("canoe-cargo", "w5-1", "garbage", "shifting tides", "Garbage arrives one load later while the tide starts shifting and a fourth junk row arrives."),
  beat("canoe-cargo", "w6-1", "garbage", "the crowded hold", "Garbage arrives one load later while the hold gets crowded and a fifth junk row arrives."),
  owned("canoe-cargo", "learn-5", "sum", "AR-09", "Learn sums rise 9, 12, 15, 18 and then drop to 12. AR-09 reorders them to 9, 9, 12, 12, 15, 15, 18, 21 with versioned descriptors."),
];
