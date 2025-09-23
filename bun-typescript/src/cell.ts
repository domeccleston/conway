export class Cell {
  public neighbors: Set<Cell> = new Set();
  nextState: boolean;

  constructor(
    public x: number,
    public y: number,
    public alive: boolean = false,
  ) {
    this.nextState = this.alive;
  }

  addNeighbor(cell: Cell): void {
    if (cell === this) return;
    this.neighbors.add(cell);
  }

  getNeighbors(): Set<Cell> {
    return this.neighbors;
  }

  step(): void {
    const aliveNeighbors = this.getAliveNeighborCount();
    if (this.alive) {
      // live cells stay alive with 2 or 3 neighbors,
      // otherwise die from underpopulation or overpopulation
      if (aliveNeighbors === 2 || aliveNeighbors === 3) {
        this.nextState = true;
      } else {
        this.nextState = false;
      }
    } else {
      // dead cells become alive with exactly 3 neighbors from reproduction
      if (aliveNeighbors === 3) {
        this.nextState = true;
      }
    }
  }

  getAliveNeighborCount(): number {
    return Array.from(this.neighbors)
      .map((cell) => cell.alive)
      .filter((value) => value).length;
  }
}
