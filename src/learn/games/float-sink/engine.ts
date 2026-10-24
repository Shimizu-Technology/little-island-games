import { stubEngine } from "../../stub";
// Placeholder: the Float or Sink worker replaces this file with the real pure engine.
export const engine = stubEngine({
  id: "float-sink",
  name: "Float or Sink",
  island: "science",
  tagline: "Predict, drop, and build a boat that floats.",
  description: "Predict, drop, and build a boat that floats.",
  help: "Predict, drop, and build a boat that floats.",
  color: "#3A6FA0",
  surface: "#E1ECF7",
  modes: ["solo","versus"],
});
