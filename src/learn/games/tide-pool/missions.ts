import type { CreateContext, LearnOptions, Outcome } from "../../types";
import { pickItems } from "../../skills";
import { exact, integer, prediction } from "../../kit/science";
import type { AnswerPicture, Creature, MissionId } from "./engine";

/**
 * Expanded Tide Pool Lab content bank + native Levels 4 & 5 multi-rule habitat/trait sorting engine.
 * - 8 new Guam/island L1–3 observation missions (plus the 7 core missions in engine.ts = 15 L1–3 missions).
 * - 12 native L4–5 habitat/trait classification & reef-zone sorting missions (6 Level 4 + 6 Level 5).
 * Total: 27 distinct Tide Pool Lab missions spanning Levels 1–5.
 */
export type ExtraPoolMission = {
  id: string;
  kind: "guess";
  pace: 0 | 1 | 2;
  skill: string;
  question: string;
  options: readonly { picture: AnswerPicture; label: string }[];
  right: number;
  change: string;
  why: string;
  /** Which PoolScene visual template to render. */
  scene: MissionId;
  beforeCreatures: readonly Creature[];
  afterCreatures: readonly Creature[];
};

export const EXTRA_POOL_MISSIONS: readonly ExtraPoolMission[] = [
  {
    id: "star-grip",
    kind: "guess",
    pace: 0,
    skill: "sci.ocean-habitat",
    question: "How does a sea star hold rocks?",
    options: [
      { picture: "sea-star", label: "Tiny tube feet" },
      { picture: "cloud", label: "Floating up" },
      { picture: "sand", label: "Burying deep" },
    ],
    right: 0,
    change: "Watch the sea star",
    why: "Sea stars grip wet reef rocks with hundreds of tiny suction feet so waves do not wash them away.",
    scene: "tide",
    beforeCreatures: ["sea-star", "seaweed"],
    afterCreatures: ["sea-star", "seaweed"],
  },
  {
    id: "crab-molt",
    kind: "guess",
    pace: 0,
    skill: "sci.living-needs",
    question: "Why do hermit crabs swap shells?",
    options: [
      { picture: "shell", label: "They grow bigger" },
      { picture: "sun", label: "Too much sun" },
      { picture: "fish", label: "To swim fast" },
    ],
    right: 0,
    change: "Check the shells",
    why: "As a hermit crab grows, its old shell gets tight, so it searches the pool for a larger empty shell.",
    scene: "crab",
    beforeCreatures: ["sea-star", "seaweed"],
    afterCreatures: ["sea-star", "seaweed", "crab"],
  },
  {
    id: "seaweed-hide",
    kind: "guess",
    pace: 0,
    skill: "sci.ocean-habitat",
    question: "Where can tiny fish hide safely?",
    options: [
      { picture: "seaweed", label: "In seaweed" },
      { picture: "air", label: "Above water" },
      { picture: "sun", label: "On dry sand" },
    ],
    right: 0,
    change: "Watch the fish",
    why: "Thick seaweed fronds give small reef fish shady shelter away from bigger hungry fish.",
    scene: "seaweed",
    beforeCreatures: ["seaweed", "fish"],
    afterCreatures: ["seaweed", "fish"],
  },
  {
    id: "rock-shade",
    kind: "guess",
    pace: 1,
    skill: "sci.cause-effect",
    question: "What keeps pools cool at noon?",
    options: [
      { picture: "cloud", label: "Shade and clouds" },
      { picture: "sun", label: "Hot midday sun" },
      { picture: "sand", label: "Dry beach sand" },
    ],
    right: 0,
    change: "Check the shade",
    why: "Overhanging rocks and passing clouds shade shallow pools so the water does not overheat at low tide.",
    scene: "seaweed",
    beforeCreatures: ["coral", "seaweed"],
    afterCreatures: ["coral", "seaweed"],
  },
  {
    id: "tide-return",
    kind: "guess",
    pace: 1,
    skill: "sci.ocean-habitat",
    question: "What brings fresh water back in?",
    options: [
      { picture: "deep", label: "High tide waves" },
      { picture: "sand", label: "Dry sand" },
      { picture: "air", label: "Still air" },
    ],
    right: 0,
    change: "Watch the tide",
    why: "When high tide returns, fresh ocean waves refill tide pools with cool water, oxygen, and tiny food.",
    scene: "tide",
    beforeCreatures: ["sea-star", "fish", "seaweed"],
    afterCreatures: ["sea-star", "fish", "seaweed"],
  },
  {
    id: "algae-clean",
    kind: "guess",
    pace: 1,
    skill: "sci.living-needs",
    question: "How do snails help rocky pools?",
    options: [
      { picture: "algae", label: "Graze extra algae" },
      { picture: "cloud", label: "Make rain clouds" },
      { picture: "low", label: "Drain the water" },
    ],
    right: 0,
    change: "Watch the snail",
    why: "Snails scrape green algae off rocks, keeping space clear so baby corals and barnacles can settle.",
    scene: "snail",
    beforeCreatures: ["fish"],
    afterCreatures: ["fish", "snail"],
  },
  {
    id: "coral-food",
    kind: "guess",
    pace: 2,
    skill: "sci.living-needs",
    question: "What tiny helpers live inside coral?",
    options: [
      { picture: "algae", label: "Sunlit tiny algae" },
      { picture: "sand", label: "Dry sand grains" },
      { picture: "shell", label: "Empty shells" },
    ],
    right: 0,
    change: "Look at coral",
    why: "Tiny algae living inside reef coral use sunlight to share food and give healthy coral its warm color.",
    scene: "coral",
    beforeCreatures: ["coral", "seaweed", "fish"],
    afterCreatures: ["coral", "seaweed", "fish"],
  },
  {
    id: "rain-pool",
    kind: "guess",
    pace: 2,
    skill: "sci.cause-effect",
    question: "Heavy rain hits a shallow pool.",
    options: [
      { picture: "water", label: "Fresh water mixes in" },
      { picture: "big-coral", label: "Coral dries out" },
      { picture: "sand", label: "Rocks turn to sand" },
    ],
    right: 0,
    change: "Watch the rain",
    why: "A tropical downpour adds fresh rainwater on top of a shallow pool until the next high tide mixes seawater back in.",
    scene: "tide",
    beforeCreatures: ["sea-star", "fish", "seaweed"],
    afterCreatures: ["sea-star", "fish", "seaweed"],
  },
];

