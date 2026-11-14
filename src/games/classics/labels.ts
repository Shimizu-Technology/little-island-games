import { difficultyLabel, type Difficulty, type GameId } from "../index";
export const classicPaceLabel = (game: GameId, difficulty: Difficulty) => game === "tic-tac-toe" && difficulty === "hard" ? "Try to draw" : difficultyLabel[difficulty];
