import { Cell } from "./cell";

export class GameOfLife {
  private cells = new Map<string, Cell>();
  width: number;
  height: number;

  constructor(width: number, height: number) {
    if (width <= 0 || height <= 0) {
      throw new Error("Width and height must be positive");
    }
    this.width = width;
    this.height = height;
  }

  static fromRandomGrid(
    width: number,
    height: number,
    density: number = 0.3,
  ): GameOfLife {
    if (density < 0 || density > 1) {
      throw new Error("Density must be between 0 and 1");
    }
    const graph = new GameOfLife(width, height);

    // Create all cells
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alive = Math.random() < density;
        graph.addCell(x, y, alive);
      }
    }

    // Connect neighbors
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = graph.getCell(x, y)!;

        // Consider all cells with indices that are +-1 on the X or Y axes to be neighbors
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue; // Skip self

            const neighbor = graph.getCell(x + dx, y + dy);
            if (neighbor) {
              cell.addNeighbor(neighbor);
            }
          }
        }
      }
    }

    return graph;
  }

  step(): void {
    for (const cell of this.getAllCells()) {
      cell.step();
    }

    for (const cell of this.getAllCells()) {
      cell.alive = cell.nextState;
      cell.nextState = cell.alive;
    }
  }

  addCell(x: number, y: number, alive: boolean = false): Cell {
    const cell = new Cell(x, y, alive);
    this.cells.set(`${x},${y}`, cell);
    return cell;
  }

  getCell(x: number, y: number): Cell | undefined {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return undefined;
    }
    return this.cells.get(`${x},${y}`);
  }

  getAllCells(): Cell[] {
    return Array.from(this.cells.values());
  }

  print() {
    for (let y = 0; y < this.height; y++) {
      let row = "";
      for (let x = 0; x < this.width; x++) {
        const cell = this.getCell(x, y);
        row += cell?.alive ? "▓▓" : "░░";
      }
      console.log(row);
    }
    console.log();
  }
}