// ---- Native Levels 4 & 5: Multi-rule habitat & trait classification missions (12 missions) ----

export const TIDE_CLASSIFY_ROUND = 4;
export type TideClassifyLevel = 4 | 5;

export type ClassifySpecimen = {
  id: string;
  creature: Creature;
  name: string;
  traits: string;
  /** Correct bucket index (0 or 1). */
  bucket: 0 | 1;
};

export type TideClassifyMission = {
  id: string;
  level: TideClassifyLevel;
  skill: string;
  title: string;
  prompt: string;
  /** Two habitat / trait classification buckets shown on the tide-pool bench. */
  buckets: readonly [
    { label: string; rule: string },
    { label: string; rule: string },
  ];
  /** 3 or 4 reef specimens to classify into the two buckets. */
  specimens: readonly ClassifySpecimen[];
  /** Opt-in classification rule clue (never tells which exact bucket an individual specimen goes in). */
  hint: string;
  /** Reef ecology explanation shown once all specimens are sorted accurately. */
  why: string;
};

export const TIDE_CLASSIFY_MISSIONS: readonly TideClassifyMission[] = [
  // ---- Level 4: Habitat zones, feeding roles & survival traits (6 missions) ----
  {
    id: "tc4-producer-consumer",
    level: 4,
    skill: "sci.living-needs",
    title: "Sunlight makers vs eaters",
    prompt: "Sort each tide-pool resident: makes food from sunlight, or must eat other living things?",
    buckets: [
      { label: "Uses sunlight", rule: "Produces food with light" },
      { label: "Eats food", rule: "Grazes or hunts to eat" },
    ],
    specimens: [
      { id: "s1", creature: "seaweed", name: "Seaweed", traits: "Green blades in bright shallow water", bucket: 0 },
      { id: "s2", creature: "snail", name: "Reef snail", traits: "Scrapes algae off wet rocks", bucket: 1 },
      { id: "s3", creature: "crab", name: "Hermit crab", traits: "Scavenges tiny bits on the sand", bucket: 1 },
      { id: "s4", creature: "fish", name: "Damselfish", traits: "Nibbles algae and tiny plankton", bucket: 1 },
    ],
    hint: "Plants and algae build food from sunlight; animals must eat plants, algae, or other animals.",
    why: "Seaweed is a producer powered by sunlight, while snails, crabs, and fish are consumers that eat to get energy.",
  },
  {
    id: "tc4-shell-soft",
    level: 4,
    skill: "sci.ocean-habitat",
    title: "Hard cover vs open body",
    prompt: "Sort each creature by whether it carries or builds a hard outer cover for protection.",
    buckets: [
      { label: "Hard cover", rule: "Shell or stony skeleton" },
      { label: "No shell", rule: "Swims, grips, or sways freely" },
    ],
    specimens: [
      { id: "s1", creature: "snail", name: "Top snail", traits: "Pulls inside a spiral shell at low tide", bucket: 0 },
      { id: "s2", creature: "crab", name: "Hermit crab", traits: "Tucks into a borrowed sea shell", bucket: 0 },
      { id: "s3", creature: "coral", name: "Branching coral", traits: "Builds a stony limestone frame", bucket: 0 },
      { id: "s4", creature: "fish", name: "Lagoon fish", traits: "Darts between rocks with fins", bucket: 1 },
    ],
    hint: "Check which residents wear a shell or build hard stony reef walls versus swimming freely.",
    why: "Hard shells and stony skeletons protect slow or anchored reef life from waves and predators.",
  },
  {
    id: "tc4-anchored-mobile",
    level: 4,
    skill: "sci.ocean-habitat",
    title: "Stays put vs moves around",
    prompt: "Sort each reef resident: anchored in one spot, or moves through the pool to find food?",
    buckets: [
      { label: "Anchored", rule: "Stays attached to rock" },
      { label: "Moves around", rule: "Crawls or swims across pool" },
    ],
    specimens: [
      { id: "s1", creature: "coral", name: "Reef coral", traits: "Grows fixed onto reef rock", bucket: 0 },
      { id: "s2", creature: "seaweed", name: "Sargassum", traits: "Holdfast grips the rocky bottom", bucket: 0 },
      { id: "s3", creature: "sea-star", name: "Blue sea star", traits: "Glides slowly on tube feet", bucket: 1 },
      { id: "s4", creature: "crab", name: "Shore crab", traits: "Scuttles sideways between crevices", bucket: 1 },
    ],
    hint: "Think about which living things stay rooted to one rock their whole adult life.",
    why: "Coral and seaweed stay anchored to catch light and flowing water, while sea stars and crabs move to forage.",
  },
  {
    id: "tc4-low-tide-risk",
    level: 4,
    skill: "sci.cause-effect",
    title: "Low-tide survival check",
    prompt: "At a very low noon tide, sort who handles brief shallow exposure vs who needs steady water coverage.",
    buckets: [
      { label: "Tolerates low tide", rule: "Seals in moisture or hides damp" },
      { label: "Needs steady water", rule: "Must stay underwater to breathe/thrive" },
    ],
    specimens: [
      { id: "s1", creature: "snail", name: "Periwinkle snail", traits: "Seals shell door tight against dry air", bucket: 0 },
      { id: "s2", creature: "crab", name: "Hermit crab", traits: "Carries damp shell and hides under rock", bucket: 0 },
      { id: "s3", creature: "fish", name: "Reef fish", traits: "Needs flowing seawater across gills", bucket: 1 },
      { id: "s4", creature: "coral", name: "Shallow coral", traits: "Stressed quickly by hot dry midday air", bucket: 1 },
    ],
    hint: "Check which animals can close up or hold damp water inside a shell versus needing underwater flow.",
    why: "Intertidal snails and crabs seal in moisture during low tide, while fish and reef coral rely on steady seawater.",
  },
  {
    id: "tc4-grazers-hunters",
    level: 4,
    skill: "sci.living-needs",
    title: "Algae grazers vs reef partners",
    prompt: "Sort who mainly grazes algae off reef rocks vs who builds or shelters the habitat itself.",
    buckets: [
      { label: "Algae grazer", rule: "Keeps rock algae trimmed" },
      { label: "Habitat builder", rule: "Creates shelter on the reef" },
    ],
    specimens: [
      { id: "s1", creature: "snail", name: "Grazer snail", traits: "Rasps green film off boulders", bucket: 0 },
      { id: "s2", creature: "fish", name: "Baby parrotfish", traits: "Nibbles turf algae off coral rock", bucket: 0 },
      { id: "s3", creature: "coral", name: "Staghorn coral", traits: "Forms hiding branches for fish", bucket: 1 },
      { id: "s4", creature: "seaweed", name: "Reef seaweed", traits: "Creates shaded beds for juveniles", bucket: 1 },
    ],
    hint: "Separate animals that mow down algae from organisms whose bodies form shelter for others.",
    why: "Grazers keep fast-growing algae in check so habitat builders like coral have space and light.",
  },
  {
    id: "tc4-water-clues",
    level: 4,
    skill: "sci.cause-effect",
    title: "Healthy reef vs stressed reef",
    prompt: "Sort each tide-pool observation into signs of a healthy pool or signs of heat/low-water stress.",
    buckets: [
      { label: "Healthy pool", rule: "Clear, cool, active reef life" },
      { label: "Stressed pool", rule: "Overheated or overcrowded algae" },
    ],
    specimens: [
      { id: "s1", creature: "coral", name: "Bright coral", traits: "Rich color with active reef fish nearby", bucket: 0 },
      { id: "s2", creature: "fish", name: "Darting fish", traits: "Swimming briskly through clear waves", bucket: 0 },
      { id: "s3", creature: "seaweed", name: "Smothering bloom", traits: "Thick warm algae covering reef rock", bucket: 1 },
      { id: "s4", creature: "sea-star", name: "Stranded star", traits: "Left high in hot dry midday sun", bucket: 1 },
    ],
    hint: "Compare thriving water conditions with heat, drying, or overgrowth stress.",
    why: "Watching coral color, water clarity, and animal movement helps island scientists spot reef stress early.",
  },

  // ---- Level 5: Multi-rule reef ecology & dual-condition classification (6 missions) ----
  {
    id: "tc5-two-rule-zone",
    level: 5,
    skill: "sci.ocean-habitat",
    title: "Two-rule check: Sunlit AND Anchored",
    prompt: "Bucket A needs BOTH: stays anchored to rock AND depends on sunlight for food. Everything else goes in Bucket B.",
    buckets: [
      { label: "Anchored + Sunlight", rule: "Must fit BOTH rules" },
      { label: "Other residents", rule: "Moves OR does not use sunlight" },
    ],
    specimens: [
      { id: "s1", creature: "coral", name: "Reef coral", traits: "Anchored to rock; tiny algae inside use sunlight", bucket: 0 },
      { id: "s2", creature: "seaweed", name: "Seaweed", traits: "Anchored by holdfast; uses sunlight to grow", bucket: 0 },
      { id: "s3", creature: "fish", name: "Reef fish", traits: "Swims through sunlit water; eats algae", bucket: 1 },
      { id: "s4", creature: "snail", name: "Tide snail", traits: "Crawls on sunlit rocks; scrapes algae", bucket: 1 },
    ],
    hint: "Test BOTH conditions for every specimen — if it moves around, it fails the 'Anchored' rule!",
    why: "Only coral and seaweed satisfy both rules: staying fixed in place and relying directly on sunlight energy.",
  },
  {
    id: "tc5-two-rule-mobile-shell",
    level: 5,
    skill: "sci.ocean-habitat",
    title: "Two-rule check: Moves AND Uses a Shell",
    prompt: "Bucket A needs BOTH: crawls on its own AND carries a protective shell. Put all others in Bucket B.",
    buckets: [
      { label: "Moves + Shell", rule: "Crawls AND wears a shell" },
      { label: "Other residents", rule: "Anchored OR no shell" },
    ],
    specimens: [
      { id: "s1", creature: "snail", name: "Reef snail", traits: "Crawls on a muscular foot inside its shell", bucket: 0 },
      { id: "s2", creature: "crab", name: "Hermit crab", traits: "Walks across sand inside a borrowed shell", bucket: 0 },
      { id: "s3", creature: "sea-star", name: "Sea star", traits: "Crawls on tube feet; tough skin, no shell", bucket: 1 },
      { id: "s4", creature: "coral", name: "Branching coral", traits: "Hard stony frame, but stays anchored", bucket: 1 },
    ],
    hint: "A sea star moves without a shell, and coral has a hard frame without moving — check BOTH rules!",
    why: "Snails and hermit crabs combine mobility with portable shell armor to survive changing tide-pool conditions.",
  },
  {
    id: "tc5-reef-steward",
    level: 5,
    skill: "sci.cause-effect",
    title: "Guam reef stewardship sorting",
    prompt: "Sort each visitor action at Tumon or Piti reef: protects the habitat, or harms fragile reef life?",
    buckets: [
      { label: "Protects reef", rule: "Keeps creatures safe at home" },
      { label: "Harms reef", rule: "Damages or stresses reef life" },
    ],
    specimens: [
      { id: "s1", creature: "sea-star", name: "Look, don't lift", traits: "Kneeling to sketch a sea star in water", bucket: 0 },
      { id: "s2", creature: "crab", name: "Leave empty shells", traits: "Leaving beach shells for growing crabs", bucket: 0 },
      { id: "s3", creature: "coral", name: "Standing on coral", traits: "Stepping on living coral heads while snorkeling", bucket: 1 },
      { id: "s4", creature: "fish", name: "Feeding bread", traits: "Tossing human snacks to wild reef fish", bucket: 1 },
    ],
    hint: "Ask whether each choice leaves animals and shells undisturbed in their natural habitat.",
    why: "Looking without touching, leaving shells on the shore, and floating clear of coral keeps Guam's reefs thriving.",
  },
  {
    id: "tc5-heat-response",
    level: 5,
    skill: "sci.cause-effect",
    title: "Warming wave impact",
    prompt: "When reef water stays unusually hot for weeks, sort who can swim/move to cooler spots vs who cannot relocate.",
    buckets: [
      { label: "Can move cooler", rule: "Swims or crawls to deeper shade" },
      { label: "Cannot relocate", rule: "Fixed in place when water warms" },
    ],
    specimens: [
      { id: "s1", creature: "fish", name: "Parrotfish", traits: "Swims out to deeper, cooler reef slopes", bucket: 0 },
      { id: "s2", creature: "crab", name: "Reef crab", traits: "Crawls deeper into shaded rock ledges", bucket: 0 },
      { id: "s3", creature: "coral", name: "Shallow coral", traits: "Fixed to rock; risks losing algae helpers", bucket: 1 },
      { id: "s4", creature: "seaweed", name: "Anchored seaweed", traits: "Held onto one boulder during heat waves", bucket: 1 },
    ],
    hint: "Compare mobile swimmers and crawlers with anchored reef builders during a long heat wave.",
    why: "Because corals cannot swim away from prolonged hot water, keeping reef water clean and cool protects the whole web.",
  },
  {
    id: "tc5-night-day",
    level: 5,
    skill: "sci.living-needs",
    title: "Food-web chain check",
    prompt: "Sort each pair: directly connected in a reef feeding link, or NOT a real feeding link?",
    buckets: [
      { label: "Real feeding link", rule: "Food flows to the eater" },
      { label: "Not a feeding link", rule: "Does not eat that item" },
    ],
    specimens: [
      { id: "s1", creature: "snail", name: "Algae → Snail", traits: "Snail grazes green algae off rocks", bucket: 0 },
      { id: "s2", creature: "fish", name: "Seaweed → Grazer fish", traits: "Herbivore fish nibbles algae fronds", bucket: 0 },
      { id: "s3", creature: "seaweed", name: "Fish → Seaweed", traits: "Seaweed does not hunt fish; it uses light", bucket: 1 },
      { id: "s4", creature: "crab", name: "Rocks → Crab", traits: "Crabs hide under rocks, not eat solid stone", bucket: 1 },
    ],
    hint: "Check whether the second organism actually gets food energy from the first!",
    why: "Food links trace energy from sunlight and algae into grazers and predators — rocks and reversed arrows do not feed.",
  },
  {
    id: "tc5-resilience",
    level: 5,
    skill: "sci.ocean-habitat",
    title: "Dual check: Animal AND Needs Seawater",
    prompt: "Bucket A needs BOTH: an animal (not a plant/algae) AND needs seawater to survive. Sort carefully!",
    buckets: [
      { label: "Animal + Seawater", rule: "Living animal that relies on ocean" },
      { label: "Not an animal", rule: "Algae or seaweed producer" },
    ],
    specimens: [
      { id: "s1", creature: "coral", name: "Reef coral", traits: "Tiny colonial animals building stony reefs", bucket: 0 },
      { id: "s2", creature: "sea-star", name: "Blue sea star", traits: "Ocean animal breathing through water", bucket: 0 },
      { id: "s3", creature: "fish", name: "Lagoon fish", traits: "Ocean animal breathing with gills", bucket: 0 },
      { id: "s4", creature: "seaweed", name: "Reef seaweed", traits: "Marine algae producer, not an animal", bucket: 1 },
    ],
    hint: "Watch the trick: reef coral looks like rock or plants, yet coral polyps are living animals!",
    why: "Coral polyps are tiny marine animals that partner with microscopic algae — seaweed is an algae producer, not an animal.",
  },
];

