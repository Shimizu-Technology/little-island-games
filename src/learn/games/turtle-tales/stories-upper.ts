import type { CreateContext } from "../../types";
import type { ReadingQuestion } from "../../reading/provenance";
import { bools, exact, integer, seat } from "../../kit/reading";

/**
 * Turtle Tales Levels 4 & 5: rich island & everyday passage stories with sequence,
 * inference, motive, and evidence questions. On opt-in Help, the exact supporting
 * sentence inside the passage lights up — never before the child asks.
 * Completely untimed; pure state & validation.
 */
export type PassageLevel = 4 | 5;
export type PassageSkill = "read.tale-sequence" | "read.tale-inference" | "read.tale-motive" | "read.tale-evidence";

export type PassagePrompt = {
  id: string;
  skill: PassageSkill;
  skillLabel: string;
  question: string;
  options: readonly [string, string, string];
  correctIndex: number;
  evidence: string;
  reason: string;
  /** When built from the pinned inherited growth track, keeps the branded record for brand verification. */
  inheritedRecord?: ReadingQuestion;
};

export type UpperStory = {
  id: string;
  level: PassageLevel;
  title: string;
  body: string;
  source: "inherited" | "island";
  prompts: readonly PassagePrompt[];
};

const SKILL_LABEL: Record<PassageSkill, string> = {
  "read.tale-sequence": "Put story events in order",
  "read.tale-inference": "Infer from story clues",
  "read.tale-motive": "Explain a character's reason",
  "read.tale-evidence": "Find evidence in the passage",
};

function makeStory(
  id: string,
  level: PassageLevel,
  title: string,
  body: string,
  items: readonly [
    key: string,
    kind: "sequence" | "inference" | "motive" | "evidence",
    question: string,
    options: readonly [string, string, string],
    evidence: string,
    reason: string,
  ][],
): UpperStory {
  return {
    id,
    level,
    title,
    body,
    source: "island",
    prompts: items.map(([key, kind, question, options, evidence, reason]) => {
      const skill = `read.tale-${kind}` as PassageSkill;
      return {
        id: `${id}-${key}`,
        skill,
        skillLabel: SKILL_LABEL[skill],
        question,
        options,
        correctIndex: 0,
        evidence,
        reason,
      };
    }),
  };
}

/**
 * Eight original Guam and island-flavored stories (4 Level 4 + 4 Level 5) expanding
 * Turtle Tales alongside the 12 L1-3 picture tales and 8 inherited L4-5 stories (28 total).
 */
