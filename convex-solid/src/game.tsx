import type { Component } from "solid-js";
import {
  createSignal,
  For,
  onMount,
  onCleanup,
  createEffect,
  createMemo,
} from "solid-js";

// Types from our terminal version
type Cell = [number, number];
type World = Set<number>;

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
const cellKey = (x: number, y: number): number => (x << 16) | (y & 0xffff);

// Unpack function for debugging (optional)
const unpackKey = (key: number): [number, number] => [key >> 16, key & 0xffff];

function createWorld(cells: Cell[]): World {
  const world = new Set<number>();
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

function neighborCounts(world: World): Map<number, number> {
  const counts = new Map<number, number>();

  for (const packedCell of world) {
    const [x, y] = unpackKey(packedCell);
    for (const [nx, ny] of neighbors([x, y])) {
      const key = cellKey(nx, ny);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  return counts;
}

function nextGeneration(world: World): World {
  const counts = neighborCounts(world);
  const next = new Set<number>();

  for (const [key, count] of counts) {
    if (count === 3 || (count === 2 && world.has(key))) {
      next.add(key);
    }
  }

  return next;
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

// Test patterns - positioned to center on screen
const createCenteredPatterns = (
  viewportWidth: number,
  viewportHeight: number,
) => {
  const centerX = Math.floor(viewportWidth / 2);
  const centerY = Math.floor(viewportHeight / 2);

  const glider = createWorld([
    [centerX + 1, centerY + 0],
    [centerX + 2, centerY + 1],
    [centerX + 0, centerY + 2],
    [centerX + 1, centerY + 2],
    [centerX + 2, centerY + 2],
  ]);

  const blinker = createWorld([
    [centerX + 5, centerY + 5],
    [centerX + 6, centerY + 5],
    [centerX + 7, centerY + 5],
  ]);

  return new Set([...glider, ...blinker]);
};

export const Game: Component = () => {
  const [viewport, setViewport] = createSignal<Viewport>({
    x: 0,
    y: 0,
    width: 80,
    height: 40,
    zoom: 1.0,
  });

  const [world, setWorld] = createSignal<World>(new Set<number>());

  const createStableGridPositions = (width: number, height: number) => {
    const positions = [];
    for (let screenY = 0; screenY < height; screenY++) {
      for (let screenX = 0; screenX < width; screenX++) {
        positions.push({
          screenX,
          screenY,
          id: screenY * width + screenX, // Stable ID that won't change
        });
      }
    }
    return positions;
  };

  const gridPositions = createMemo(() =>
    createStableGridPositions(viewport().width, viewport().height),
  );

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
  const [speed, setSpeed] = createSignal(500); // milliseconds between generations
  const [fps, setFps] = createSignal(0);
  const [renderTime, setRenderTime] = createSignal(0);
  const [jsHeapUsed, setJsHeapUsed] = createSignal(0);

  const speedPresets = [
    { name: "Ultra Fast", value: 50 },
    { name: "Fast", value: 200 },
    { name: "Normal", value: 500 },
    { name: "Slow", value: 1000 },
    { name: "Very Slow", value: 2000 },
  ];

  // FPS and DOM tracking
  let frameCount = 0;
  let lastFpsUpdate = performance.now();
  let animationFrameId: number;

  // Object creation tracking
  let objectCreationCount = 0;
  let renderCallCount = 0;

  // Track JS heap memory
  const updateMemoryUsage = () => {
    if (performance.memory) {
      setJsHeapUsed(
        Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
      );
    }
  };

  const trackFPS = () => {
    frameCount++;
    const now = performance.now();

    if (now - lastFpsUpdate >= 1000) {
      setFps(frameCount);
      frameCount = 0;
      lastFpsUpdate = now;
      updateMemoryUsage();
    }

    animationFrameId = requestAnimationFrame(trackFPS);
  };

  // Performance logging
  const logPerformance = () => {
    console.log("🔍 Performance Analysis:", {
      jsHeapUsed: jsHeapUsed() + "MB",
      objectCreations: objectCreationCount,
      renderCalls: renderCallCount,
      worldSize: world().size,
      generation: generation(),
      viewportSize: `${viewport().width}x${viewport().height}`,
    });
  };

  let gameInterval: number;

  // Calculate viewport size based on window size
  const updateViewportSize = () => {
    const cellSize = 20; // px - larger cells
    const width = Math.floor(window.innerWidth / cellSize);
    const height = Math.floor(window.innerHeight / cellSize);

    setViewport((prev) => ({
      ...prev,
      width,
      height,
    }));
  };

  createEffect(() => {
    updateViewportSize();
  });

  // Initialize world after viewport is set
  createEffect(() => {
    if (world().size === 0) {
      setWorld(createCenteredPatterns(viewport().width, viewport().height));
    }
  });

  onMount(() => {
    trackFPS();
  });

  onCleanup(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });

  const panViewport = (dx: number, dy: number) => {
    console.log(
      `🔄 Scroll - viewport position changing from (${viewport().x}, ${viewport().y}) to (${viewport().x + dx}, ${viewport().y + dy})`,
    );

    setViewport((prev) => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }));
  };

  const tick = () => {
    const newWorld = nextGeneration(world());
    setWorld(newWorld);
    setGeneration((prev) => prev + 1);

    // Log performance every 10 generations
    if (generation() % 10 === 0) {
      logPerformance();
    }
  };

  const toggleRunning = () => {
    const isRunning = !running();
    setRunning(isRunning);

    if (isRunning) {
      gameInterval = setInterval(tick, speed());
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

  // 4. Add this variable near your other variables (before the component):
  let lastViewportUpdate = 0;

  // 5. Replace the handleMouseMove function with this:
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging()) return;

    // Throttle to ~60fps max
    const now = performance.now();

    if (now - lastViewportUpdate < 16) return;
    lastViewportUpdate = now;

    const dx = e.clientX - dragStart().x;
    const dy = e.clientY - dragStart().y;

    // Convert pixel movement to cell movement
    const cellDx = -Math.floor(dx / 20);
    const cellDy = -Math.floor(dy / 20);

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
    <div class="bg-white h-screen overflow-hidden relative antialiased">
      {/* Floating Control Panel */}
      <div class="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-lg p-4 shadow-lg w-[500px]">
        <h1 class="text-xl font-bold mb-2 text-gray-900">Game of Life</h1>
        <div class="text-xs text-gray-600 mb-2">
          Pop: {world().size} | Gen: {generation()} | ({viewport().x},{" "}
          {viewport().y}) | {running() ? "RUNNING" : "PAUSED"}
        </div>
        <div class="text-xs text-gray-500 mb-2">
          FPS: {fps()} | Render: {renderTime()}ms | Cells: {viewport().width}x
          {viewport().height} = {viewport().width * viewport().height}
        </div>
        <div class="text-xs text-blue-600 mb-2">
          Memory: {jsHeapUsed()}MB | Objects Created:{" "}
          {objectCreationCount.toLocaleString()} | Renders: {renderCallCount}
        </div>

        <div class="flex items-center gap-4 mb-2">
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-700">Mode:</label>
            <select
              class="bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded text-xs"
              value={placementMode()}
              onChange={(e) =>
                setPlacementMode(e.currentTarget.value as PlacementMode)
              }
            >
              <option value="single">Single Cell</option>
              <option value="pattern">Pattern</option>
            </select>
          </div>

          <div
            class="flex items-center gap-2"
            style={{
              visibility: placementMode() === "pattern" ? "visible" : "hidden",
            }}
          >
            <label class="text-xs text-gray-700">Pattern:</label>
            <select
              class="bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded text-xs w-24"
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
          </div>

          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-700">Speed:</label>
            <select
              class="bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded text-xs w-20"
              value={speed()}
              onChange={(e) => setSpeed(parseInt(e.currentTarget.value))}
            >
              <For each={speedPresets}>
                {(preset) => (
                  <option value={preset.value}>{preset.name}</option>
                )}
              </For>
            </select>
          </div>
        </div>

        <div class="text-xs text-gray-500">
          {placementMode() === "single"
            ? "Click: toggle | Drag: pan | WASD: pan | Space: step | R: run/pause"
            : `Click: place ${selectedPattern().name} | Drag: pan | WASD: pan | Space: step | R: run/pause`}
        </div>
      </div>

      {/* Full Screen Game Grid */}
      <div
        class={`w-full h-full inline-grid bg-white ${
          isDragging() ? "cursor-grabbing" : ""
        }`}
        style={{
          "grid-template-columns": `repeat(${viewport().width}, 20px)`,
        }}
        onMouseDown={handleMouseDown}
      >
        <For each={gridPositions()}>
          {(pos) => {
            // Calculate world coordinates on-the-fly (doesn't create objects)
            const worldX = viewport().x + pos.screenX;
            const worldY = viewport().y + pos.screenY;
            const cellIsAlive = world().has(cellKey(worldX, worldY));

            return (
              <div
                class={`w-5 h-5 cursor-pointer transition-colors duration-100 border-[0.5px] ${
                  cellIsAlive
                    ? "bg-black border-gray-400 hover:bg-gray-800"
                    : "bg-white border-gray-200 hover:bg-gray-100"
                }`}
                onClick={(e) => toggleCell(worldX, worldY, e)}
                onMouseDown={handleMouseDown}
                title={`(${worldX}, ${worldY})`}
              />
            );
          }}
        </For>
      </div>
    </div>
  );
};
