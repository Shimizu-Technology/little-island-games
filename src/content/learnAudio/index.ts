import reading from "./reading";
import numbers from "./numbers";
import science from "./science";
import home from "./home";
import math from "./math";
import c1Crab from "./c1-crab";
import c1bCrab from "./c1b-crab";
import c1dCrabDepth from "./c1d-crab-depth";
import c2aBeep from "./c2a-beep";
import p3aClassics from "./p3a-classics";
/** Learning-game speech. Each slice owns one generated module so parallel work never edits the same file. */
export const learnSources: Record<string, number> = { ...reading, ...numbers, ...science, ...home, ...math, ...c1Crab, ...c1bCrab, ...c1dCrabDepth, ...c2aBeep, ...p3aClassics };
