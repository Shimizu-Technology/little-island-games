import { describe, expect, it } from "vitest";
import { classicPaceLabel } from "../src/games/classics/labels";
import { numberGoal, numberResultDetail, createNumbers } from "../src/games/numbers";
import { createTic, ticChoice, ticMove, ticOutcome, ticTurn, type TicState } from "../src/games/tic";
import { defaultOptions } from "../src/games/types";
describe("honest Classics goals", () => {
  it("calls hard Tic Try to draw, and sets the higher Number goal to lowest total", () => {
    expect(classicPaceLabel("tic-tac-toe", "hard")).toBe("Try to draw");
    expect(classicPaceLabel("memory", "hard")).toBe("Challenge");
    for (const difficulty of ["medium", "hard"] as const) {
      const s = createNumbers({ ...defaultOptions, difficulty });
      expect(numberGoal(s)).toContain("lowest total");
      expect(numberGoal(s)).toContain("very rare");
      expect(numberGoal(s)).not.toMatch(/276|percent|%/);
      expect(numberResultDetail({ ...s, available: [9], dice: [1, 1] })).toContain("9 left");
    }
    expect(numberGoal(createNumbers(defaultOptions))).toContain("roll again");
  });
  it("keeps the close-every-number goal for earlier Gentle saves", () => {
    const s = createNumbers(defaultOptions);
    delete s.gentlePractice;
    expect(numberGoal(s)).toContain("Close every number");
    expect(numberGoal(s)).not.toContain("lowest total");
    expect(numberGoal(s)).not.toContain("roll again");
  });
  it("hard Tic cannot be beaten across every human branch, both shapes and first players", () => {
    let leaves = 0;
    function play(s: TicState) {
      const result = ticOutcome(s.board);
      if (result) { expect(result).not.toBe(s.human); leaves++; return; }
      if (ticTurn(s.board, s.first) !== s.human) return play(ticMove(s, ticChoice(s)!));
      for (let i = 0; i < 9; i++) if (!s.board[i]) play(ticMove(s, i));
    }
    for (const human of ["X", "O"] as const) for (const first of ["X", "O"] as const) play({ ...createTic({ ...defaultOptions, difficulty: "hard" }), human, first });
    expect(leaves).toBeGreaterThan(1000);
  });
});
