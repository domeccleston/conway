type Cell = [number, number];
type World = Set<string>; // Set of "x,y" coordinate strings

const cellKey = (x: number, y: number): string => `${x},${y}`;
const parseCell = (key: string): Cell => key.split(",").map(Number) as Cell;

function neighbors([x, y]: Cell): Cell[] {
  return [
    [x - 1, y - 1],
    [x, y - 1],
    [x + 1, y - 1],
    [x - 1, y],
    [x + 1, y],
    [x - 1, y + 1],
    [x, y + 1],
    [x + 1, y + 1],
  ] as Cell[];
}

function neighborCounts(world: World): Map<string, number> {
  const counts = new Map<string, number>();

  for (const cellKeyStr of world) {
    const cell = parseCell(cellKeyStr);
    for (const [x, y] of neighbors(cell)) {
      const key = cellKey(x, y);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  return counts;
}

function nextGeneration(world: World): World {
  const counts = neighborCounts(world);
  const next = new Set<string>();

  for (const [key, count] of counts) {
    if (count === 3 || (count === 2 && world.has(key))) {
      next.add(key);
    }
  }

  return next;
}

function run(world: World, n: number): World {
  let current = world;
  for (let g = 0; g < n; g++) {
    current = nextGeneration(current);
  }
  return current;
}

function picture(world: World, viewport: Viewport, cursor?: Cursor): string {
  const LIVE = "@";
  const EMPTY = ".";
  const CURSOR = "+";
  const CURSOR_ON_LIVE = "#";
  const PAD = " ";

  if (viewport.zoom >= 1.0) {
    // Zoomed in: show cells larger
    return pictureZoomedIn(world, viewport, cursor);
  } else {
    // Zoomed out: show multiple cells per character
    return pictureZoomedOut(world, viewport, cursor);
  }
}

function pictureZoomedIn(
  world: World,
  viewport: Viewport,
  cursor?: Cursor,
): string {
  const LIVE = "@";
  const EMPTY = ".";
  const CURSOR = "+";
  const CURSOR_ON_LIVE = "#";
  const PAD = " ";

  const cellsPerChar = Math.floor(viewport.zoom);
  const result: string[] = [];

  const worldBounds = getWorldBounds(viewport);

  for (let worldY = worldBounds.minY; worldY <= worldBounds.maxY; worldY++) {
    // Repeat each row based on zoom level
    for (let repeat = 0; repeat < cellsPerChar; repeat++) {
      const row: string[] = [];
      for (
        let worldX = worldBounds.minX;
        worldX <= worldBounds.maxX;
        worldX++
      ) {
        const isAlive = world.has(cellKey(worldX, worldY));
        const isCursor = cursor && cursor.x === worldX && cursor.y === worldY;

        let char = EMPTY;
        if (isCursor && isAlive) char = CURSOR_ON_LIVE;
        else if (isCursor) char = CURSOR;
        else if (isAlive) char = LIVE;

        // Repeat each character based on zoom level
        for (let i = 0; i < cellsPerChar; i++) {
          row.push(char);
        }
      }
      result.push(row.join(PAD));
    }
  }

  return result.join("\n");
}

function pictureZoomedOut(
  world: World,
  viewport: Viewport,
  cursor?: Cursor,
): string {
  const DENSITY_CHARS = [".", "░", "▒", "▓", "█"]; // 0%, 25%, 50%, 75%, 100% density
  const CURSOR_CHAR = "+";
  const PAD = " ";

  const cellsPerChar = Math.floor(1 / viewport.zoom);
  const result: string[] = [];

  for (let screenY = 0; screenY < viewport.height; screenY++) {
    const row: string[] = [];
    for (let screenX = 0; screenX < viewport.width; screenX++) {
      const worldStartX = Math.floor(viewport.x + screenX * cellsPerChar);
      const worldStartY = Math.floor(viewport.y + screenY * cellsPerChar);

      // Check if cursor is in this region
      let hasCursor = false;
      if (cursor) {
        hasCursor =
          cursor.x >= worldStartX &&
          cursor.x < worldStartX + cellsPerChar &&
          cursor.y >= worldStartY &&
          cursor.y < worldStartY + cellsPerChar;
      }

      if (hasCursor) {
        row.push(CURSOR_CHAR);
      } else {
        // Count live cells in this region
        let liveCount = 0;
        let totalCells = 0;

        for (let dy = 0; dy < cellsPerChar; dy++) {
          for (let dx = 0; dx < cellsPerChar; dx++) {
            const worldX = worldStartX + dx;
            const worldY = worldStartY + dy;
            totalCells++;
            if (world.has(cellKey(worldX, worldY))) {
              liveCount++;
            }
          }
        }

        // Convert to density character
        const density = liveCount / totalCells;
        let charIndex = 0;
        if (density > 0.8) charIndex = 4;
        else if (density > 0.6) charIndex = 3;
        else if (density > 0.4) charIndex = 2;
        else if (density > 0.2) charIndex = 1;
        else charIndex = 0;

        row.push(DENSITY_CHARS[charIndex]);
      }
    }
    result.push(row.join(PAD));
  }

  return result.join("\n");
}

function clearScreen(): void {
  console.log("\x1b[2J\x1b[H"); // ANSI clear screen and home cursor
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number; // 1.0 = normal, 0.5 = zoomed out, 2.0 = zoomed in
}

interface Cursor {
  x: number; // World coordinates
  y: number;
}

function createViewport(
  x: number = 0,
  y: number = 0,
  width: number = 25,
  height: number = 15,
  zoom: number = 1.0,
): Viewport {
  return { x, y, width, height, zoom };
}

function createCursor(worldX: number = 0, worldY: number = 0): Cursor {
  return { x: worldX, y: worldY };
}

function isCursorInViewport(cursor: Cursor, viewport: Viewport): boolean {
  const worldBounds = getWorldBounds(viewport);
  return (
    cursor.x >= worldBounds.minX &&
    cursor.x <= worldBounds.maxX &&
    cursor.y >= worldBounds.minY &&
    cursor.y <= worldBounds.maxY
  );
}

function centerCursorInViewport(viewport: Viewport): Cursor {
  const worldBounds = getWorldBounds(viewport);
  return {
    x: Math.floor((worldBounds.minX + worldBounds.maxX) / 2),
    y: Math.floor((worldBounds.minY + worldBounds.maxY) / 2),
  };
}

function getWorldBounds(viewport: Viewport) {
  const cellsPerChar = 1 / viewport.zoom;
  const worldWidth = viewport.width * cellsPerChar;
  const worldHeight = viewport.height * cellsPerChar;

  return {
    minX: Math.floor(viewport.x),
    maxX: Math.floor(viewport.x + worldWidth - 1),
    minY: Math.floor(viewport.y),
    maxY: Math.floor(viewport.y + worldHeight - 1),
  };
}

function createViewport(
  x: number = 0,
  y: number = 0,
  width: number = 25,
  height: number = 15,
  zoom: number = 1.0,
): Viewport {
  return { x, y, width, height, zoom };
}

function getViewportRange(viewport: Viewport): {
  xRange: number[];
  yRange: number[];
} {
  if (viewport.zoom >= 1.0) {
    // Zoomed in: each cell can be multiple characters
    const xRange = Array.from(
      { length: viewport.width },
      (_, i) => viewport.x + Math.floor(i / viewport.zoom),
    );
    const yRange = Array.from(
      { length: viewport.height },
      (_, i) => viewport.y + Math.floor(i / viewport.zoom),
    );
    return { xRange, yRange };
  } else {
    // Zoomed out: multiple cells per character
    const cellsPerChar = 1 / viewport.zoom;
    const xRange = Array.from(
      { length: viewport.width },
      (_, i) => viewport.x + i * cellsPerChar,
    );
    const yRange = Array.from(
      { length: viewport.height },
      (_, i) => viewport.y + i * cellsPerChar,
    );
    return { xRange, yRange };
  }
}

function panViewport(viewport: Viewport, dx: number, dy: number): Viewport {
  return {
    ...viewport,
    x: viewport.x + dx,
    y: viewport.y + dy,
  };
}

async function displayRun(
  world: World,
  n: number = 10,
  xRange: number[] = Array.from({ length: 10 }, (_, i) => i),
  yRange: number[] = Array.from({ length: 10 }, (_, i) => i),
  pauseMs: number = 1000,
): Promise<void> {
  let current = world;

  for (let g = 0; g <= n; g++) {
    clearScreen();
    console.log(`Generation ${g}, Population ${current.size}`);
    console.log(picture(current, xRange, yRange));

    if (g < n) {
      await sleep(pauseMs);
      current = nextGeneration(current);
    }
  }
}

async function interactiveMode(initialWorld: World): Promise<void> {
  let world = initialWorld;
  let viewport = createViewport(0, 0, 25, 15, 1.0);
  let cursor = centerCursorInViewport(viewport);
  let generation = 0;
  let running = false;
  let lastTick = Date.now();
  const TICK_INTERVAL = 500; // ms between generations when running

  // Setup raw mode for immediate key capture
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  const render = () => {
    const worldBounds = getWorldBounds(viewport);
    clearScreen();
    console.log(`=== Game of Life - Interactive Mode ===`);
    console.log(
      `Generation: ${generation} | Population: ${world.size} | ${running ? "RUNNING" : "PAUSED"}`,
    );
    console.log(
      `Viewport: (${viewport.x.toFixed(1)}, ${viewport.y.toFixed(1)}) ${viewport.width}x${viewport.height} | Zoom: ${viewport.zoom.toFixed(2)}x`,
    );
    console.log(
      `World bounds: X[${worldBounds.minX}-${worldBounds.maxX}] Y[${worldBounds.minY}-${worldBounds.maxY}]`,
    );
    console.log(
      `Cursor: (${cursor.x}, ${cursor.y}) | Cell: ${world.has(cellKey(cursor.x, cursor.y)) ? "ALIVE" : "DEAD"}`,
    );
    console.log(
      `Controls: WASD=pan | Arrows=cursor | ENTER=toggle | +/-=zoom | SPACE=step | R=run | Q=quit`,
    );
    console.log("");
    console.log(picture(world, viewport, cursor));
    if (viewport.zoom < 1.0) {
      console.log(
        `\nZoomed out view: . = empty | ░▒▓█ = increasing density | + = cursor`,
      );
    } else {
      console.log(
        `\nLegend: @ = alive | . = dead | + = cursor | # = cursor on alive cell`,
      );
    }
  };

  const tick = () => {
    world = nextGeneration(world);
    generation++;
    render();
  };

  const toggleCell = (x: number, y: number) => {
    const key = cellKey(x, y);
    if (world.has(key)) {
      world.delete(key);
    } else {
      world.add(key);
    }
  };

  const zoomIn = () => {
    viewport.zoom = Math.min(viewport.zoom * 2, 8.0);
    cursor = centerCursorInViewport(viewport);
    render();
  };

  const zoomOut = () => {
    viewport.zoom = Math.max(viewport.zoom / 2, 0.125);
    cursor = centerCursorInViewport(viewport);
    render();
  };

  const gameLoop = setInterval(() => {
    if (running && Date.now() - lastTick >= TICK_INTERVAL) {
      tick();
      lastTick = Date.now();
    }
  }, 50);

  render();

  const handleKey = (key: string) => {
    // Handle escape sequences for arrow keys
    if (key === "\x1b[A") {
      // Up arrow
      const stepSize = viewport.zoom >= 1.0 ? 1 : Math.floor(1 / viewport.zoom);
      cursor.y = Math.max(cursor.y - stepSize, getWorldBounds(viewport).minY);
      render();
      return;
    }
    if (key === "\x1b[B") {
      // Down arrow
      const stepSize = viewport.zoom >= 1.0 ? 1 : Math.floor(1 / viewport.zoom);
      cursor.y = Math.min(cursor.y + stepSize, getWorldBounds(viewport).maxY);
      render();
      return;
    }
    if (key === "\x1b[C") {
      // Right arrow
      const stepSize = viewport.zoom >= 1.0 ? 1 : Math.floor(1 / viewport.zoom);
      cursor.x = Math.min(cursor.x + stepSize, getWorldBounds(viewport).maxX);
      render();
      return;
    }
    if (key === "\x1b[D") {
      // Left arrow
      const stepSize = viewport.zoom >= 1.0 ? 1 : Math.floor(1 / viewport.zoom);
      cursor.x = Math.max(cursor.x - stepSize, getWorldBounds(viewport).minX);
      render();
      return;
    }

    switch (key.toLowerCase()) {
      case "w":
        const panStepY =
          viewport.zoom >= 1.0 ? 3 : Math.floor(3 / viewport.zoom);
        viewport = panViewport(viewport, 0, -panStepY);
        if (!isCursorInViewport(cursor, viewport)) {
          cursor = centerCursorInViewport(viewport);
        }
        render();
        break;
      case "s":
        const panStepYDown =
          viewport.zoom >= 1.0 ? 3 : Math.floor(3 / viewport.zoom);
        viewport = panViewport(viewport, 0, panStepYDown);
        if (!isCursorInViewport(cursor, viewport)) {
          cursor = centerCursorInViewport(viewport);
        }
        render();
        break;
      case "a":
        const panStepX =
          viewport.zoom >= 1.0 ? 5 : Math.floor(5 / viewport.zoom);
        viewport = panViewport(viewport, -panStepX, 0);
        if (!isCursorInViewport(cursor, viewport)) {
          cursor = centerCursorInViewport(viewport);
        }
        render();
        break;
      case "d":
        const panStepXRight =
          viewport.zoom >= 1.0 ? 5 : Math.floor(5 / viewport.zoom);
        viewport = panViewport(viewport, panStepXRight, 0);
        if (!isCursorInViewport(cursor, viewport)) {
          cursor = centerCursorInViewport(viewport);
        }
        render();
        break;
      case "\r": // Enter key
        if (viewport.zoom >= 1.0) {
          toggleCell(cursor.x, cursor.y);
          render();
        } else {
          console.log("\nZoom in to edit individual cells!");
          setTimeout(render, 1000);
        }
        break;
      case "+":
      case "=":
        zoomIn();
        break;
      case "-":
      case "_":
        zoomOut();
        break;
      case " ":
        tick();
        break;
      case "r":
        running = !running;
        lastTick = Date.now();
        render();
        break;
      case "g":
        if (viewport.zoom >= 1.0) {
          // Add a glider at cursor position
          const gliderCells: Cell[] = [
            [cursor.x + 1, cursor.y],
            [cursor.x + 2, cursor.y + 1],
            [cursor.x, cursor.y + 2],
            [cursor.x + 1, cursor.y + 2],
            [cursor.x + 2, cursor.y + 2],
          ];
          const newGlider = createWorld(gliderCells);
          world = new Set([...world, ...newGlider]);
          render();
        } else {
          console.log("\nZoom in to place patterns!");
          setTimeout(render, 1000);
        }
        break;
      case "c":
        // Center cursor in viewport
        cursor = centerCursorInViewport(viewport);
        render();
        break;
      case "q":
      case "\x03": // Ctrl+C
        cleanup();
        break;
    }
  };

  const cleanup = () => {
    clearInterval(gameLoop);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    console.log("\nGoodbye!");
    process.exit(0);
  };

  process.stdin.on("data", handleKey);
  process.on("SIGINT", cleanup);
}

// Helper function to create patterns
function createWorld(cells: Cell[]): World {
  const world = new Set<string>();
  for (const [x, y] of cells) {
    world.add(cellKey(x, y));
  }
  return world;
}

// Test patterns
const block = createWorld([
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
]);

const blinker = createWorld([
  [0, 0],
  [1, 0],
  [2, 0],
]);

const glider = createWorld([
  [1, 0],
  [2, 1],
  [0, 2],
  [1, 2],
  [2, 2],
]);

const square3x3 = createWorld([
  [0, 0],
  [1, 0],
  [2, 0],
  [0, 1],
  [1, 1],
  [2, 1],
  [0, 2],
  [1, 2],
  [2, 2],
]);

// Example usage:
async function main() {
  console.log("Game of Life - Choose mode:");
  console.log("1. Demo patterns");
  console.log("2. Interactive mode");

  // For now, let's default to interactive mode with a glider
  console.log("Starting interactive mode with glider...\n");
  await interactiveMode(glider);
}

// Run the demo if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
