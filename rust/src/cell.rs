use std::collections::HashSet;

#[derive(Debug)]
struct Cell {
    id: usize,
    x: i32,
    y: i32,
    alive: bool,
    next_state: bool,
    neighbors: HashSet<usize>,
}

#[derive(Default)] 
struct CellConfig {
    id: usize,   // defaults to 0
    x: i32,      // defaults to 0
    y: i32,      // defaults to 0
    alive: bool, // defaults to false
}

impl Cell {
    fn new(id: usize, x: i32, y: i32, alive: bool) -> Cell {
        Cell {
            id,
            x,
            y,
            alive,
            next_state: false,
            neighbors: HashSet::new(),
        }
    }

    fn from_config(config: CellConfig) -> Cell {
        Cell::new(config.id, config.x, config.y, config.alive)
    }
}

fn main() {
    let cell1 = Cell::from_config(CellConfig {
        id: 0,
        x: 1,
        y: 1,
        alive: true,
    });

    let cell2 = Cell::from_config(CellConfig {
        id: 1,
        x: 5,
        y: 3,
        ..Default::default() // alive automatically becomes false
    });

    println!("{:?}", cell1);
    println!("{:?}", cell2);
}
