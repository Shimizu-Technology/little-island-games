import type { Blank, Op } from "../../../math/kit";

/**
 * Sixty story templates for Quick Practice (SC-13). Numbers are filled in by the generator; property tests check that
 * every story's answer is a whole number in range for every number the generator can pick.
 *
 * Placeholders: {n} and {m} are two different names; {a} {b} {c} are the numbers. A one-step story is `a op b = c` with
 * one part hidden: its text never says the hidden number. A two-step story is `a first b second c = ?`, worked left to
 * right, and asks for the answer. Templates are stored by index in saved rounds: append only, never reorder.
 */
export type StoryMath = { steps: 1; op: Op; blank: Blank } | { steps: 2; first: Op; second: Op };
export type Story = { math: StoryMath; text: string };

const one = (op: Op, blank: Blank, text: string): Story => ({ math: { steps: 1, op, blank }, text });
const two = (first: Op, second: Op, text: string): Story => ({ math: { steps: 2, first, second }, text });

/** Names for stories: short, easy to read aloud, and none of them a real person. */
export const STORY_NAMES = ["Kai", "Mia", "Noa", "Ana", "Sam", "Tia", "Ben", "Lani"] as const;

/** Levels 4 (one step, indexes 0-29) and 5 (two steps, indexes 30-59). */
export const STORIES: readonly Story[] = [
  // Joining: how many now.
  one("add", 2, "{n} had {a} shells and found {b} more on the beach. How many shells does {n} have now?"),
  one("add", 2, "There are {a} fish by the reef. {b} more fish swim over. How many fish are there now?"),
  one("add", 2, "{n} picked {a} mangoes in the morning and {b} in the afternoon. How many mangoes did {n} pick in all?"),
  one("add", 2, "A crab walked {a} steps to the rock and then {b} steps to the water. How many steps did it walk?"),
  one("add", 2, "{n} has {a} stickers. {m} gives {n} {b} more. How many stickers does {n} have now?"),
  // Joining: how many were added.
  one("add", 1, "{n} had {a} shells. After finding some more, {n} had {c}. How many shells did {n} find?"),
  one("add", 1, "There were {a} birds in the tree. Some more landed, and now there are {c}. How many birds landed?"),
  one("add", 1, "{n} has read {a} pages of a book that has {c} pages. How many pages are left to read?"),
  one("add", 1, "{n} needs {c} beads for a necklace and has {a}. How many more beads does {n} need?"),
  // Joining: how many at the start.
  one("add", 0, "{n} had some shells. Then {n} found {b} more and had {c}. How many shells did {n} have at first?"),
  one("add", 0, "Some children were on the beach. {b} more came, and then there were {c}. How many were there at first?"),
  one("add", 0, "{n} had some coconuts. {m} brought {b} more, and now there are {c}. How many coconuts were there to start?"),
  one("add", 0, "A jar had some marbles. {n} put in {b} more, and now it holds {c}. How many marbles were in the jar before?"),
  // Taking away: how many are left.
  one("subtract", 2, "{n} had {a} shells and gave {b} to {m}. How many shells does {n} have left?"),
  one("subtract", 2, "There were {a} crabs on the sand. {b} ran into the water. How many crabs are still on the sand?"),
  one("subtract", 2, "A tree had {a} mangoes. {b} fell off in the wind. How many are still on the tree?"),
  one("subtract", 2, "{n} blew up {a} balloons and {b} popped. How many balloons are left?"),
  one("subtract", 2, "A net held {a} fish. {b} slipped back into the sea. How many fish are in the net now?"),
  // Taking away: how many were taken.
  one("subtract", 1, "{n} had {a} stickers and gave some away. Now {n} has {c}. How many stickers did {n} give away?"),
  one("subtract", 1, "There were {a} kites in the sky. Some came down, and {c} are still flying. How many came down?"),
  one("subtract", 1, "{n} baked {a} cookies. After the picnic, {c} were left. How many cookies were eaten?"),
  one("subtract", 1, "A shelf held {a} books. Some were taken out, and {c} are still on the shelf. How many were taken out?"),
  // Taking away: how many at the start.
  one("subtract", 0, "{n} had some shells and gave {b} away. Now {n} has {c}. How many shells did {n} have at first?"),
  one("subtract", 0, "Some ducks were on the pond. {b} flew away, and {c} are still there. How many ducks were there at first?"),
  one("subtract", 0, "{n} had some pencils. After sharing {b} with the class, {n} has {c}. How many pencils did {n} have before?"),
  one("subtract", 0, "A basket had some bananas. {b} were eaten, and {c} are left. How many bananas were in the basket?"),
  // Comparing.
  one("subtract", 2, "{n} has {a} shells. {m} has {b}. How many more shells does {n} have than {m}?"),
  one("add", 2, "{n} has {a} shells. {m} has {b} more than {n}. How many shells does {m} have?"),
  one("subtract", 2, "{n} jumped rope {a} times. That is {b} more than {m}. How many times did {m} jump?"),
  one("subtract", 2, "The red canoe holds {a} paddles. The blue canoe holds {b} fewer. How many paddles does the blue canoe hold?"),

  // Two steps: take away, then add.
  two("subtract", "add", "{n} had {a} shells, gave away {b}, then found {c} more. How many shells does {n} have now?"),
  two("subtract", "add", "There were {a} fish in the pool. {b} swam out and {c} swam in. How many fish are in the pool now?"),
  two("subtract", "add", "A bus had {a} people. At the stop, {b} got off and {c} got on. How many people are on the bus now?"),
  two("subtract", "add", "{n} had {a} stickers, used {b} on a card, then got {c} more. How many stickers does {n} have now?"),
  two("subtract", "add", "A tree had {a} mangoes. {b} were picked, then {c} more grew big enough to pick. How many are ready on the tree now?"),
  two("subtract", "add", "{n} had {a} beads. {b} rolled away, and {m} gave {n} {c} more. How many beads does {n} have now?"),
  two("subtract", "add", "A shelf had {a} books. {b} were borrowed and {c} were brought back. How many books are on the shelf now?"),
  two("subtract", "add", "There were {a} birds on the wire. {b} flew off, then {c} landed. How many birds are on the wire now?"),
  // Two steps: add, then take away.
  two("add", "subtract", "{n} had {a} shells, found {b} more, then gave {c} to {m}. How many shells does {n} have now?"),
  two("add", "subtract", "There were {a} children at the park. {b} more came, then {c} went home. How many children are at the park now?"),
  two("add", "subtract", "{n} picked {a} flowers, then {b} more, and gave {c} to {m}. How many flowers does {n} have left?"),
  two("add", "subtract", "A crab had {a} pebbles in its hole. It dragged in {b} more, then {c} rolled out. How many pebbles are in the hole now?"),
  two("add", "subtract", "{n} baked {a} cookies, then {b} more, and the family ate {c}. How many cookies are left?"),
  two("add", "subtract", "A boat carried {a} people. {b} more climbed in, then {c} jumped out to swim. How many people are in the boat now?"),
  two("add", "subtract", "{n} had {a} blocks, got {b} more, then used {c} to build a tower. How many blocks are not in the tower?"),
  two("add", "subtract", "The pond had {a} frogs. {b} more hopped in, then {c} hopped out. How many frogs are in the pond now?"),
  // Two steps: add, then add.
  two("add", "add", "{n} found {a} shells on Monday, {b} on Tuesday and {c} on Wednesday. How many shells did {n} find in all?"),
  two("add", "add", "A tank has {a} red fish, {b} blue fish and {c} yellow fish. How many fish are in the tank?"),
  two("add", "add", "{n} walked {a} steps to the gate, {b} steps to the beach and {c} steps to the water. How many steps is that in all?"),
  two("add", "add", "A garden has {a} tomato plants, {b} pepper plants and {c} bean plants. How many plants are in the garden?"),
  two("add", "add", "{n} read {a} pages, then {b} pages, then {c} pages. How many pages did {n} read in all?"),
  two("add", "add", "{n} has {a} stickers. {m} gives {n} {b}, and a friend gives {c}. How many stickers does {n} have now?"),
  // Two steps: take away, then take away.
  two("subtract", "subtract", "{n} had {a} shells, gave {b} to {m} and {c} to a friend. How many shells does {n} have left?"),
  two("subtract", "subtract", "There were {a} cookies. The family ate {b} at lunch and {c} after dinner. How many cookies are left?"),
  two("subtract", "subtract", "A tree had {a} coconuts. {b} fell on Monday and {c} fell on Tuesday. How many coconuts are still on the tree?"),
  two("subtract", "subtract", "{n} had {a} balloons. {b} floated away and {c} popped. How many balloons are left?"),
  two("subtract", "subtract", "A crate held {a} mangoes. {b} were sold and {c} were eaten. How many mangoes are in the crate now?"),
  // Two steps, mixed again.
  two("subtract", "add", "{n} had {a} crayons. {b} got lost, then {n} got {c} new ones. How many crayons does {n} have now?"),
  two("add", "subtract", "A rock pool had {a} snails. {b} more crawled in, then {c} crawled out. How many snails are in the pool now?"),
  two("subtract", "add", "There were {a} canoes on the beach. {b} went out to sea, then {c} came back. How many canoes are on the beach now?"),
];

/** First two-step story: one-step stories are 0 to 29 (Level 4), two-step 30 to 59 (Level 5). */
export const FIRST_TWO_STEP = 30;
