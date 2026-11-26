/**
 * Clean starter themes for Word Search: 16 themes by 4 plain difficulties (Easy, Medium, Hard, Expert).
 *
 * Test and bake-planning input only. Never import this module from `src` or `content`: answers reach the app only
 * through the reviewed, scanned bake (W1 admission). Every answer below is already in a public repository list,
 * the picture dictionary allowlist or the local editorial supplement; `tests/word-search-starter.test.ts` proves it. This
 * module neither approves a word nor reads any private policy: the lead's locked w-guard scan and bake still decide.
 */
export type StarterTierId = 'easy' | 'medium' | 'hard' | 'expert';
export type StarterTier = { id: StarterTierId; label: string; tier: 1 | 2 | 3 | 4; band: 'paddling' | 'shallows' | 'lagoon' | 'reef'; slot: number; size: number; count: number; min: number; max: number; directionCount: 2 | 4 | 8 };
export type StarterTheme = { id: string; title: string; pool: string[] };
/** Easy and Medium run across and down; Hard adds slants; Expert uses all eight directions. Slot = 80 + tier - 1. */
export const starterTiers: readonly StarterTier[] = [
  { id: 'easy', label: 'Easy', tier: 1, band: 'paddling', slot: 80, size: 6, count: 4, min: 3, max: 5, directionCount: 2 },
  { id: 'medium', label: 'Medium', tier: 2, band: 'shallows', slot: 81, size: 9, count: 6, min: 3, max: 7, directionCount: 2 },
  { id: 'hard', label: 'Hard', tier: 3, band: 'lagoon', slot: 82, size: 12, count: 8, min: 4, max: 10, directionCount: 4 },
  { id: 'expert', label: 'Expert', tier: 4, band: 'reef', slot: 83, size: 15, count: 10, min: 4, max: 12, directionCount: 8 },
];
const words = (text: string) => text.trim().split(/\s+/);
/** Authored in teaching order: the most familiar words come first. */
export const starterThemes: readonly StarterTheme[] = [
  { id: 'guam-island', title: 'Guam & Island Life', pool: words(`
      ISLAND CANOE OUTRIGGER PADDLE SAIL MAST ANCHOR VOYAGE COMPASS HORIZON COVE BAY CLIFF CAVE REEF
      LAGOON TARO BREADFRUIT COCONUT MANGO PALM BAMBOO VILLAGE MARKET FIESTA HARBOR BEACH SHORE
    `) },
  { id: 'ocean', title: 'Ocean Creatures', pool: words(`
      TURTLE DOLPHIN WHALE SHARK RAY EEL OCTOPUS SQUID JELLYFISH STARFISH URCHIN CLAM OYSTER SHRIMP
      LOBSTER HERMIT SNAIL BARNACLE SPONGE SEAL CRAB FISH CORAL SHELL
    `) },
  { id: 'farm', title: 'Farm & Pets', pool: words(`
      DOG CAT PIG COW GOAT SHEEP HEN ROOSTER CHICK DUCK HORSE DONKEY RABBIT MOUSE FROG BIRD BEE ANT
      SNAIL BARN FENCE GATE EGG MILK
    `) },
  { id: 'wild', title: 'Wild Animals', pool: words(`
      LION TIGER BEAR ELEPHANT ZEBRA MONKEY DEER CAMEL PANDA FOX KOALA MOOSE BEAVER SKUNK WALRUS LLAMA
      SNAKE LIZARD SPIDER BAT OWL
    `) },
  { id: 'birds', title: 'Birds & Nests', pool: words(`
      BIRD NEST WING FEATHER BEAK TALON CHICK HATCH KINGFISHER SWIFT HERON EGRET TERN DOVE PIGEON
      ROOSTER HEN DUCK GOOSE EAGLE OWL PARROT PENGUIN SWAN TURKEY TOUCAN GULL
    `) },
  { id: 'space', title: 'Sun, Moon & Stars', pool: words(`
      SUN MOON STAR SKY PLANET ROCKET COMET TELESCOPE SHADOW LIGHT SUNSET CLOUD HORIZON GLOBE COMPASS
      FLOAT MOTION HEAT FORCE
    `) },
  { id: 'weather', title: 'Nature & Weather', pool: words(`
      RAIN SNOW WIND STORM CLOUD THUNDER LIGHTNING PUDDLE BREEZE DRIZZLE SHOWER RAINBOW TYPHOON SEASON
      FROST DEW ICE SUN SKY GUST SHADE WARMTH FORECAST
    `) },
  { id: 'baking', title: 'Baking & Kitchen', pool: words(`
      FLOUR DOUGH BATTER YEAST LOAF BREAD ROLL BUN MUFFIN COOKIE CAKE PIE TART CRUST CRUMB ICING
      FROSTING SPRINKLE PASTRY SCONE OVEN WHISK BOWL SPOON APRON LADLE PAN POT TRAY SUGAR BUTTER
    `) },
  { id: 'cooking', title: 'Cooking & Pantry', pool: words(`
      HONEY SYRUP COCOA VANILLA CINNAMON NUTMEG PEPPER RICE OAT WHEAT CORN CREAM EGG OIL STIR MIX
      KNEAD BAKE ROAST STEAM SIMMER BOIL MELT POUR SLICE PEEL MASH CHOP SIFT
    `) },
  { id: 'fruit-garden', title: 'Fruit & Garden', pool: words(`
      MANGO BANANA COCONUT PAPAYA GUAVA PINEAPPLE LIME LEMON ORANGE MELON WATERMELON PLUM PEACH PEAR
      APPLE GRAPE BERRY FIG SOIL RAKE TROWEL SPADE SEEDLING FLOWER LEAF ROOT STEM SEED SPROUT ROSE
      DAISY TULIP CLOVER GRASS FERN
    `) },
  { id: 'music-sports', title: 'Music & Sports', pool: words(`
      DRUM GUITAR PIANO TRUMPET FLUTE VIOLIN HARP WHISTLE BELL RADIO CHOIR HYMN BALL RACKET SKATE BIKE
      TROPHY MEDAL HOOP KITE JUMP SKIP CATCH TOSS SWING SLIDE CLIMB BALANCE HOP
    `) },
  { id: 'travel', title: 'Travel & Plane', pool: words(`
      PLANE HELICOPTER SHIP BOAT TRAIN BUS CAR TRUCK TAXI VAN MAP GLOBE COMPASS CAMERA HELMET WATCH
      TENT ROAD BRIDGE TUNNEL HARBOR PORT DOCK VOYAGE HORIZON PICNIC BASKET LUNCH SNACK
    `) },
  { id: 'family-home', title: 'Family & Home', pool: words(`
      FAMILY MOTHER FATHER GRANDMA GRANDPA AUNT UNCLE COUSIN SISTER BROTHER BABY SIBLING CHILD
      NEIGHBOR FRIEND GUEST HELPER HOUSE DOOR WINDOW BED CHAIR TABLE LAMP CLOCK PILLOW BLANKET CRADLE
      LULLABY HUG LOVE CARE SHARE SMILE
    `) },
  { id: 'faith', title: 'Bible & Faith Stories', pool: words(`
      BIBLE ANGEL HEAVEN PRAY PRAYER PSALM GRACE AMEN GOSPEL SCRIPTURE SHEPHERD MANGER NATIVITY STAR
      HOPE PEACE JOY MERCY KINDNESS CHARITY EASTER CHRISTMAS ADVENT LENT CHURCH CHAPEL CROSS CANDLE
      BELL CHOIR HYMN ROSARY NOVENA BAPTISM COMMUNION HOLY
    `) },
  { id: 'body', title: 'Body & Health', pool: words(`
      BODY HEAD HAIR FACE EYE EAR NOSE MOUTH TOOTH TONGUE HAND FINGER THUMB ARM ELBOW LEG KNEE FOOT
      TOE SKIN BONE BRAIN HEART LUNG MUSCLE TUMMY BREATH SLEEP REST
    `) },
  { id: 'crafts-play', title: 'Crafts & Play', pool: words(`
      PAINT BRUSH CANVAS PAPER CARD CRAYON PENCIL CHALK CLAY YARN THREAD NEEDLE FABRIC FELT BEAD
      BUTTON GLUE SCISSORS COLLAGE PUZZLE DOLL BLOCK MARBLE TOY GAME ROBOT BALLOON
    `) },
];
export type StarterPuzzle = { id: string; theme: string; title: string; tier: StarterTierId; variant: number; words: string[] };
export const wordId = (spelling: string) => `en-${spelling.toLowerCase()}`;
const reversed = (w: string) => [...w].reverse().join('');
/** Two answers collide when one can be read inside the other, in either direction. */
export const collides = (a: string, b: string) => a.includes(b) || b.includes(a) || a.includes(reversed(b)) || b.includes(reversed(a));
/** Deterministic: the same theme, tier and variant always give the same words, in the same order. */
export function starterPuzzle(theme: StarterTheme, tier: StarterTier, variant = 0): StarterPuzzle {
  const fit = theme.pool.filter(w => w.length >= tier.min && w.length <= tier.max), start = (variant * tier.count + (tier.tier - 1) * 3) % fit.length, words: string[] = [];
  for (let i = 0; i < fit.length && words.length < tier.count; i++) { const w = fit[(start + i) % fit.length]; if (!words.some(x => collides(x, w))) words.push(w); }
  if (words.length < tier.count) throw new Error(`Theme ${theme.id} cannot fill ${tier.id}`);
  return { id: `${tier.id}-${theme.id}-${variant}`, theme: theme.id, title: theme.title, tier: tier.id, variant, words };
}
export const starterPuzzles = (variants = 1): StarterPuzzle[] => starterTiers.flatMap(t => starterThemes.flatMap(theme => Array.from({ length: variants }, (_, v) => starterPuzzle(theme, t, v))));
/** Every distinct answer the lead's reviewed word records must cover, with the ids the bake plan uses. */
export const starterWords = (variants = 1) => [...new Set(starterPuzzles(variants).flatMap(p => p.words))].sort().map(spelling => ({ id: wordId(spelling), spelling }));
/**
 * A plan in the shape `scripts/puzzles/words/bake.mjs` reads: one bank per difficulty in slots 80–83, all in word-list
 * mode, one grid per theme and variant. Note the baker requires 512–2,048 distinct grids, so use `variants: 8` for a
 * real bake. The default plan holds the 64 curated puzzles.
 */
export function starterPlan(variants = 1) {
  const puzzles = starterPuzzles(variants);
  return { schemaVersion: 1, banks: starterTiers.map(t => {
    const mine = puzzles.filter(p => p.tier === t.id);
    return { slot: t.slot, id: `starter-${t.id}`, band: t.band, tier: t.tier, theme: t.id, list: 'words' as const, wordIds: [...new Set(mine.flatMap(p => p.words.map(wordId)))],
      grids: mine.map(p => ({ id: `search-${p.id}`, family: p.theme, wordIds: p.words.map(wordId), theme: p.title, seed: t.tier * 100000 + starterThemes.findIndex(x => x.id === p.theme) * 100 + p.variant, size: t.size, count: t.count, directionCount: t.directionCount, distractors: 0 })) };
  }) };
}
