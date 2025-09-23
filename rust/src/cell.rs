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
}

fn main() {
    let cell2 = Cell::from_config(CellConfig {
        x: 5,
        y: 3,
        ..Default::default() // alive automatically becomes false
    });

    println!("{:?}", cell2);
}
