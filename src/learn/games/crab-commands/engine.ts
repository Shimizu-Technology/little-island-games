import { stubEngine } from "../../stub";
// Placeholder: the Crab Commands worker replaces this file with the real pure engine.
export const engine = stubEngine({
  id: "crab-commands",
  name: "Crab Commands",
  island: "thinking",
  tagline: "Plan the crab's steps to every shell.",
  description: "Plan the crab's steps to every shell.",
  help: "Plan the crab's steps to every shell.",
  color: "#B0563A",
  surface: "#FBE6DC",
  modes: ["solo","together"],
});
