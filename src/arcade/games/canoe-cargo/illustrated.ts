import type { CargoKind } from "./engine";
export type CargoArt = { source: () => number; pixels: readonly [number, number]; /** Nonzero-alpha bounds: left, top, width, height. */ ink: readonly [number, number, number, number] };
/** Literal lazy requires let Metro discover assets without loading them at import time. */
export const illustrated = {
  crate: { source: () => require("../../../../assets/arcade/canoe-cargo/crate.webp"), pixels: [320, 320], ink: [14, 14, 292, 292] },
  coconut: { source: () => require("../../../../assets/arcade/canoe-cargo/coconut.webp"), pixels: [320, 320], ink: [14, 16, 292, 287] },
  fish: { source: () => require("../../../../assets/arcade/canoe-cargo/fish.webp"), pixels: [320, 320], ink: [14, 14, 292, 292] },
  taro: { source: () => require("../../../../assets/arcade/canoe-cargo/taro.webp"), pixels: [320, 320], ink: [14, 14, 292, 292] },
} satisfies Record<CargoKind, CargoArt>;
/** Keep the complete transparent canvas inside the tile, including Android's image bounds. */
export function cargoArtFrame(art: CargoArt, size: number) {
  const scale = Math.max(0, size * .96) / Math.max(...art.pixels);
  const width = art.pixels[0] * scale, height = art.pixels[1] * scale;
  return { position: "absolute" as const, width, height, left: (size - width) / 2, top: (size - height) / 2 };
}
