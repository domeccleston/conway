# https://nbviewer.org/url/norvig.com/ipython/Life.ipynb
from collections import Counter
import time

world = {
    (0, 0), (1, 0), (2, 0),
    (0, 1), (1, 1), (2, 1),
    (0, 2), (1, 2), (2, 2)
}

def neighbors(cell):
    "All 8 adjacent neighbors of cell."
    (x, y) = cell
    return [(x-1, y-1), (x, y-1), (x+1, y-1),
            (x-1, y),             (x+1, y),
            (x-1, y+1), (x, y+1), (x+1, y+1)]

def neighbor_counts(world):
    "A {cell: int} counter of the number of live neighbors for each cell that has neighbors."
    return Counter(nb for cell in world
                        for nb in neighbors(cell))

def next_generation(world):
    "The set of live cells in the next generation."
    possible_cells = counts = neighbor_counts(world)
    return {cell for cell in possible_cells
            if (counts[cell] == 3)
            or (counts[cell] == 2 and cell in world)}

def run(world, n):
    "Run the world for n generations. No display; just return the nth generation."
    for g in range(n):
        world = next_generation(world)
    return world

LIVE  = '@'
EMPTY = '.'
PAD   = ' '

def display_html(text, raw=False): print(text)
def clear_output(): print("\033[;H\033[2J") # ANSI terminal home and clear
def pre(text): return text

def display_run(world, n=10, Xs=range(10), Ys=range(10), pause=1):
    "Step and display the world for the given number of generations."
    for g in range(n + 1):
        clear_output()
        display_html('Generation {}, Population {}\n{}'
                     .format(g, len(world), pre(picture(world, Xs, Ys))),
                     raw=True)
        time.sleep(pause)
        world = next_generation(world)


def picture(world, Xs, Ys):
    "Return a picture: a grid of characters representing the cells in this window."
    def row(y): return PAD.join(LIVE if (x, y) in world else EMPTY for x in Xs)
    return '\n'.join(row(y) for y in Ys)

display_run(world, 10, range(5), range(5))
