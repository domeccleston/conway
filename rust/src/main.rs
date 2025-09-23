mod cell;
use cell::{Cell, CellConfig};

fn main() {
    let my_cell = Cell::from_config(CellConfig {
        id: 0,
        x: 1,
        y: 1,
        alive: true,
    });

    println!("{:?}", my_cell);
}