export const tideClassifyById = (id: unknown): TideClassifyMission | undefined =>
  typeof id === "string" ? TIDE_CLASSIFY_MISSIONS.find((m) => m.id === id) : undefined;

export type TideClassifyState = {
  kind: "tide-classify";
  level: TideClassifyLevel;
  starter: 0 | 1;
  ids: string[];
  index: number;
  /** Assigned bucket (0 | 1 | null) for each specimen of the current mission. */
  placed: (0 | 1 | null)[];
  /** True after a missed Check until the player changes an assignment. */
  checkedWrong: boolean;
  /** True once the child tapped opt-in Help on this mission. */
  helped: boolean;
  /** True once all specimens are correctly classified and checked. */
  solved: boolean;
  /** One entry per completed mission: true iff checked right on first try without Help. */
  clean: boolean[];
};

export const isTideClassify = (s: unknown): s is TideClassifyState =>
  !!s && typeof s === "object" && (s as { kind?: unknown }).kind === "tide-classify";

export const tideClassifyDone = (s: TideClassifyState) => s.index >= s.ids.length;

export const tideClassifyMission = (s: TideClassifyState): TideClassifyMission | undefined =>
  tideClassifyById(s.ids[s.index]);

export const tideClassifyTurn = (s: TideClassifyState): 0 | 1 =>
  ((s.starter + Math.min(s.index, Math.max(0, s.ids.length - 1))) % 2) as 0 | 1;

