import { GameOfLife } from "./game-of-life";

export async function runGame(graph: GameOfLife, generations: number = 100) {
  for (let i = 0; i < generations; i++) {
    console.clear();
    console.log(`Generation ${i}`);
    graph.print();
    graph.step();

    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
