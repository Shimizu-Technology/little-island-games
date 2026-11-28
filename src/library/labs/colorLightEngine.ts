export type ColorLabMode = "paint" | "light";
export type PigmentId = "red" | "yellow" | "blue" | "white" | "black";
export type LightBeamId = "red" | "green" | "blue";

export interface PigmentOption {
  id: PigmentId;
  label: string;
  hex: string;
  textColor: string;
}

export const PIGMENT_OPTIONS: readonly PigmentOption[] = [
  { id: "red", label: "Red", hex: "#E53935", textColor: "#FFFDF8" },
  { id: "yellow", label: "Yellow", hex: "#F7C927", textColor: "#3D2B24" },
  { id: "blue", label: "Blue", hex: "#1E78D8", textColor: "#FFFDF8" },
  { id: "white", label: "White", hex: "#FFFDF8", textColor: "#3D2B24" },
  { id: "black", label: "Black", hex: "#2C2625", textColor: "#FFFDF8" },
];

export interface LightBeamOption {
  id: LightBeamId;
  label: string;
  hex: string;
}

export const LIGHT_BEAM_OPTIONS: readonly LightBeamOption[] = [
  { id: "red", label: "Red Light", hex: "#FF4D4D" },
  { id: "green", label: "Green Light", hex: "#2ECC71" },
  { id: "blue", label: "Blue Light", hex: "#3B82F6" },
];

export const MAX_PAINT_DROPS = 12;

export interface PaintMixResult {
  hex: string;
  colorName: string;
  discovery: string;
  totalDrops: number;
}

export interface LightMixResult {
  hex: string;
  colorName: string;
  discovery: string;
  rainbowVisible: boolean;
  rainbowSpread: number;
  activeCount: number;
}

export interface ColorLightChallenge {
  id: string;
  mode: ColorLabMode;
  prompt: string;
  hint: string;
  check: (state: ColorLightState) => boolean;
}

export interface ColorLightState {
  mode: ColorLabMode;
  drops: Record<PigmentId, number>;
  stirCount: number;
  beams: Record<LightBeamId, boolean>;
  prismAngle: number;
  sunlightThroughPrism: boolean;
  challengeIndex: number;
}