export function createTideClassify(level: TideClassifyLevel, c: CreateContext<unknown>): TideClassifyState {
  const prev = isTideClassify(c.previous) ? new Set(c.previous.ids) : new Set<string>();
  const pool = TIDE_CLASSIFY_MISSIONS.filter((m) => m.level === level);
  const fresh = pool.filter((m) => !prev.has(m.id));
  const picked = pickItems(fresh.length >= TIDE_CLASSIFY_ROUND ? fresh : pool, c.skills, TIDE_CLASSIFY_ROUND, c.rng, c.today);
  return {
    kind: "tide-classify",
    level,
    starter: c.starter,
    ids: picked.map((m) => m.id),
    index: 0,
    placed: picked[0].specimens.map(() => null),
    checkedWrong: false,
    helped: false,
    solved: false,
    clean: [],
  };
}

export function tideClassifyPlace(s: TideClassifyState, specimenIdx: number, bucket: 0 | 1): TideClassifyState {
  const m = tideClassifyMission(s);
  if (!m || s.solved || !integer(specimenIdx, 0, m.specimens.length - 1) || (bucket !== 0 && bucket !== 1)) return s;
  const placed = [...s.placed];
  placed[specimenIdx] = bucket;
  return { ...s, placed, checkedWrong: false };
}

