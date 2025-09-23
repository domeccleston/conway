use rand::random;

const NEIGHBOR_OFFSETS: [(i32, i32); 8] = [
    (-1, -1), (-1, 0), (-1, 1),
    ( 0, -1),          ( 0, 1),
    ( 1, -1), ( 1, 0), ( 1, 1),
];


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
        NEIGHBOR_OFFSETS.iter()
            .filter_map(|(dx, dy)| self.index(x + dx, y + dy))
            .filter(|&idx| self.cells[idx])
            .count()
    }


    pub fn step(&mut self) {
        for (idx, &alive) in self.cells.iter().enumerate() {
            let x = (idx % self.width) as i32;
            let y = (idx / self.width) as i32;
            let neighbors = self.count_alive_neighbors(x, y);
            
            self.next_cells[idx] = match (alive, neighbors) {
                (true, 2) | (true, 3) => true,
                (false, 3) => true,
                _ => false,
            };
        }
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
