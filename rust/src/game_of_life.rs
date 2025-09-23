use rand::random;
use std::collections::HashSet;

#[derive(Debug)]
pub struct Cell {
    pub id: usize,
    pub x: i32,
    pub y: i32,
    pub alive: bool,
    pub next_state: bool,
    pub neighbors: HashSet<usize>,
}

#[derive(Default)]
pub struct CellConfig {
    pub id: usize,   // defaults to 0
    pub x: i32,      // defaults to 0
    pub y: i32,      // defaults to 0
    pub alive: bool, // defaults to false
}

impl Cell {
    pub fn new(id: usize, x: i32, y: i32, alive: bool) -> Cell {
        Cell {
            id,
            x,
            y,
            alive,
            next_state: false,
            neighbors: HashSet::new(),
        }
    }

    pub fn from_config(config: CellConfig) -> Cell {
        Cell::new(config.id, config.x, config.y, config.alive)
    }

    pub fn add_neighbor(&mut self, neighbor_id: usize) {
        self.neighbors.insert(neighbor_id);
    }

    pub fn get_alive_neighbor_count(&self, game: &GameOfLife) -> usize {
        self.neighbors
            .iter()
            .filter_map(|&id| game.get_cell(id))
            .filter(|cell| cell.alive)
            .count()
    }
}

pub struct GameOfLife {
    width: usize,
    height: usize,
    cells: Vec<Cell>,
    next_id: usize,
}

impl GameOfLife {
    pub fn from_random_grid(width: usize, height: usize, density: f64) -> Self {
        let mut game = GameOfLife::new(width, height);

        // Phase 1: Create all cells
        for y in 0..height {
            for x in 0..width {
                let alive = rand::random::<f64>() < density; // You'll need rand crate
                game.add_cell(x as i32, y as i32, alive);
            }
        }

        // Phase 2: Connect neighbors
        for y in 0..height {
            for x in 0..width {
                let cell_id = y * width + x; // Calculate ID from coordinates

                // Check all 8 directions
                for dx in -1..=1 {
                    for dy in -1..=1 {
                        if dx == 0 && dy == 0 {
                            continue;
                        } // Skip self

                        let neighbor_x = x as i32 + dx;
                        let neighbor_y = y as i32 + dy;

                        // Check bounds
                        if neighbor_x >= 0
                            && neighbor_x < width as i32
                            && neighbor_y >= 0
                            && neighbor_y < height as i32
                        {
                            let neighbor_id = (neighbor_y as usize) * width + (neighbor_x as usize);
                            game.add_neighbor_relationship(cell_id, neighbor_id);
                        }
                    }
                }
            }
        }

        game
    }

    pub fn new(width: usize, height: usize) -> Self {
        Self {
            cells: Vec::new(),
            next_id: 0,
            width,
            height,
        }
    }

    pub fn get_cell(&self, id: usize) -> Option<&Cell> {
        self.cells.get(id)
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

    pub fn step(&mut self) {
        // Phase 1: Calculate next states (read-only pass)
        let next_states: Vec<bool> = self
            .cells
            .iter()
            .map(|cell| {
                let alive_neighbors = cell.get_alive_neighbor_count(self);
                if cell.alive {
                    // Live cells stay alive with 2 or 3 neighbors
                    alive_neighbors == 2 || alive_neighbors == 3
                } else {
                    // Dead cells become alive with exactly 3 neighbors
                    alive_neighbors == 3
                }
            })
            .collect();

        // Phase 2: Apply the states (mutable pass)
        for (cell, &next_state) in self.cells.iter_mut().zip(next_states.iter()) {
            cell.alive = next_state;
            cell.next_state = next_state;
        }
    }

    pub fn add_neighbor_relationship(&mut self, cell1_id: usize, cell2_id: usize) {
        // Add cell2 as neighbor of cell1
        if let Some(cell1) = self.cells.get_mut(cell1_id) {
            cell1.neighbors.insert(cell2_id);
        }
        // Add cell1 as neighbor of cell2 (bidirectional)
        if let Some(cell2) = self.cells.get_mut(cell2_id) {
            cell2.neighbors.insert(cell1_id);
        }
    }

    pub fn print(&self) {
        for y in 0..self.height {
            let mut row = String::new();
            for x in 0..self.width {
                let cell_id = y * self.width + x;
                if let Some(cell) = self.get_cell(cell_id) {
                    row.push_str(if cell.alive { "██" } else { "░░" });
                }
            }
            println!("{}", row);
        }
        println!();
    }
}
