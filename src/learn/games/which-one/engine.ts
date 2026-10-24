import { stubEngine } from "../../stub";
// Placeholder: the Which One? worker replaces this file with the real pure engine.
export const engine = stubEngine({
  id: "which-one",
  name: "Which One?",
  island: "reading",
  tagline: "Read carefully and pick the matching picture.",
  description: "Read carefully and pick the matching picture.",
  help: "Read carefully and pick the matching picture.",
  color: "#7A5AA0",
  surface: "#EEE8F7",
  modes: ["solo","versus"],
});