export const ISLAND_UPPER_STORIES: readonly UpperStory[] = [
  makeStory(
    "tt-l4-mango-basket",
    4,
    "The Mango Basket",
    "Lina picked ripe mangoes from the backyard tree before lunch. She set the woven basket on the warm porch steps and went inside to wash her hands. When she returned, two mangoes were missing and tiny muddy paw prints led toward the hibiscus hedge. Lina moved the basket onto the high porch table. After lunch, every remaining mango was still safe inside.",
    [
      [
        "sequence",
        "sequence",
        "What did Lina do right after she saw the muddy paw prints?",
        ["She moved the basket onto the high table", "She picked mangoes from the tree", "She ate lunch inside the house"],
        "Lina moved the basket onto the high porch table.",
        "Moving the basket came right after she noticed the missing mangoes and paw prints.",
      ],
      [
        "inference",
        "inference",
        "What most likely took the two mangoes from the low steps?",
        ["A small animal that could reach the steps", "A sudden rainstorm on the porch", "The wind blowing through the door"],
        "When she returned, two mangoes were missing and tiny muddy paw prints led toward the hibiscus hedge.",
        "Tiny paw prints leading into the hedge point to a small animal visiting the low steps.",
      ],
      [
        "evidence",
        "evidence",
        "Which detail shows that moving the basket worked?",
        ["Every remaining mango was still safe after lunch", "The tree grew in the backyard", "Lina washed her hands inside"],
        "After lunch, every remaining mango was still safe inside.",
        "Keeping all the remaining mangoes safe shows the high table solved the problem.",
      ],
    ],
  ),
  makeStory(
    "tt-l4-tumon-tide",
    4,
    "Low Tide at Tumon",
    "Mateo and his aunt walked along Tumon Bay early in the morning. The water was shallow and clear over the reef flat. Mateo pointed to a blue sea star resting beside a smooth rock. He reached down to lift it for a closer look, but his aunt gently shook her head. She explained that sea stars need seawater to breathe. Mateo knelt on the wet sand and drew the sea star in his notebook instead.",
    [
      [
        "motive",
        "motive",
        "Why did Mateo's aunt shake her head when he reached for the sea star?",
        ["Lifting it out of the water could hurt it", "She could not see the sea star clearly", "It was already time to go home"],
        "She explained that sea stars need seawater to breathe.",
        "Keeping the sea star in the water protected it so it could breathe safely.",
      ],
      [
        "sequence",
        "sequence",
        "What did Mateo do after his aunt explained about the sea star?",
        ["He drew the sea star in his notebook", "He carried the sea star to the sand", "He walked to a deeper part of the bay"],
        "Mateo knelt on the wet sand and drew the sea star in his notebook instead.",
        "Drawing in his notebook was how Mateo remembered the sea star without touching it.",
      ],
      [
        "evidence",
        "evidence",
        "Which detail shows how clear the morning water was?",
        ["Mateo spotted a blue sea star beside a rock", "They brought a paper notebook", "His aunt gently shook her head"],
        "The water was shallow and clear over the reef flat.",
        "Clear, shallow water made it easy to spot the sea star on the reef flat.",
      ],
    ],
  ),
  makeStory(
    "tt-l4-coconut-grater",
    4,
    "Grandpa's Kamyo",
    "On Saturday morning, Ana helped Grandpa make fresh coconut milk for kelaguen. Grandpa set his wooden kamyo stool on a clean mat in the shade. He grated half a brown coconut into a wide bowl while Ana held the rim steady. When the bowl filled with fluffy white flakes, Ana poured warm water over them and squeezed the flakes through a clean cloth. Soon the pitcher held rich white milk ready for the kitchen.",
    [
      [
        "sequence",
        "sequence",
        "What happened just before Ana squeezed the coconut flakes?",
        ["She poured warm water over the flakes", "Grandpa set the stool on the mat", "The kitchen lunch was already finished"],
        "When the bowl filled with fluffy white flakes, Ana poured warm water over them and squeezed the flakes through a clean cloth.",
        "Warm water went onto the grated flakes right before squeezing them through the cloth.",
      ],
      [
        "motive",
        "motive",
        "Why did Ana hold the rim of the wide bowl while Grandpa grated?",
        ["To keep the bowl from sliding around", "To hide the flakes from the sun", "To cool down the wooden stool"],
        "He grated half a brown coconut into a wide bowl while Ana held the rim steady.",
        "Holding the rim steady kept the bowl in place to catch the grated coconut.",
      ],
      [
        "inference",
        "inference",
        "Why did they work in the shade instead of the bright noon sun?",
        ["It was cooler and more comfortable for preparing food", "Coconut flakes only come out in the dark", "The clean mat would not fit outside"],
        "Grandpa set his wooden kamyo stool on a clean mat in the shade.",
        "Working in the shade keeps everyone cooler during outdoor island cooking.",
      ],
    ],
  ),
  makeStory(
    "tt-l4-gecko-screen",
    4,
    "The Gecko on the Screen",
    "At dusk, a tiny brown gecko climbed onto the outside of Kai's window screen. Kai switched on his desk lamp to finish drawing a sailboat. Right away, two small moths fluttered toward the glowing glass. The gecko froze, crept closer along the mesh, and snapped up a moth in a flash. Kai smiled and kept the lamp glowing for a few more minutes so his quiet neighbor could finish dinner.",
    [
      [
        "inference",
        "inference",
        "Why did the moths fly straight toward Kai's window?",
        ["They were drawn to the bright desk lamp", "They wanted to land on the sailboat drawing", "Rain pushed them onto the mesh"],
        "Right away, two small moths fluttered toward the glowing glass.",
        "Switching on the lamp made the glass glow, which attracted the night moths.",
      ],
      [
        "motive",
        "motive",
        "Why did Kai leave the desk lamp on a few extra minutes?",
        ["So the gecko could catch more moths to eat", "Because he forgot where the switch was", "To dry the paint on his sailboat"],
        "Kai smiled and kept the lamp glowing for a few more minutes so his quiet neighbor could finish dinner.",
        "Kai realized the lamp brought food to the gecko and kindly left it on longer.",
      ],
      [
        "evidence",
        "evidence",
        "Which detail shows the gecko was on the outside of the house?",
        ["It climbed onto the outside of the window screen", "Kai was drawing at his desk", "The desk lamp lit up the glass"],
        "At dusk, a tiny brown gecko climbed onto the outside of Kai's window screen.",
        "The opening sentence directly states the gecko was on the outside of the screen.",
      ],
    ],
  ),
  makeStory(
    "tt-l5-marker-buoy",
    5,
    "The Reef Marker Buoy",
    "During a windy week, one yellow swim buoy near the channel drifted loose from its anchor line and washed onto the beach. Lifeguards noticed swimmers drifting closer to the boat lane than usual because the boundary looked open. That afternoon, the crew tied a fresh rope to the buoy and anchored it back on the reef edge. The next morning, swimmers stayed neatly inside the marked cove while small fishing boats passed safely outside the line.",
    [
      [
        "inference",
        "inference",
        "Why did swimmers drift closer to the boat lane before the repair?",
        ["Without the yellow buoy, the safe edge was hard to see", "The fishing boats moved onto the beach", "The cove water had turned too shallow to swim"],
        "Lifeguards noticed swimmers drifting closer to the boat lane than usual because the boundary looked open.",
        "The missing buoy removed the clear visual boundary between swimmers and boats.",
      ],
      [
        "sequence",
        "sequence",
        "What happened between the buoy washing ashore and swimmers staying inside the cove?",
        ["The crew tied a fresh rope and re-anchored the buoy", "A windy week began for the first time", "Fishing boats stopped using the channel"],
        "That afternoon, the crew tied a fresh rope to the buoy and anchored it back on the reef edge.",
        "Re-anchoring the buoy restored the visible boundary before the next morning.",
      ],
      [
        "evidence",
        "evidence",
        "Which detail best supports that restoring the buoy improved safety?",
        ["Swimmers stayed inside while boats passed safely outside", "The buoy was painted bright yellow", "Wind blew hard earlier in the week"],
        "The next morning, swimmers stayed neatly inside the marked cove while small fishing boats passed safely outside the line.",
        "Clear separation of swimmers and boats the next morning directly shows the repair worked.",
      ],
    ],
  ),
  makeStory(
    "tt-l5-taro-patch",
    5,
    "Rainwater for the Taro Patch",
    "During the dry months, Uncle Tony's taro patch along the hillside began to crack along its outer rows. Watering every evening with a garden hose took nearly an hour and still left the lower beds dry by noon. Uncle Tony connected a covered rain barrel to the shed gutter and laid narrow bamboo troughs downhill to the soil. After the very next passing shower, the barrel filled and fed steady trickles along the rows, keeping the taro leaves tall and glossy.",
    [
      [
        "inference",
        "inference",
        "What problem did the bamboo troughs help solve besides saving hose time?",
        ["They guided stored rainwater evenly to the lower beds", "They blocked passing showers from reaching the roof", "They made the dry months rain every single hour"],
        "After the very next passing shower, the barrel filled and fed steady trickles along the rows, keeping the taro leaves tall and glossy.",
        "Steady trickles along the rows kept the soil moist instead of drying out quickly.",
      ],
      [
        "motive",
        "motive",
        "Why did Uncle Tony cover the rain barrel?",
        ["To keep leaves, dirt, and mosquitoes out of the stored water", "To stop gutter water from entering the barrel", "To make the barrel heavier than the shed"],
        "Uncle Tony connected a covered rain barrel to the shed gutter and laid narrow bamboo troughs downhill to the soil.",
        "A covered barrel collects clean gutter water while keeping debris and pests out.",
      ],
      [
        "evidence",
        "evidence",
        "Which detail shows the taro plants recovered after the new setup?",
        ["The taro leaves stayed tall and glossy", "The garden hose took nearly an hour", "The hillside rows began to crack"],
        "After the very next passing shower, the barrel filled and fed steady trickles along the rows, keeping the taro leaves tall and glossy.",
        "Tall, glossy leaves are direct evidence that the plants received enough water.",
      ],
    ],
  ),
  makeStory(
    "tt-l5-outrigger-paddle",
    5,
    "The Cracked Outrigger Paddle",
    "Before the community canoe practice, Sora checked every wooden paddle stacked in the boathouse. One cedar paddle looked smooth from a distance, yet when Sora pressed the blade edge she heard a faint creak and spotted a hairline split near the shaft. Her teammate suggested wrapping it in tape for just one quick sprint. Sora shook her head and placed the paddle on the repair rack instead. Halfway through practice, a gusty chop hit the lagoon, and every paddler needed full strength to steer straight back to shore.",
    [
      [
        "motive",
        "motive",
        "Why did Sora refuse to use tape for one quick sprint?",
        ["A split paddle could snap when water conditions got rough", "She wanted to skip practice altogether", "There was no tape anywhere in the boathouse"],
        "Halfway through practice, a gusty chop hit the lagoon, and every paddler needed full strength to steer straight back to shore.",
        "Rough water puts heavy stress on a blade, so a quick tape patch would not be safe.",
      ],
      [
        "sequence",
        "sequence",
        "How did Sora discover the hidden crack before practice started?",
        ["She pressed the blade edge and heard a faint creak", "A gusty chop cracked the paddle on the lagoon", "Her teammate saw it from across the beach"],
        "One cedar paddle looked smooth from a distance, yet when Sora pressed the blade edge she heard a faint creak and spotted a hairline split near the shaft.",
        "Hands-on inspection revealed the hairline split that looked smooth from far away.",
      ],
      [
        "evidence",
        "evidence",
        "Which detail confirms Sora made the right safety call?",
        ["Gusty chop required full paddle strength to steer back", "The paddles were stacked neatly in the boathouse", "Cedar wood looks smooth from a distance"],
        "Halfway through practice, a gusty chop hit the lagoon, and every paddler needed full strength to steer straight back to shore.",
        "Needing full strength in choppy water shows a weakened paddle could have failed.",
      ],
    ],
  ),
  makeStory(
    "tt-l5-typhoon-clocks",
    5,
    "Two Clocks Before the Storm",
    "When the weather service posted a storm watch for the island, Maya's family checked their supply shelf together. Her brother noticed their wall clock ran on household power, so it would stop if the electricity went out overnight. Maya set a small battery clock beside the battery radio and checked the spare batteries in the flashlight. When the power flickered off at midnight, the family still knew the exact hour of each weather broadcast without opening the shutters.",
    [
      [
        "inference",
        "inference",
        "Why did knowing the time matter when the electricity went out?",
        ["So the family could tune in for scheduled weather broadcasts", "So they could open the shutters during the storm", "Because the battery radio only worked at noon"],
        "When the power flickered off at midnight, the family still knew the exact hour of each weather broadcast without opening the shutters.",
        "Weather updates air on a schedule, and the battery clock let them follow safely indoors.",
      ],
      [
        "sequence",
        "sequence",
        "What led Maya to set out the small battery clock?",
        ["Her brother pointed out the wall clock needed household power", "The power flickered off at midnight", "The storm watch ended the next day"],
        "Her brother noticed their wall clock ran on household power, so it would stop if the electricity went out overnight.",
        "Noticing the wall clock depended on power prompted Maya to prepare a battery backup.",
      ],
      [
        "evidence",
        "evidence",
        "Which detail shows the family followed safe storm habits?",
        ["They tracked broadcasts indoors without opening the shutters", "They relied only on the electric wall clock", "They waited until midnight to find batteries"],
        "When the power flickered off at midnight, the family still knew the exact hour of each weather broadcast without opening the shutters.",
        "Keeping shutters closed and listening to official broadcasts is safe storm behavior.",
      ],
    ],
  ),
];

