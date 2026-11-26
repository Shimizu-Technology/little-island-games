/** Little Island 4.0 Clean tokens (docs/LITTLE_ISLAND_4_DESIGN.md). Screens use these, never raw colors or sizes. */
const ink = "#173330";

const fontWeight = { display: "800", title: "700", body: "600", heavy: "900" } as const;
/** Nunito family names as registered by `useNunito` in fonts.ts. */
const fontFamily = {
  [fontWeight.body]: "Nunito_600SemiBold",
  [fontWeight.title]: "Nunito_700Bold",
  [fontWeight.display]: "Nunito_800ExtraBold",
  [fontWeight.heavy]: "Nunito_900Black",
} as const;

export const theme = {
  colors: {
    bg: "#FFFDF8",
    surface: "#FFFFFF",
    hairline: "#ECE7DC",
    ink,
    muted: "#5B6B68",
    lagoon: "#1E6B66",
    lagoonSoft: "#DDF1EE",
    /** Action coral. Text on it is always ink, never white. */
    coral: "#FF7A5C",
    /** Text-safe green: 6.4:1 on the page, 5.6:1 on its soft fill. */
    success: "#1E6B43",
    successSoft: "#DDF5E6",
    /** Gentle conflict: never red alone, pair with a shape. 5.9:1 on the page, 4.9:1 on its soft fill. */
    conflict: "#B53708",
    conflictSoft: "#FFE0EC",
    /** Switch track when off. */
    track: "#CFD8D5",
    scrim: "rgba(23,51,48,0.38)",
  },
  /** Door and category pastels. */
  pastels: {
    home: "#FFE3D6",
    learn: "#DFF0FF",
    arcade: "#FFF2C2",
    puzzles: "#F3E5FF",
    hall: "#DDF5E6",
    library: "#FFE0EC",
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { tile: 24, sheet: 28, full: 999 },
  /** The one soft shadow, for floating things only (Continue card, sheets, the selected tile). */
  shadow: {
    shadowColor: ink,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    shadowOpacity: 0.08,
    elevation: 4,
  },
  /** Child controls 64, adult controls 48, nothing interactive under 44. */
  target: { child: 64, adult: 48, min: 44 },
  /** Type scale 34 / 28 / 22 / 17 / 15 / 13. Body never drops below 15. */
  type: {
    display: { fontSize: 34, lineHeight: 40, fontWeight: fontWeight.display },
    title: { fontSize: 28, lineHeight: 34, fontWeight: fontWeight.title },
    section: { fontSize: 22, lineHeight: 28, fontWeight: fontWeight.title },
    body: { fontSize: 17, lineHeight: 24, fontWeight: fontWeight.body },
    caption: { fontSize: 15, lineHeight: 21, fontWeight: fontWeight.body },
    small: { fontSize: 13, lineHeight: 18, fontWeight: fontWeight.body },
  },
  fontFamily,
  icon: { size: 24, weight: "bold" as const },
  motion: {
    spring: { damping: 18, stiffness: 180 },
    press: { scale: 0.96, duration: 140 },
  },
  opacity: { disabled: 0.55 },
  /** Hold gate: two seconds, long enough to stop a stray tap and short enough to finish. */
  hold: { ms: 2000 },
  /** HUD row height. */
  hud: { height: 56 },
  /** Sheet heights as a share of the window: start sheets about 55%, in-game sheets at most 40%. */
  sheet: { start: 0.55, small: 0.4, dismissDistance: 90, dismissVelocity: 0.9, maxWidth: 560 },
} as const;

export type TextVariant = keyof typeof theme.type;
export type Pastel = keyof typeof theme.pastels;
export type TargetSize = keyof typeof theme.target;
