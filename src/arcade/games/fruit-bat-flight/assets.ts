// Keep literal requires for Metro and resolve each asset only when its art mounts.
export const flightArt = {
  up: () => require("../../../../assets/arcade/fruit-bat/bat-up.webp"),
  down: () => require("../../../../assets/arcade/fruit-bat/bat-down.webp"),
  bonk: () => require("../../../../assets/arcade/fruit-bat/bat-bonk.webp"),
  mango: () => require("../../../../assets/arcade/fruit-bat/golden-mango.webp"),
  cap: () => require("../../../../assets/arcade/fruit-bat/palm-top.webp"),
  shaft: () => require("../../../../assets/arcade/fruit-bat/palm-shaft.webp"),
  day: () => require("../../../../assets/arcade/fruit-bat/backdrop-day.webp"),
  sunset: () => require("../../../../assets/arcade/fruit-bat/backdrop-sunset.webp"),
};
