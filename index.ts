import { runGame } from "./src/run-game";
import { GameOfLife } from "./src/game-of-life";

const game = GameOfLife.fromRandomGrid(10, 10, 0.3);
runGame(game);
