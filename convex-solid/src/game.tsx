import type { Component } from "solid-js";
import { createSignal, For, onMount, onCleanup, createEffect } from "solid-js";

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

    const key = cellKey(worldX, worldY);
    const newWorld = new Set(world());
    if (newWorld.has(key)) {
      newWorld.delete(key);
    } else {
      newWorld.add(key);
    }
    setWorld(newWorld);
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
        <div class="text-xs text-gray-400 mt-1">
          Click cells to toggle | Shift + drag to pan | WASD = pan | SPACE =
          step | R = run/pause
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
