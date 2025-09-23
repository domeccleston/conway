pub struct GameOfLife {
    width: usize,
    height: usize,
    cells: Vec<bool>,      // Just alive/dead, indexed by y*width + x
    next_cells: Vec<bool>, // Buffer for next generation
}

impl GameOfLife {
    pub fn from_random_grid(width: usize, height: usize, density: f64) -> Self {
        let size = width * height;
        let cells: Vec<bool> = (0..size).map(|_| rand::random::<f64>() < density).collect();

        Self {
            width,
            height,
            cells,
            next_cells: vec![false; size],
        }
    }

    pub fn new(width: usize, height: usize) -> Self {
        let size = width * height;
        Self {
            width,
            height,
            cells: vec![false; size],
            next_cells: vec![false; size],
        }
    }

    fn index(&self, x: i32, y: i32) -> Option<usize> {
        if x < 0 || y < 0 || x >= self.width as i32 || y >= self.height as i32 {
            None
        } else {
            Some((y as usize) * self.width + (x as usize))
        }
    }

    fn count_alive_neighbors(&self, x: i32, y: i32) -> usize {
        let mut count = 0;
        for dx in -1..=1 {
            for dy in -1..=1 {
                if dx == 0 && dy == 0 {
                    continue;
                }

                if let Some(idx) = self.index(x + dx, y + dy) {
                    if self.cells[idx] {
                        count += 1;
                    }
                }
            }
        }
        count
    }

    pub fn step(&mut self) {
        // Calculate next generation
        for y in 0..self.height {
            for x in 0..self.width {
                let idx = y * self.width + x;
                let alive = self.cells[idx];
                let neighbors = self.count_alive_neighbors(x as i32, y as i32);

                self.next_cells[idx] = match (alive, neighbors) {
                    (true, 2) | (true, 3) => true, // Stay alive
                    (false, 3) => true,            // Born
                    _ => false,                    // Die or stay dead
                };
            }
        }

        // Swap buffers
        std::mem::swap(&mut self.cells, &mut self.next_cells);
    }

    pub fn print(&self) {
        for y in 0..self.height {
            for x in 0..self.width {
                let idx = y * self.width + x;
                print!("{}", if self.cells[idx] { "██" } else { "░░" });
            }
            println!();
        }
        println!();
    }
}