export const tideClassifyReady = (s: TideClassifyState): boolean => {
  const m = tideClassifyMission(s);
  return !!m && !s.solved && s.placed.length === m.specimens.length && s.placed.every((b) => b === 0 || b === 1);
};

export function tideClassifyCheck(s: TideClassifyState): TideClassifyState {
  const m = tideClassifyMission(s);
  if (!m || !tideClassifyReady(s)) return s;
  const allRight = m.specimens.every((sp, i) => s.placed[i] === sp.bucket);
  if (allRight) {
    return { ...s, solved: true, checkedWrong: false };
  }
  return { ...s, checkedWrong: true, helped: true };
}

export function tideClassifyHelp(s: TideClassifyState): TideClassifyState {
  if (tideClassifyDone(s) || s.solved || s.helped) return s;
  return { ...s, helped: true };
}

export function tideClassifyNext(s: TideClassifyState): TideClassifyState {
  if (tideClassifyDone(s) || !s.solved) return s;
  const nextIndex = s.index + 1;
  const nextMission = tideClassifyById(s.ids[nextIndex]);
  return {
    ...s,
    index: nextIndex,
    placed: nextMission ? nextMission.specimens.map(() => null) : [],
    checkedWrong: false,
    helped: false,
    solved: false,
    clean: [...s.clean, !s.helped],
  };
}

