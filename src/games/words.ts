import { Base, Options, base, shuffle } from "./types";
export const WORDS = [
  ["CAT", "Animals", "A small pet that purrs."],
  ["DOG", "Animals", "A pet that barks."],
  ["FOX", "Animals", "A wild animal with a bushy tail."],
  ["OWL", "Animals", "A bird that is awake at night."],
  ["FROG", "Animals", "A little animal that hops near water."],
  ["FISH", "Animals", "It swims with fins."],
  ["BIRD", "Animals", "An animal with feathers."],
  ["DUCK", "Animals", "A bird that quacks."],
  ["BEAR", "Animals", "A large animal with thick fur."],
  ["CRAB", "Ocean", "It has claws and walks sideways."],
  ["SEAL", "Ocean", "A sea animal with flippers."],
  ["WAVE", "Ocean", "Water that rolls onto the shore."],
  ["BOAT", "Ocean", "You can ride in it on water."],
  ["SAND", "Ocean", "Tiny grains on the beach."],
  ["REEF", "Ocean", "An ocean home made by coral."],
  ["SHELL", "Ocean", "A hard home left on the beach."],
  ["SHARK", "Ocean", "A fish with many sharp teeth."],
  ["WHALE", "Ocean", "A huge sea mammal that breathes air."],
  ["SUN", "Outside", "It gives us daylight."],
  ["MOON", "Outside", "It shines in the night sky."],
  ["STAR", "Outside", "A tiny bright light in the night sky."],
  ["TREE", "Outside", "A plant with a trunk and branches."],
  ["LEAF", "Outside", "A green part of a plant."],
  ["RAIN", "Outside", "Water falling from clouds."],
  ["WIND", "Outside", "Moving air you can feel."],
  ["CLOUD", "Outside", "A fluffy shape in the sky."],
  ["GRASS", "Outside", "Small green plants under your feet."],
  ["PLANT", "Outside", "It grows from a seed."],
  ["RED", "Colors", "The color of a ripe tomato."],
  ["BLUE", "Colors", "The color of a clear daytime sky."],
  ["PINK", "Colors", "A color made with red and white."],
  ["GOLD", "Colors", "A shiny yellow color."],
  ["GREEN", "Colors", "The color of many leaves."],
  ["WHITE", "Colors", "The color of fresh snow."],
  ["BLACK", "Colors", "The color of a very dark night."],
  ["PURPLE", "Colors", "A color made with red and blue."],
  ["BOOK", "Home", "Pages with a story inside."],
  ["BALL", "Home", "A round toy you can throw."],
  ["CAKE", "Food", "A sweet treat for a birthday."],
  ["MILK", "Food", "A white drink often poured on cereal."],
  ["RICE", "Food", "Small grains cooked for a meal."],
  ["EGG", "Food", "A food inside a shell."],
  ["CORN", "Food", "Yellow kernels growing on a cob."],
  ["APPLE", "Food", "A crunchy fruit that can be red or green."],
  ["BREAD", "Food", "You use slices to make a sandwich."],
  ["MANGO", "Food", "A juicy fruit with one large seed."],
  ["HAPPY", "Feelings", "How you may feel when you have fun."],
  ["SMILE", "Feelings", "A happy shape your mouth makes."],
  ["KIND", "Feelings", "Caring and helpful to others."],
  ["BRAVE", "Feelings", "Trying even when you feel afraid."],
  ["PLAY", "Actions", "Have fun with a game or toy."],
  ["JUMP", "Actions", "Push off the ground into the air."],
  ["READ", "Actions", "Look at words to enjoy a story."],
  ["DRAW", "Actions", "Make a picture with a pencil."],
  ["SING", "Actions", "Make music with your voice."],
  ["DANCE", "Actions", "Move your body to music."],
  ["BUILD", "Actions", "Put pieces together to make something."],
  ["SHARE", "Actions", "Let someone else have a turn."],
  ["LISTEN", "Actions", "Pay attention to what you hear."],
  ["CREATE", "Actions", "Make something new."],
] as const;
export type WordState = Base & {
  game: "word-rescue";
  word: string;
  clue: string;
  category: string;
  pack?: string;
  guessed: string[];
  hints: number;
  custom: boolean;
  seen: string[];
};
export function createWord(options: Options, category = "All", previous: string[] = []): WordState {
  const max = options.difficulty === "easy" ? 4 : options.difficulty === "medium" ? 5 : 8;
  const pool = WORDS.filter((w) => w[0].length <= max && (category === "All" || w[1] === category));
  const fresh = pool.filter((w) => !previous.includes(w[0]));
  const chosen = shuffle(fresh.length ? fresh : pool)[0] ?? WORDS[0];
  return {
    ...base("word-rescue", { ...options, wordRules: options.wordRules ?? "challenge" }),
    game: "word-rescue",
    word: chosen[0],
    category: chosen[1],
    pack: category,
    clue: chosen[2],
    guessed: [],
    hints: 0,
    custom: false,
    seen: [...previous.slice(-59), chosen[0]],
  };
}
export function replayWord(state: WordState): WordState | null {
  return state.custom ? null : createWord(state.options, state.pack ?? "All", state.seen);
}
export function customWord(options: Options, raw: string): WordState | null {
  const word = raw.trim().toUpperCase();
  if (!/^[A-Z]{2,12}$/.test(word)) return null;
  return {
    ...base("word-rescue", { ...options, wordRules: options.wordRules ?? "challenge" }),
    game: "word-rescue",
    word,
    category: "Family word",
    clue: "Someone picked this word just for you.",
    guessed: [],
    hints: 0,
    custom: true,
    seen: [],
  };
}
export const wordDone = (s: WordState) => [...s.word].every((letter) => s.guessed.includes(letter));
// Missing rules belong to pre-V2, unlimited Practice rounds. Never change a saved round's rules on update.
export const wordRules = (s: WordState) => s.options.wordRules ?? "practice";
export const wrongLetters = (s: WordState) => s.guessed.filter((letter) => !s.word.includes(letter));
export function wordStatus(s: WordState): "playing" | "won" | "lost" {
  if (wordRules(s) === "challenge" && wrongLetters(s).length >= 6) return "lost";
  return wordDone(s) ? "won" : "playing";
}
export function guessLetter(s: WordState, letter: string): WordState {
  if (!/^[A-Z]$/.test(letter) || s.guessed.includes(letter) || wordStatus(s) !== "playing") return s;
  return { ...s, guessed: [...s.guessed, letter] };
}
export function wordHint(s: WordState): WordState {
  if (wordStatus(s) !== "playing" || (wordRules(s) === "challenge" && s.hints >= 1)) return s;
  const letter = [...s.word].find((l) => !s.guessed.includes(l));
  return letter ? { ...guessLetter(s, letter), hints: s.hints + 1 } : s;
}
