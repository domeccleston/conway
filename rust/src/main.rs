mod game_of_life;
use game_of_life::GameOfLife;

fn main() {
    let mut game = GameOfLife::from_random_grid(10, 10, 0.3);

    for generation in 0..101 {
        println!("Generation {}", generation);
        game.print();
        game.step();

        // Add a small delay if you want
        std::thread::sleep(std::time::Duration::from_millis(200));
    }
}