export function createColorLightState(): ColorLightState {
  return {
    mode: "paint",
    drops: { red: 0, yellow: 0, blue: 0, white: 0, black: 0 },
    stirCount: 0,
    beams: { red: true, green: false, blue: false },
    prismAngle: 30,
    sunlightThroughPrism: false,
    challengeIndex: 0,
  };
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [clampByte(r), clampByte(g), clampByte(b)]
      .map((channel) => channel.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

/**
 * Cubic RYB-to-RGB interpolation (Gossett & Chen) so Yellow + Blue yields vivid Green,
 * Red + Yellow yields warm Orange, and Red + Blue yields deep Purple, just like real paint!
 */
function rybToRgb(r: number, y: number, b: number): [number, number, number] {
  const c000 = [255, 255, 255]; // no pigment
  const c100 = [235, 58, 52]; // red
  const c010 = [250, 214, 42]; // yellow
  const c001 = [34, 118, 216]; // blue
  const c110 = [245, 130, 38]; // orange
  const c011 = [44, 158, 84]; // green
  const c101 = [132, 68, 178]; // purple
  const c111 = [118, 84, 60]; // brown

  const out: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const x0 = c000[i] * (1 - r) + c100[i] * r;
    const x1 = c010[i] * (1 - r) + c110[i] * r;
    const x2 = c001[i] * (1 - r) + c101[i] * r;
    const x3 = c011[i] * (1 - r) + c111[i] * r;
    const y0 = x0 * (1 - y) + x1 * y;
    const y1 = x2 * (1 - y) + x3 * y;
    out[i] = y0 * (1 - b) + y1 * b;
  }
  return out;
}

export function computePaintMix(drops: Record<PigmentId, number>): PaintMixResult {
  const r = drops.red;
  const y = drops.yellow;
  const b = drops.blue;
  const w = drops.white;
  const k = drops.black;
  const totalDrops = r + y + b + w + k;

  if (totalDrops === 0) {
    return {
      hex: "#F6EBD8",
      colorName: "Empty Mixing Bowl",
      discovery: "Tap any paint drops below to pour color into the bowl!",
      totalDrops: 0,
    };
  }

  const chroma = r + y + b;
  let rgb: [number, number, number];
  if (chroma === 0) {
    const shade = Math.round((w / (w + k)) * 222 + 30);
    rgb = [shade, shade - 2, shade - 4];
  } else {
    const maxC = Math.max(r, y, b);
    const base = rybToRgb(r / maxC, y / maxC, b / maxC);
    const whiteRatio = w / (totalDrops + 0.35);
    const blackRatio = k / (totalDrops + 0.35);
    rgb = [
      base[0] + (255 - base[0]) * whiteRatio * 0.85,
      base[1] + (255 - base[1]) * whiteRatio * 0.85,
      base[2] + (255 - base[2]) * whiteRatio * 0.85,
    ];
    rgb = [
      rgb[0] * (1 - blackRatio * 0.78),
      rgb[1] * (1 - blackRatio * 0.78),
      rgb[2] * (1 - blackRatio * 0.78),
    ];
  }

  const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
  const { colorName, discovery } = describePaintMix(drops);
  return { hex, colorName, discovery, totalDrops };
}

function describePaintMix(drops: Record<PigmentId, number>): { colorName: string; discovery: string } {
  const { red: r, yellow: y, blue: b, white: w, black: k } = drops;
  const chroma = r + y + b;

  if (chroma === 0) {
    if (w > 0 && k === 0) return { colorName: "Cloud White", discovery: "White paint makes other colors lighter and softer!" };
    if (k > 0 && w === 0) return { colorName: "Night Black", discovery: "A tiny drop of black makes colors deeper and darker!" };
    return { colorName: "Stormy Gray", discovery: "White and black mix together to make gray!" };
  }

  if (r > 0 && y > 0 && b > 0) {
    if (w > 0 && k === 0) return { colorName: "Warm Sand", discovery: "Red, yellow, blue, and white blend into cozy island sand!" };
    return { colorName: "Coconut Brown", discovery: "Mixing red, yellow, and blue together makes earthy brown!" };
  }

  if (r > 0 && y > 0 && b === 0) {
    if (w > 0) return { colorName: "Island Coral", discovery: "Red, yellow, and white create warm Island Coral!" };
    if (k > 0) return { colorName: "Cinnamon Rust", discovery: "Darkening orange with black makes cozy rust!" };
    return { colorName: "Sunset Orange", discovery: "Red and yellow paint mix together to make Orange!" };
  }

  if (y > 0 && b > 0 && r === 0) {
    if (b > y) return { colorName: "Lagoon Teal", discovery: "Extra blue with yellow makes sparkling Lagoon Teal!" };
    if (w > 0) return { colorName: "Seafoam Mint", discovery: "Green softened with white looks like ocean foam!" };
    if (k > 0) return { colorName: "Jungle Green", discovery: "Adding a little black makes deep rainforest green!" };
    return { colorName: "Palm Green", discovery: "Yellow and blue paint mix together to make Green!" };
  }

  if (r > 0 && b > 0 && y === 0) {
    if (w > 0) return { colorName: "Soft Lavender", discovery: "Purple lightened with white turns into gentle lavender!" };
    if (k > 0) return { colorName: "Midnight Plum", discovery: "Darkening purple makes rich midnight plum!" };
    return { colorName: "Hibiscus Purple", discovery: "Red and blue paint mix together to make Purple!" };
  }

  if (r > 0) {
    if (w > 0) return { colorName: "Blossom Pink", discovery: "Red and white paint mix together to make Pink!" };
    if (k > 0) return { colorName: "Deep Maroon", discovery: "Adding black turns bright red into deep maroon!" };
    return { colorName: "Bright Red", discovery: "Red is a primary paint color. Try adding yellow, blue, or white!" };
  }

  if (y > 0) {
    if (w > 0) return { colorName: "Butter Cream", discovery: "Yellow and white make soft sunlit butter cream!" };
    if (k > 0) return { colorName: "Olive Moss", discovery: "Yellow darkened with black turns into mossy olive!" };
    return { colorName: "Sunshine Yellow", discovery: "Yellow is a primary paint color. Try adding blue or red!" };
  }

  if (w > 0) return { colorName: "Sky Blue", discovery: "Blue and white paint mix together to make Sky Blue!" };
  if (k > 0) return { colorName: "Deep Ocean Navy", discovery: "Blue darkened with black looks like the deep Pacific!" };
  return { colorName: "Pacific Blue", discovery: "Blue is a primary paint color. Try adding yellow, red, or white!" };
}

export function computeLightMix(
  beams: Record<LightBeamId, boolean>,
  prismAngle: number,
  sunlightThroughPrism: boolean
): LightMixResult {
  const clampedAngle = Math.max(0, Math.min(60, prismAngle));

  if (sunlightThroughPrism) {
    const rainbowVisible = clampedAngle >= 15;
    const rainbowSpread = rainbowVisible ? (clampedAngle - 10) / 50 : 0;
    return {
      hex: "#FFFDF5",
      colorName: rainbowVisible ? "Rainbow Spectrum!" : "Straight White Sunlight",
      discovery: rainbowVisible
        ? "Glass bends each color of sunlight slightly differently, spreading white light into a rainbow!"
        : "Turn the prism angle higher to bend the sunlight into a glowing rainbow!",
      rainbowVisible,
      rainbowSpread,
      activeCount: 3,
    };
  }

  const r = beams.red;
  const g = beams.green;
  const b = beams.blue;
  const activeCount = (r ? 1 : 0) + (g ? 1 : 0) + (b ? 1 : 0);

  if (activeCount === 0) {
    return {
      hex: "#1A2438",
      colorName: "Dark Night Room",
      discovery: "Switch on Red, Green, or Blue flashlights to mix beams of light!",
      rainbowVisible: false,
      rainbowSpread: 0,
      activeCount: 0,
    };
  }
  if (r && g && b) {
    const rainbowVisible = clampedAngle >= 15;
    return {
      hex: "#FFFDF8",
      colorName: "Pure White Light!",
      discovery: "All three light beams add together to make bright White Light — the opposite of paint!",
      rainbowVisible,
      rainbowSpread: rainbowVisible ? (clampedAngle - 10) / 50 : 0,
      activeCount: 3,
    };
  }
  if (r && g) {
    return {
      hex: "#FFF05A",
      colorName: "Glowing Yellow Light",
      discovery: "Surprise! Red light and Green light combine to make bright Yellow light!",
      rainbowVisible: false,
      rainbowSpread: 0,
      activeCount: 2,
    };
  }
  if (g && b) {
    return {
      hex: "#45F0E8",
      colorName: "Lagoon Cyan Light",
      discovery: "Green light and Blue light add together into glowing Cyan!",
      rainbowVisible: false,
      rainbowSpread: 0,
      activeCount: 2,
    };
  }
  if (r && b) {
    return {
      hex: "#F255E5",
      colorName: "Bright Magenta Light",
      discovery: "Red light and Blue light shine together to make electric Magenta!",
      rainbowVisible: false,
      rainbowSpread: 0,
      activeCount: 2,
    };
  }
  if (r) {
    return {
      hex: "#FF5252",
      colorName: "Red Light Beam",
      discovery: "Add Green light or Blue light to see what glowing color appears!",
      rainbowVisible: false,
      rainbowSpread: 0,
      activeCount: 1,
    };
  }
  if (g) {
    return {
      hex: "#38D975",
      colorName: "Green Light Beam",
      discovery: "Try turning on Red light too — light mixes differently from paint!",
      rainbowVisible: false,
      rainbowSpread: 0,
      activeCount: 1,
    };
  }
  return {
    hex: "#4A8CFF",
    colorName: "Blue Light Beam",
    discovery: "Add Red or Green light to create glowing Magenta or Cyan!",
    rainbowVisible: false,
    rainbowSpread: 0,
    activeCount: 1,
  };
}

export const COLOR_LIGHT_CHALLENGES: readonly ColorLightChallenge[] = [
  {
    id: "make-green",
    mode: "paint",
    prompt: "Can you mix Palm Green paint in the bowl?",
    hint: "Try adding Yellow and Blue paint drops!",
    check: (state) => state.mode === "paint" && state.drops.yellow > 0 && state.drops.blue > 0 && state.drops.red === 0,
  },
  {
    id: "make-coral",
    mode: "paint",
    prompt: "Can you mix warm Island Coral paint?",
    hint: "Combine Red, Yellow, and a splash of White!",
    check: (state) =>
      state.mode === "paint" &&
      state.drops.red > 0 &&
      state.drops.yellow > 0 &&
      state.drops.white > 0 &&
      state.drops.blue === 0,
  },
  {
    id: "make-white-light",
    mode: "light",
    prompt: "Switch to Prism & Light and make Pure White Light!",
    hint: "Turn on Red, Green, and Blue light beams all at once!",
    check: (state) => state.mode === "light" && state.beams.red && state.beams.green && state.beams.blue,
  },
  {
    id: "split-rainbow",
    mode: "light",
    prompt: "Split bright sunlight through the prism into a wide rainbow!",
    hint: "Tap Sunlight Prism and tilt the angle to 30 degrees or more!",
    check: (state) => state.mode === "light" && state.sunlightThroughPrism && state.prismAngle >= 30,
  },
];

export type ColorLightAction =
  | { type: "set-mode"; mode: ColorLabMode }
  | { type: "add-drop"; pigment: PigmentId }
  | { type: "stir" }
  | { type: "clear-bowl" }
  | { type: "toggle-beam"; beam: LightBeamId }
  | { type: "set-prism-angle"; angle: number }
  | { type: "toggle-sunlight" }
  | { type: "next-challenge" }
  | { type: "reset" };

export function reduceColorLight(state: ColorLightState, action: ColorLightAction): ColorLightState {
  switch (action.type) {
    case "set-mode":
      return { ...state, mode: action.mode };
    case "add-drop": {
      const currentTotal = Object.values(state.drops).reduce((sum, count) => sum + count, 0);
      if (currentTotal >= MAX_PAINT_DROPS) return state;
      return {
        ...state,
        drops: { ...state.drops, [action.pigment]: state.drops[action.pigment] + 1 },
      };
    }
    case "stir":
      return { ...state, stirCount: state.stirCount + 1 };
    case "clear-bowl":
      return {
        ...state,
        drops: { red: 0, yellow: 0, blue: 0, white: 0, black: 0 },
        stirCount: 0,
      };
    case "toggle-beam":
      return {
        ...state,
        sunlightThroughPrism: false,
        beams: { ...state.beams, [action.beam]: !state.beams[action.beam] },
      };
    case "set-prism-angle":
      return { ...state, prismAngle: Math.max(0, Math.min(60, Math.round(action.angle))) };
    case "toggle-sunlight":
      return { ...state, sunlightThroughPrism: !state.sunlightThroughPrism };
    case "next-challenge":
      return { ...state, challengeIndex: (state.challengeIndex + 1) % COLOR_LIGHT_CHALLENGES.length };
    case "reset":
      return createColorLightState();
  }
}