/** Group the 8 pinned inherited L4-5 growth stories (24 branded ReadingQuestions) into UpperStory records. */
export function inheritedUpperStories(
  stretchQuestions: readonly ReadingQuestion[],
  deepQuestions: readonly ReadingQuestion[],
): UpperStory[] {
  const group = (level: PassageLevel, qs: readonly ReadingQuestion[]): UpperStory[] => {
    const byStory = new Map<string, ReadingQuestion[]>();
    for (const q of qs) {
      const storyId = q.id.replace(/-(sequence|inference|motive|evidence)$/, "");
      const list = byStory.get(storyId) ?? [];
      list.push(q);
      byStory.set(storyId, list);
    }
    return [...byStory.entries()].map(([id, items]) => ({
      id,
      level,
      title: items[0].scene?.labels?.[0] ?? id,
      body: items[0].context ?? "",
      source: "inherited" as const,
      prompts: items.map((q) => {
        const quote = q.explanation.match(/^The passage says, "([^"]+)" (.+)$/);
        const labels = q.choices.map((c) => c.label);
        return {
          id: q.id,
          skill: q.skill as PassageSkill,
          skillLabel: q.skillLabel,
          question: q.prompt,
          options: [labels[0] ?? "", labels[1] ?? "", labels[2] ?? ""] as const,
          correctIndex: 0,
          evidence: quote?.[1] ?? "",
          reason: quote?.[2] ?? q.explanation,
          inheritedRecord: q,
        };
      }),
    }));
  };
  return [...group(4, stretchQuestions), ...group(5, deepQuestions)];
}

