import type { Component } from "solid-js";
import { createSignal, For, onMount, onCleanup } from "solid-js";

// Types from our terminal version
type Cell = [number, number];
type World = Set<string>;

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
    width: 20,
    height: 15,
    zoom: 1.0,
  });

  const cells = () => getViewportCells(viewport());

  const panViewport = (dx: number, dy: number) => {
    setViewport((prev) => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }));
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
    }
  };

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown);
  });

  const toggleCell = (worldX: number, worldY: number) => {
    const key = cellKey(worldX, worldY);
    const newWorld = new Set(world());
    if (newWorld.has(key)) {
      newWorld.delete(key);
    } else {
      newWorld.add(key);
    }
    setWorld(newWorld);
  };

  return (
    <div class="p-4 bg-gray-900 text-white min-h-screen">
      <div class="mb-4">
        <h1 class="text-2xl font-bold mb-2">Game of Life</h1>
        <div class="text-sm text-gray-300">
          Population: {world().size} | Viewport: ({viewport().x}, {viewport().y}
          ) | Zoom: {viewport().zoom}x
        </div>
        <div class="text-xs text-gray-400 mt-1">
          Click cells to toggle | Use WASD to pan
        </div>
      </div>

      <div
        class="inline-grid border border-gray-600 bg-gray-800 gap-px"
        style={{
          "grid-template-columns": `repeat(${viewport().width}, 24px)`,
        }}
      >
        <For each={cells()}>
          {(cell) => (
            <div
              class={`w-6 h-6 cursor-pointer transition-colors duration-100 ${
                world().has(cell.key)
                  ? "bg-green-400 hover:bg-green-300"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
              onClick={() => toggleCell(cell.x, cell.y)}
              title={`(${cell.x}, ${cell.y})`}
            />
          )}
        </For>
      </div>

      <div class="mt-4 text-xs text-gray-400">
        Green = alive | Gray = dead | Click to toggle
      </div>
    </div>
  );
};