export function validTideClassify(v: unknown, level: TideClassifyLevel): v is TideClassifyState {
  if (!exact(v, ["kind", "level", "starter", "ids", "index", "placed", "checkedWrong", "helped", "solved", "clean"])) {
    return false;
  }
  const s = v as unknown as TideClassifyState;
  if (
    s.kind !== "tide-classify" ||
    s.level !== level ||
    !prediction(s.starter) ||
    !Array.isArray(s.ids) ||
    s.ids.length !== TIDE_CLASSIFY_ROUND ||
    new Set(s.ids).size !== TIDE_CLASSIFY_ROUND ||
    !s.ids.every((id) => tideClassifyById(id)?.level === level) ||
    !integer(s.index, 0, TIDE_CLASSIFY_ROUND) ||
    typeof s.checkedWrong !== "boolean" ||
    typeof s.helped !== "boolean" ||
    typeof s.solved !== "boolean" ||
    !Array.isArray(s.clean) ||
    s.clean.length !== s.index ||
    !s.clean.every((b) => typeof b === "boolean")
  ) {
    return false;
  }
  if (s.index === TIDE_CLASSIFY_ROUND) {
    return Array.isArray(s.placed) && s.placed.length === 0 && !s.checkedWrong && !s.helped && !s.solved;
  }
  const m = tideClassifyMission(s)!;
  if (
    !Array.isArray(s.placed) ||
    s.placed.length !== m.specimens.length ||
    !s.placed.every((b) => b === null || b === 0 || b === 1)
  ) {
    return false;
  }
  if (s.solved && !m.specimens.every((sp, i) => s.placed[i] === sp.bucket)) return false;
  if (s.checkedWrong && (s.solved || !s.helped)) return false;
  return true;
}

export const tideClassifyOutcome = (s: TideClassifyState, _o: LearnOptions): Outcome =>
  tideClassifyDone(s) ? "done" : null;