/** Deterministic option shuffle order for a prompt so the answer isn't always first. */
export function promptOptionOrder(promptId: string): [number, number, number] {
  const order: [number, number, number] = [0, 1, 2];
  let h = 2166136261;
  for (const ch of promptId) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  for (let i = 2; i > 0; i--) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const j = h % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export type PassageState = {
  kind: "passage";
  level: PassageLevel;
  storyId: string;
  starter: 0 | 1;
  /** Question 0..2; equal to prompt count when finished. */
  index: number;
  /** Option index (0..2 in original options) tried wrongly on this question, or null. */
  wrong: number | null;
  /** True once the child tapped "Show evidence" (opt-in Help) on this question. */
  showEvidence: boolean;
  /** True once the child picked the right answer and is ready for Next. */
  solved: boolean;
  /** One entry per completed question: true iff right on first try without Help. */
  clean: boolean[];
};

export const isPassage = (s: unknown): s is PassageState =>
  !!s && typeof s === "object" && (s as { kind?: unknown }).kind === "passage";

export const passageDone = (s: PassageState, story: UpperStory | undefined) =>
  !story || s.index >= story.prompts.length;

export const passageTurn = (s: PassageState, story: UpperStory | undefined): 0 | 1 =>
  ((s.starter + Math.min(s.index, Math.max(0, (story?.prompts.length ?? 1) - 1))) % 2) as 0 | 1;

export function createPassage(
  level: PassageLevel,
  stories: readonly UpperStory[],
  c: CreateContext<unknown>,
): PassageState {
  const prevId = isPassage(c.previous) ? c.previous.storyId : undefined;
  const pool = stories.filter((st) => st.level === level);
  const fresh = pool.filter((st) => st.id !== prevId);
  const list = fresh.length ? fresh : pool;
  const idx = Math.min(list.length - 1, Math.max(0, Math.floor(c.rng() * list.length)));
  return {
    kind: "passage",
    level,
    storyId: list[idx].id,
    starter: c.starter,
    index: 0,
    wrong: null,
    showEvidence: false,
    solved: false,
    clean: [],
  };
}

export function passagePick(s: PassageState, optionIndex: number, story: UpperStory | undefined): PassageState {
  if (!story || passageDone(s, story) || s.solved || !integer(optionIndex, 2)) return s;
  const prompt = story.prompts[s.index];
  if (optionIndex === prompt.correctIndex) {
    return { ...s, solved: true, wrong: null };
  }
  return s.wrong === optionIndex ? s : { ...s, wrong: optionIndex };
}

export function passageHelp(s: PassageState, story: UpperStory | undefined): PassageState {
  if (!story || passageDone(s, story) || s.solved || s.showEvidence) return s;
  return { ...s, showEvidence: true };
}

export function passageNext(s: PassageState, story: UpperStory | undefined): PassageState {
  if (!story || !s.solved || passageDone(s, story)) return s;
  return {
    ...s,
    index: s.index + 1,
    wrong: null,
    showEvidence: false,
    solved: false,
    clean: [...s.clean, s.wrong === null && !s.showEvidence],
  };
}

export function validPassage(
  v: unknown,
  level: PassageLevel,
  lookup: (id: unknown) => UpperStory | undefined,
): v is PassageState {
  if (!exact(v, ["kind", "level", "storyId", "starter", "index", "wrong", "showEvidence", "solved", "clean"])) {
    return false;
  }
  const s = v as unknown as PassageState;
  const story = lookup(s.storyId);
  if (
    s.kind !== "passage" ||
    s.level !== level ||
    !story ||
    story.level !== level ||
    !seat(s.starter) ||
    !integer(s.index, story.prompts.length) ||
    (s.wrong !== null && !integer(s.wrong, 2)) ||
    typeof s.showEvidence !== "boolean" ||
    typeof s.solved !== "boolean" ||
    !bools(s.clean, s.index)
  ) {
    return false;
  }
  if (s.index === story.prompts.length) return s.wrong === null && !s.showEvidence && !s.solved;
  if (s.solved) return s.wrong === null;
  if (s.wrong !== null && s.wrong === story.prompts[s.index].correctIndex) return false;
  return true;
}

/** Split passage into [before, evidence, after] so opt-in Help highlights the exact supporting quote. */
export function splitEvidence(body: string, evidence: string): [string, string, string] {
  if (!evidence) return [body, "", ""];
  const at = body.indexOf(evidence);
  if (at < 0) return [body, "", ""];
  return [body.slice(0, at), evidence, body.slice(at + evidence.length)];
}
