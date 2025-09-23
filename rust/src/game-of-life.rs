struct GameOfLife {
    width: usize,
    height: usize,
    cells: Vec<Cell>,
    next_id: usize,
}

impl GameOfLife {
    fn new(width: usize, height: usize) -> Self {
        Self {
            cells: Vec::new(),
            next_id: 0,
            width,
            height,
        }
    }

    fn get_all_cells(&self) -> &[Cell] {
        &self.cells
    }

    fn add_cell(&mut self, x: i32, y: i32, alive: bool) -> usize {
        let id = self.next_id;
        self.next_id += 1;

        let cell = Cell::new(id, x, y, alive);
        self.cells.push(cell);

        id
    }
}

fn main() {
    let game = GameOfLife::new(10, 15);
    println!(game)
}
