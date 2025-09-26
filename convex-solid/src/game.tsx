import type { Component } from "solid-js";
import { createSignal, For, onMount, onCleanup, createEffect } from "solid-js";

// Types from our terminal version
type Cell = [number, number];
type World = Set<string>;

// Pattern types
interface Pattern {
  name: string;
  cells: Cell[];
  description: string;
}

type PlacementMode = "single" | "pattern";

interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

// Helper functions from terminal version
const cellKey = (x: number, y: number): string => `${x},${y}`;

function createWorld(cells: Cell[]): World {
  const world = new Set<string>();
  for (const [x, y] of cells) {
    world.add(cellKey(x, y));
  }
  return world;
}

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
    const [x, y] = cellKeyStr.split(",").map(Number) as Cell;
    for (const [nx, ny] of neighbors([x, y])) {
      const key = cellKey(nx, ny);
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

function getViewportCells(viewport: Viewport) {
  const cells = [];
  for (let y = 0; y < viewport.height; y++) {
    for (let x = 0; x < viewport.width; x++) {
      const worldX = viewport.x + x;
      const worldY = viewport.y + y;
      cells.push({
        x: worldX,
        y: worldY,
        key: cellKey(worldX, worldY),
        screenX: x,
        screenY: y,
      });
    }
  }
  return cells;
}

// Pattern definitions
const patterns: Pattern[] = [
  {
    name: "Single Cell",
    cells: [[0, 0]],
    description: "Toggle individual cells",
  },
  {
    name: "Glider",
    cells: [
      [1, 0],
      [2, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ],
    description: "Moves diagonally across the grid",
  },
  {
    name: "Blinker",
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
    description: "Oscillates between horizontal and vertical",
  },
  {
    name: "Block",
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    description: "Still life - never changes",
  },
  {
    name: "Beacon",
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [3, 2],
      [2, 3],
      [3, 3],
    ],
    description: "Oscillates with period 2",
  },
  {
    name: "Toad",
    cells: [
      [1, 0],
      [2, 0],
      [3, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    description: "Oscillates with period 2",
  },
  {
    name: "LWSS",
    cells: [
      [1, 0],
      [4, 0],
      [0, 1],
      [0, 2],
      [4, 2],
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
    ],
    description: "Lightweight spaceship - travels horizontally",
  },
  {
    name: "Pulsar",
    cells: [
      [2, 0],
      [3, 0],
      [4, 0],
      [8, 0],
      [9, 0],
      [10, 0],
      [0, 2],
      [5, 2],
      [7, 2],
      [12, 2],
      [0, 3],
      [5, 3],
      [7, 3],
      [12, 3],
      [0, 4],
      [5, 4],
      [7, 4],
      [12, 4],
      [2, 5],
      [3, 5],
      [4, 5],
      [8, 5],
      [9, 5],
      [10, 5],
      [2, 7],
      [3, 7],
      [4, 7],
      [8, 7],
      [9, 7],
      [10, 7],
      [0, 8],
      [5, 8],
      [7, 8],
      [12, 8],
      [0, 9],
      [5, 9],
      [7, 9],
      [12, 9],
      [0, 10],
      [5, 10],
      [7, 10],
      [12, 10],
      [2, 12],
      [3, 12],
      [4, 12],
      [8, 12],
      [9, 12],
      [10, 12],
    ],
    description: "Large oscillator with period 3",
  },
];

function placePattern(
  world: World,
  pattern: Pattern,
  centerX: number,
  centerY: number,
): World {
  const newWorld = new Set(world);

  // Calculate pattern bounds to center it properly
  const minX = Math.min(...pattern.cells.map(([x]) => x));
  const maxX = Math.max(...pattern.cells.map(([x]) => x));
  const minY = Math.min(...pattern.cells.map(([, y]) => y));
  const maxY = Math.max(...pattern.cells.map(([, y]) => y));

  const offsetX = centerX - Math.floor((minX + maxX) / 2);
  const offsetY = centerY - Math.floor((minY + maxY) / 2);

  for (const [x, y] of pattern.cells) {
    const worldX = x + offsetX;
    const worldY = y + offsetY;
    newWorld.add(cellKey(worldX, worldY));
  }

  return newWorld;
}

// Test patterns
const glider = createWorld([
  [1, 0],
  [2, 1],
  [0, 2],
  [1, 2],
  [2, 2],
]);

const blinker = createWorld([
  [5, 5],
  [6, 5],
  [7, 5],
]);

export const Game: Component = () => {
  const [world, setWorld] = createSignal<World>(
    new Set([...glider, ...blinker]),
  );
  const [viewport, setViewport] = createSignal<Viewport>({
    x: 0,
    y: 0,
    width: 80,
    height: 40,
    zoom: 1.0,
  });
  const [generation, setGeneration] = createSignal(0);
  const [running, setRunning] = createSignal(false);
  const [isDragging, setIsDragging] = createSignal(false);
  const [dragStart, setDragStart] = createSignal({
    x: 0,
    y: 0,
    viewportX: 0,
    viewportY: 0,
  });
  const [selectedPattern, setSelectedPattern] = createSignal<Pattern>(
    patterns[0],
  );
  const [placementMode, setPlacementMode] =
    createSignal<PlacementMode>("single");

  let gameInterval: number;

  // Calculate viewport size based on window size
  const updateViewportSize = () => {
    const cellSize = 16; // px
    const headerHeight = 120; // approximate height of header
    const width = Math.floor((window.innerWidth - 40) / cellSize); // 40px for padding
    const height = Math.floor((window.innerHeight - headerHeight) / cellSize);

    setViewport((prev) => ({
      ...prev,
      width,
      height,
    }));
  };

  createEffect(() => {
    updateViewportSize();
  });

  const cells = () => getViewportCells(viewport());

  const panViewport = (dx: number, dy: number) => {
    setViewport((prev) => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }));
  };

  const tick = () => {
    setWorld(nextGeneration);
    setGeneration((prev) => prev + 1);
  };

  const toggleRunning = () => {
    const isRunning = !running();
    setRunning(isRunning);

    if (isRunning) {
      gameInterval = setInterval(tick, 500);
    } else {
      clearInterval(gameInterval);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key.toLowerCase()) {
      case "w":
        panViewport(0, -3);
        e.preventDefault();
        break;
      case "s":
        panViewport(0, 3);
        e.preventDefault();
        break;
      case "a":
        panViewport(-3, 0);
        e.preventDefault();
        break;
      case "d":
        panViewport(3, 0);
        e.preventDefault();
        break;
      case " ":
        tick();
        e.preventDefault();
        break;
      case "r":
        toggleRunning();
        e.preventDefault();
        break;
    }
  };

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateViewportSize);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    updateViewportSize();
  });

  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("resize", updateViewportSize);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    clearInterval(gameInterval);
  });

  const toggleCell = (worldX: number, worldY: number, e?: MouseEvent) => {
    if (isDragging()) return; // Don't toggle if we're dragging

    if (placementMode() === "single") {
      const key = cellKey(worldX, worldY);
      const newWorld = new Set(world());
      if (newWorld.has(key)) {
        newWorld.delete(key);
      } else {
        newWorld.add(key);
      }
      setWorld(newWorld);
    } else {
      // Pattern placement mode
      const pattern = selectedPattern();
      const newWorld = placePattern(world(), pattern, worldX, worldY);
      setWorld(newWorld);
    }
  };

  const handleMouseDown = (e: MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      viewportX: viewport().x,
      viewportY: viewport().y,
    });
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging()) return;

    const dx = e.clientX - dragStart().x;
    const dy = e.clientY - dragStart().y;

    // Convert pixel movement to cell movement
    const cellDx = -Math.floor(dx / 16); // 16px per cell, negative for natural drag direction
    const cellDy = -Math.floor(dy / 16);

    setViewport((prev) => ({
      ...prev,
      x: dragStart().viewportX + cellDx,
      y: dragStart().viewportY + cellDy,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div class="bg-gray-900 text-white h-screen overflow-hidden">
      <div class="p-4">
        <h1 class="text-2xl font-bold mb-2">Game of Life</h1>
        <div class="text-sm text-gray-300">
          Population: {world().size} | Generation: {generation()} | Viewport: (
          {viewport().x}, {viewport().y}) {viewport().width}x{viewport().height}{" "}
          | Zoom: {viewport().zoom}x |{running() ? "RUNNING" : "PAUSED"}
        </div>

        <div class="flex gap-4 items-center mt-2 mb-2">
          <div class="flex items-center gap-2">
            <label class="text-sm text-gray-300">Mode:</label>
            <select
              class="bg-gray-700 text-white px-2 py-1 rounded text-sm"
              value={placementMode()}
              onChange={(e) =>
                setPlacementMode(e.currentTarget.value as PlacementMode)
              }
            >
              <option value="single">Single Cell</option>
              <option value="pattern">Pattern</option>
            </select>
          </div>

          {placementMode() === "pattern" && (
            <div class="flex items-center gap-2">
              <label class="text-sm text-gray-300">Pattern:</label>
              <select
                class="bg-gray-700 text-white px-2 py-1 rounded text-sm"
                value={selectedPattern().name}
                onChange={(e) => {
                  const pattern = patterns.find(
                    (p) => p.name === e.currentTarget.value,
                  );
                  if (pattern) setSelectedPattern(pattern);
                }}
              >
                <For each={patterns.slice(1)}>
                  {(pattern) => (
                    <option value={pattern.name}>{pattern.name}</option>
                  )}
                </For>
              </select>
              <span class="text-xs text-gray-400">
                {selectedPattern().description}
              </span>
            </div>
          )}
        </div>

        <div class="text-xs text-gray-400">
          {placementMode() === "single"
            ? "Click cells to toggle | Drag to pan | WASD = pan | SPACE = step | R = run/pause"
            : `Click to place ${selectedPattern().name} | Drag to pan | WASD = pan | SPACE = step | R = run/pause`}
        </div>
      </div>

      <div class="px-4">
        <div
          class={`inline-grid border border-gray-600 bg-gray-800 gap-px ${
            isDragging() ? "cursor-grabbing" : ""
          }`}
          style={{
            "grid-template-columns": `repeat(${viewport().width}, 16px)`,
          }}
          onMouseDown={handleMouseDown}
        >
          <For each={cells()}>
            {(cell) => (
              <div
                class={`w-4 h-4 cursor-pointer transition-colors duration-100 ${
                  world().has(cell.key)
                    ? "bg-green-400 hover:bg-green-300"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
                onClick={(e) => toggleCell(cell.x, cell.y, e)}
                onMouseDown={handleMouseDown}
                title={`(${cell.x}, ${cell.y})`}
              />
            )}
          </For>
        </div>
      </div>
    </div>
  );
};
