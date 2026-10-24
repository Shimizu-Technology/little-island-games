import { stubEngine } from "../../stub";
// Placeholder: the Tide Pool Lab worker replaces this file with the real pure engine.
export const engine = stubEngine({
  id: "tide-pool",
  name: "Tide Pool Lab",
  island: "science",
  tagline: "Guess, change the weather, and see what grows.",
  description: "Guess, change the weather, and see what grows.",
  help: "Guess, change the weather, and see what grows.",
  color: "#2C6E8F",
  surface: "#DDEFF5",
  modes: ["solo","together"],
});
