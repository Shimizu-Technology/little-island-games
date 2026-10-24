import { stubEngine } from "../../stub";
// Placeholder: the Sound Boat worker replaces this file with the real pure engine.
export const engine = stubEngine({
  id: "sound-boat",
  name: "Sound Boat",
  island: "reading",
  tagline: "Build words one sound at a time.",
  description: "Build words one sound at a time.",
  help: "Build words one sound at a time.",
  color: "#386C9A",
  surface: "#E3EEF8",
  modes: ["solo","together","versus"],
});
