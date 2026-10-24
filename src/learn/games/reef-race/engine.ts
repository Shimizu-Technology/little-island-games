import { stubEngine } from "../../stub";
// Placeholder: the Reef Race worker replaces this file with the real pure engine.
export const engine = stubEngine({
  id: "reef-race",
  name: "Reef Race",
  island: "numbers",
  tagline: "Roll, count on, and race across the reef.",
  description: "Roll, count on, and race across the reef.",
  help: "Roll, count on, and race across the reef.",
  color: "#2F737C",
  surface: "#DDF0EE",
  modes: ["solo","together","versus"],
});
