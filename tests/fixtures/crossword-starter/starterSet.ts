import { indexCrossword, type CrosswordDefinition, type CrosswordPuzzle, type CrosswordTier } from '../../../src/puzzles/crossword/engine';
import { STARTER_CROSSWORD_CLUES } from './starterClues';

const grids: readonly (readonly [id: string, title: string, tier: CrosswordTier, rows: readonly string[]])[] = [
  ["crossword-easy-egg", "Egg in the Nest", "Easy", ["EGG##", "BIRD#", "BROAD", "#LURE", "##PEN"]],
  ["crossword-easy-whale", "Whale Hello", "Easy", ["##HOW", "##EWE", "WHALE", "OUR##", "NET##"]],
  ["crossword-easy-mango", "Mango Time", "Easy", ["YES##", "ARE##", "MANGO", "##SUN", "##EYE"]],
  ["crossword-easy-toast", "Pop Goes the Toast", "Easy", ["##THE", "#SOIL", "SCARF", "EASE#", "ANT##"]],
  ["crossword-easy-mom", "At Home", "Easy", ["#ALSO", "#BEAN", "MOVIE", "OVEN#", "MELT#"]],
  ["crossword-easy-pen", "Pencil Case", "Easy", ["##ARE", "##COW", "GLOBE", "AIR##", "PEN##"]],
  ["crossword-easy-moon", "Moon Watch", "Easy", ["EMU##", "LONG#", "MOTOR", "#NINE", "##LED"]],
  ["crossword-easy-snow", "Snow Day", "Easy", ["##WHO", "#SHOW", "ONION", "WOLF#", "EWE##"]],
  ["crossword-easy-pond", "At the Pond", "Easy", ["##AWE", "#CLAY", "ALONE", "POND#", "EGG##"]],
  ["crossword-easy-piano", "Play a Tune", "Easy", ["##GUM", "PIANO", "ADMIT", "TEETH", "HAS##"]],
  ["crossword-easy-sail", "Little Sail", "Easy", ["#SAIL", "#KITE", "NAMED", "ITEM#", "BEDS#"]],
  ["crossword-easy-pie", "Pie, Please", "Easy", ["##SPY", "##TIE", "FLEET", "RIP##", "YES##"]],
  ["crossword-medium-otter", "River Otter", "Medium", ["##SHE##", "##PANDA", "##OTTER", "OWN#EWE", "LASER##", "DROVE##", "##RED##"]],
  ["crossword-medium-shore", "Along the Shore", "Medium", ["#ASH###", "ONCE###", "AGENTS#", "TEN#WHO", "#REGION", "###ACRE", "###SEE#"]],
  ["crossword-medium-swing", "Playground Swing", "Medium", ["###ADO#", "##SWING", "##HENCE", "FAR#NET", "ARISE##", "TIMER##", "#APE###"]],
  ["crossword-medium-thunder", "After the Flash", "Medium", ["PEA#TOE", "OWN#HAY", "TEXTURE", "##ION##", "AMENDED", "ROT#ERR", "COY#RAY"]],
  ["crossword-medium-rocket", "Ready for Launch", "Medium", ["##PIN##", "PLANE##", "ROCKET#", "YAK#DAY", "#DESIRE", "##TENTS", "##SAG##"]],
  ["crossword-medium-trumpet", "Brass Band", "Medium", ["##COT##", "##HURTS", "#MATURE", "PUN#MEW", "ESCAPE#", "THERE##", "##SET##"]],
  ["crossword-medium-recess", "School Break", "Medium", ["#TRY###", "#REAR##", "PACKETS", "ACE#TEA", "TESTING", "##SORT#", "###YES#"]],
  ["crossword-medium-jam", "Breakfast Jam", "Medium", ["##SIS##", "JUICE##", "ASSETS#", "MET#TIN", "#RETIRE", "##RENEW", "##SAG##"]],
  ["crossword-medium-clover", "Lucky Leaf", "Medium", ["###ACT#", "##ALLOW", "##CLONE", "FAT#VET", "OXIDE##", "RIVER##", "#SEW###"]],
  ["crossword-medium-penguin", "Waddle and Dive", "Medium", ["#DRIP##", "PIECE##", "ASPEN##", "WHO#GUY", "##REUSE", "##TRIES", "##SANS#"]],
  ["crossword-medium-tennis", "Over the Net", "Medium", ["###ATE#", "##AREAS", "##SENSE", "ASK#NET", "CHILI##", "TONES##", "#EGG###"]],
  ["crossword-medium-bicycle", "Two Wheels", "Medium", ["##BOB##", "#DIAL##", "DOCTORS", "IVY#WEE", "DECLINE", "##LENT#", "##EGG##"]],
  ["crossword-hard-pineapple", "Pacific Fruit Stand", "Hard", ["#TEA##HAS", "BOARD#ARE", "INSTITUTE", "GET#GELS#", "###FIN###", "#POET#SEW", "PINEAPPLE", "ALE#LEAST", "YES##ATE#"]],
  ["crossword-hard-ferry", "Island Ferry", "Hard", ["SHE###MAP", "TOY##FACE", "APE##EDIT", "RESTORED#", "###EAR###", "#EVERYONE", "RAIN##NOD", "USES##TUG", "NEW###ONE"]],
  ["crossword-hard-luggage", "At the Gate", "Hard", ["ATE###OWE", "ROVE##PAN", "KEEN#BAND", "##RESULTS", "###RED###", "LUGGAGE##", "ONLY#EXIT", "ADO##TACO", "NOW###MEN"]],
  ["crossword-hard-waterfall", "Over the Ledge", "Hard", ["#FAT##WAY", "LOGO#DATA", "ACRE#ITEM", "DUE#ORE##", "#SELLERS#", "##MUD#FEW", "THEN#SANE", "RUNG#ELSE", "YET##ALE#"]],
  ["crossword-hard-seaweed", "Below the Tide", "Hard", ["RID##APT#", "ACE##IRIS", "NEST#MERE", "##PEA#FEE", "#SEAWEED#", "JAR#ERR##", "ALAS#ARTS", "BETA##EWE", "#SEW##DOT"]],
  ["crossword-hard-chocolate", "Cocoa Kitchen", "Hard", ["WOW##WHO#", "ARE#MEANS", "REPRODUCE", "##TAN#LET", "###PIE###", "ASH#TEN##", "CHOCOLATE", "TENOR#ION", "#DEW##LED"]],
  ["crossword-hard-circuit", "Make the Connection", "Hard", ["ASK###PAT", "INN###ICE", "DUE##TERN", "#BECAUSE#", "###ART###", "#CIRCUIT#", "FORD##BUS", "ADO###INK", "DEN###SAY"]],
  ["crossword-hard-orchestra", "Before the Baton", "Hard", ["WON##GAG#", "HUE##ACID", "ORCHESTRA", "#SKIM#SLY", "###SPY###", "SKY#TACT#", "ANONYMOUS", "POKE##ONE", "#WET##LET"]],
  ["crossword-hard-novelist", "Between the Covers", "Hard", ["OWN##NUN#", "WEEP#OPUS", "LEER#VOTE", "##DEFENSE", "###PAL###", "ORGANIC##", "DOOR#SOLD", "DONE#TRIO", "#FED##NET"]],
  ["crossword-hard-swimmer", "In the Fast Lane", "Hard", ["HEM###DEW", "APE#ASIDE", "DIM#STAGE", "#CONSOLE#", "###OUR###", "#SWIMMER#", "THESE#YAP", "ROSES#ERA", "YET###DEN"]],
  ["crossword-hard-telescope", "Look Up", "Hard", ["BET##ANT#", "AWAY#ROAD", "TELESCOPE", "##ELK#NEW", "###PUP###", "EGG#NUT##", "BREAKFAST", "BAND#FREE", "#BED##TAN"]],
  ["crossword-hard-hailstone", "Ice from the Sky", "Hard", ["ILL#HEM##", "MOO#ARISE", "PARTIALLY", "#FEEL#DYE", "###ASH###", "HIS#TUBE#", "ECONOMICS", "NYLON#THE", "##OWE#SOW"]],
  ["crossword-expert-brainstorm", "Chance of Ideas", "Expert", ["##TAG###TUB", "#AURA##BASE", "#PRESCRIBED", "APT##OURS##", "ILL##LID###", "DYE#SUN#CAP", "###GEM##ATE", "##WREN##ION", "BRAINSTORM#", "EARN##OWNS#", "END###YES##"]],
  ["crossword-expert-publisher", "From Desk to Shelf", "Expert", ["##SIP###EWE", "##HOOP##DIG", "#CONDUCTING", "MARS#BOUT##", "ART##LAB###", "YES#MIX#ORB", "###HIS##PIE", "##LASH#VENT", "SCATTERING#", "HAM##ROSE##", "EBB###DAD##"]],
  ["crossword-expert-stamp", "Signed, Sealed, Sent", "Expert", ["#WET##APART", "WISE##COCOA", "ANTS##TIMOR", "STATIC#NET#", "PET#DEBT###", "#REHEARSAL#", "###EASE#TOO", "#ALL#EDITOR", "STAMP##SAKE", "HOMER##LIES", "EMPTY##END#"]],
  ["crossword-expert-crosswind", "Off the Runway", "Expert", ["#PAY###FUR#", "AUTO##FIRES", "CLOUD#UNCLE", "ELM#OWN#HIT", "###PEA#LIE#", "#CROSSWIND#", "#HOT#TIP###", "SAT#BET#TUB", "ERASE#HORSE", "AGREE##FEED", "#EYE###FED#"]],
  ["crossword-expert-clockwork", "On the Tick", "Expert", ["##KEEP##BUS", "#SERVES#ORE", "TORRENT#ONE", "INN###RAT##", "PIE##SAD###", "#CLOCKWORK#", "###WHY##ANT", "##ALE###TEA", "WAR#ADAPTER", "ART#PUPILS#", "YES##GENE##"]],
  ["crossword-expert-metronome", "Keep Time", "Expert", ["HIP###TODAY", "ACE##MARINE", "SETTLEMENTS", "###RITE####", "PLAYER##SHE", "AID#DOT#OUR", "WED##NUMBER", "####GONE###", "MATHEMATICS", "AWHILE##MAP", "DEEDS###PRY"]],
  ["crossword-expert-snapdragon", "Talking Garden", "Expert", ["JAW###HUB##", "ALERT#USES#", "RETIREMENT#", "###DAM#REEL", "HAT#DEW#ARE", "ACE#ERA#TEN", "URN#RAT#HOT", "LOAF#LET###", "#SNAPDRAGON", "#STIR#SPINE", "##SLY###GET"]],
  ["crossword-expert-stargazing", "After the Lights Go Out", "Expert", ["##JOG###BAY", "#DINER#RAGE", "#ENCLOSURES", "SAGE#TURNS#", "ILL##ERA###", "STEPS#FLORA", "###END##PIN", "#SWEAR#VENT", "STARGAZING#", "EARS#BASES#", "ARE###PAD##"]],
  ["crossword-expert-scoreboard", "At the Final Whistle", "Expert", ["####EWE#WOW", "##SHEER#APE", "ACCELERATED", "ROOM###TEN#", "EAR#UTTER##", "ALE#RAW#MEN", "##BINGO#EVE", "#TON###SLEW", "TRANSITIONS", "AIR#ACORN##", "NOD#DYE####"]],
  ["crossword-expert-rubber-band", "Desk Drawer", "Expert", ["FLIP##DID##", "AIMED#ACE##", "DEPARTMENT#", "###CAR##TOW", "###EMU##ARE", "ERR#ASH#LED", "BEE##TEA###", "BAD##EAR###", "#RUBBERBAND", "##CUE#TODAY", "##END##ROPE"]],
  ["crossword-expert-gingerbread", "Edible Architecture", "Expert", ["##CAP##PULL", "#MARE#CANOE", "FUNCTIONING", "OLD##CRATE#", "EEL##YAM###", "##ERA#LAD##", "###ADO##EBB", "#PANDA##LIE", "GINGERBREAD", "ACTED#EATS#", "SKIS##EYE##"]],
  ["crossword-expert-submarine", "Below Deck", "Expert", ["##BAD###TOW", "STUDY#SCENE", "HORDE#THREE", "ONE###AIMS#", "PEA##OIL###", "#SUBMARINE#", "###LIT##ORB", "#TWIG###TAR", "TRASH#ARISE", "WORST#PACED", "ODD###EYE##"]],
];

export const STARTER_CROSSWORD_DEFINITIONS: readonly CrosswordDefinition[] = grids.map(([id, title, tier, rows]) => ({
  id, title, tier, rows, clues: STARTER_CROSSWORD_CLUES,
}));

const tiers: Record<CrosswordTier, CrosswordPuzzle[]> = { Easy: [], Medium: [], Hard: [], Expert: [] };
for (const definition of STARTER_CROSSWORD_DEFINITIONS) {
  tiers[definition.tier].push(indexCrossword(definition));
}

export const STARTER_CROSSWORDS: Readonly<Record<CrosswordTier, readonly CrosswordPuzzle[]>> = tiers;
