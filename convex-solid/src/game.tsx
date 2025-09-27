import { createSignal, onMount, onCleanup, For } from "solid-js";

// Core data structures
type Cell = [number, number];
type World = Set<string>; // Using string keys for simplicity: "x,y"

// Simple helper functions
const cellKey = (x: number, y: number): string => `${x},${y}`;
const parseKey = (key: string): [number, number] => {
  const [x, y] = key.split(",").map(Number);
  return [x, y];
};

export const Game = () => {
  // Core state
  const [world, setWorld] = createSignal<World>(new Set());
  const [viewportX, setViewportX] = createSignal(0);
  const [viewportY, setViewportY] = createSignal(0);
  const [zoom, setZoom] = createSignal(1.0);
  const [generation, setGeneration] = createSignal(0);
  const [isRunning, setIsRunning] = createSignal(false);
  const [speed, setSpeed] = createSignal(500); // milliseconds between generations

  // Performance tracking
  const [fps, setFps] = createSignal(0);
  const [memoryMB, setMemoryMB] = createSignal(0);
  const [renderCount, setRenderCount] = createSignal(0);

  // Grid configuration
  const CELL_SIZE = 20; // base pixels
  const GRID_WIDTH = Math.floor(window.innerWidth / CELL_SIZE);
  const GRID_HEIGHT = Math.floor(window.innerHeight / CELL_SIZE);

  // Calculate current effective cell size based on zoom
  const effectiveCellSize = () => CELL_SIZE * zoom();

  // Calculate visible grid dimensions at current zoom
  const visibleGridWidth = () => Math.ceil(GRID_WIDTH / zoom());
  const visibleGridHeight = () => Math.ceil(GRID_HEIGHT / zoom());

  // Mouse interaction state
  const [isMouseDown, setIsMouseDown] = createSignal(false);
  const [lastToggledCell, setLastToggledCell] = createSignal<string>("");
  const [isDraggingViewport, setIsDraggingViewport] = createSignal(false);
  const [dragStart, setDragStart] = createSignal({
    x: 0,
    y: 0,
    viewportX: 0,
    viewportY: 0,
  });
  const [isShiftPressed, setIsShiftPressed] = createSignal(false);

  // Throttling for drag operations
  let lastDragUpdate = 0;
  const DRAG_THROTTLE_MS = 16; // ~60fps max

  // Game loop interval
  let gameInterval: number;

  // Performance monitoring
  let frameCount = 0;
  let lastFpsTime = performance.now();
  let rafId: number;

  const trackPerformance = () => {
    frameCount++;
    const now = performance.now();

    if (now - lastFpsTime >= 1000) {
      setFps(frameCount);
      frameCount = 0;
      lastFpsTime = now;

      // Memory tracking
      if (performance.memory) {
        setMemoryMB(
          Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        );
      }
    }

    rafId = requestAnimationFrame(trackPerformance);
  };

  // Game of Life logic (based on Norvig's implementation)
  const neighbors = (x: number, y: number): [number, number][] => {
    return [
      [x - 1, y - 1],
      [x, y - 1],
      [x + 1, y - 1],
      [x - 1, y],
      [x + 1, y],
      [x - 1, y + 1],
      [x, y + 1],
      [x + 1, y + 1],
    ];
  };

  const neighborCounts = (world: World): Map<string, number> => {
    const counts = new Map<string, number>();

    for (const cellKeyStr of world) {
      const [x, y] = parseKey(cellKeyStr);
      for (const [nx, ny] of neighbors(x, y)) {
        const neighborKey = cellKey(nx, ny);
        counts.set(neighborKey, (counts.get(neighborKey) || 0) + 1);
      }
    }

    return counts;
  };

  const nextGeneration = (world: World): World => {
    const counts = neighborCounts(world);
    const nextWorld = new Set<string>();

    for (const [cell, count] of counts) {
      if (count === 3 || (count === 2 && world.has(cell))) {
        nextWorld.add(cell);
      }
    }

    return nextWorld;
  };

  const stepSimulation = () => {
    setWorld((prevWorld) => nextGeneration(prevWorld));
    setGeneration((prev) => prev + 1);
  };

  const toggleRunning = () => {
    const willRun = !isRunning();
    setIsRunning(willRun);

    if (willRun) {
      gameInterval = setInterval(stepSimulation, speed());
    } else {
      clearInterval(gameInterval);
    }
  };

  // Update game speed when speed changes
  const updateGameSpeed = () => {
    if (isRunning()) {
      clearInterval(gameInterval);
      gameInterval = setInterval(stepSimulation, speed());
    }
  };
  // Calculate only alive cells visible in current viewport
  const aliveCellsInViewport = () => {
    const cells = [];
    const halfWidth = visibleGridWidth() / 2;
    const halfHeight = visibleGridHeight() / 2;

    // Calculate the actual viewport bounds at current zoom
    const leftBound = viewportX() - halfWidth;
    const rightBound = viewportX() + halfWidth;
    const topBound = viewportY() - halfHeight;
    const bottomBound = viewportY() + halfHeight;

    for (const cellKeyStr of world()) {
      const [worldX, worldY] = parseKey(cellKeyStr);

      // Only include cells visible in current zoomed viewport
      if (
        worldX >= leftBound &&
        worldX <= rightBound &&
        worldY >= topBound &&
        worldY <= bottomBound
      ) {
        // Convert to screen coordinates relative to viewport center
        const screenX = (worldX - viewportX()) * zoom() + GRID_WIDTH / 2;
        const screenY = (worldY - viewportY()) * zoom() + GRID_HEIGHT / 2;

        cells.push({ worldX, worldY, screenX, screenY });
      }
    }
    return cells;
  };

  // Cell toggle logic
  const toggleCell = (worldX: number, worldY: number) => {
    const key = cellKey(worldX, worldY);

    // Prevent toggling the same cell multiple times during mouse drag
    if (isMouseDown() && lastToggledCell() === key) {
      return;
    }

    setLastToggledCell(key);

    setWorld((prev) => {
      const newWorld = new Set(prev);
      const hadCell = newWorld.has(key);
      if (hadCell) {
        newWorld.delete(key);
      } else {
        newWorld.add(key);
      }
      return newWorld;
    });
  };

  // SVG click handler
  const handleSVGClick = (e: MouseEvent) => {
    if (isDraggingViewport()) return;

    const svg = e.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert screen coordinates to world coordinates with zoom
    // Convert to SVG coordinate space first
    const svgX = (x / rect.width) * (GRID_WIDTH * CELL_SIZE);
    const svgY = (y / rect.height) * (GRID_HEIGHT * CELL_SIZE);

    // Convert SVG coordinates to world coordinates
    // The grid pattern repeats every effectiveCellSize() pixels
    const cellX = Math.floor(svgX / effectiveCellSize());
    const cellY = Math.floor(svgY / effectiveCellSize());

    // Convert cell coordinates to world coordinates
    // Account for viewport center and zoom
    const centerCellX = (GRID_WIDTH * CELL_SIZE) / (2 * effectiveCellSize());
    const centerCellY = (GRID_HEIGHT * CELL_SIZE) / (2 * effectiveCellSize());

    const worldX = Math.round(viewportX() + cellX - centerCellX);
    const worldY = Math.round(viewportY() + cellY - centerCellY);

    if (e.shiftKey) {
      // Start viewport dragging
      setIsDraggingViewport(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        viewportX: viewportX(),
        viewportY: viewportY(),
      });
    } else {
      // Toggle cell
      setIsMouseDown(true);
      setLastToggledCell("");
      toggleCell(worldX, worldY);
    }
  };

  const handleSVGMouseMove = (e: MouseEvent) => {
    if (!isMouseDown() || isDraggingViewport()) return;

    // Throttle cell painting during drag too
    const now = performance.now();
    if (now - lastDragUpdate < DRAG_THROTTLE_MS) {
      return;
    }
    lastDragUpdate = now;

    const svg = e.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Use same coordinate conversion as click handler
    const svgX = (x / rect.width) * (GRID_WIDTH * CELL_SIZE);
    const svgY = (y / rect.height) * (GRID_HEIGHT * CELL_SIZE);

    const cellX = Math.floor(svgX / effectiveCellSize());
    const cellY = Math.floor(svgY / effectiveCellSize());

    const centerCellX = (GRID_WIDTH * CELL_SIZE) / (2 * effectiveCellSize());
    const centerCellY = (GRID_HEIGHT * CELL_SIZE) / (2 * effectiveCellSize());

    const worldX = Math.round(viewportX() + cellX - centerCellX);
    const worldY = Math.round(viewportY() + cellY - centerCellY);

    toggleCell(worldX, worldY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDraggingViewport()) {
      // Throttle viewport dragging to ~60fps max
      const now = performance.now();
      if (now - lastDragUpdate < DRAG_THROTTLE_MS) {
        return;
      }
      lastDragUpdate = now;

      const dx = e.clientX - dragStart().x;
      const dy = e.clientY - dragStart().y;

      // Convert pixel movement to world movement (adjusted for zoom)
      const worldDx = -dx / effectiveCellSize();
      const worldDy = -dy / effectiveCellSize();

      setViewportX(dragStart().viewportX + worldDx);
      setViewportY(dragStart().viewportY + worldDy);
    }
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    setIsDraggingViewport(false);
    setLastToggledCell("");
    // Reset throttle timer on mouse up
    lastDragUpdate = 0;
  };

  // Zoom functionality
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    const zoomFactor = 1.2;
    const newZoom =
      e.deltaY < 0
        ? Math.min(zoom() * zoomFactor, 10) // Max zoom 10x
        : Math.max(zoom() / zoomFactor, 0.1); // Min zoom 0.1x

    setZoom(newZoom);
  };
  // Keyboard controls for viewport panning and shift tracking
  const handleKeyDown = (e: KeyboardEvent) => {
    const MOVE_SPEED = 5 / zoom(); // Adjust movement speed based on zoom

    if (e.key === "Shift") {
      setIsShiftPressed(true);
    }

    switch (e.key.toLowerCase()) {
      case "w":
      case "arrowup":
        setViewportY((prev) => prev - MOVE_SPEED);
        e.preventDefault();
        break;
      case "s":
      case "arrowdown":
        setViewportY((prev) => prev + MOVE_SPEED);
        e.preventDefault();
        break;
      case "a":
      case "arrowleft":
        setViewportX((prev) => prev - MOVE_SPEED);
        e.preventDefault();
        break;
      case "d":
      case "arrowright":
        setViewportX((prev) => prev + MOVE_SPEED);
        e.preventDefault();
        break;
      case " ":
        stepSimulation();
        e.preventDefault();
        break;
      case "r":
        toggleRunning();
        e.preventDefault();
        break;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === "Shift") {
      setIsShiftPressed(false);
      // If we're currently dragging viewport and shift is released, stop dragging
      if (isDraggingViewport()) {
        setIsDraggingViewport(false);
      }
    }
  };

  // Component lifecycle
  onMount(() => {
    trackPerformance();
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("wheel", handleWheel, { passive: false });

    // Add some default shapes for testing dragging
    const initialCells = new Set([
      // Glider
      cellKey(10, 10),
      cellKey(11, 11),
      cellKey(12, 9),
      cellKey(12, 10),
      cellKey(12, 11),

      // Block
      cellKey(20, 20),
      cellKey(21, 20),
      cellKey(20, 21),
      cellKey(21, 21),

      // Blinker
      cellKey(30, 15),
      cellKey(31, 15),
      cellKey(32, 15),
    ]);
    setWorld(initialCells);
  });

  onCleanup(() => {
    if (rafId) cancelAnimationFrame(rafId);
    if (gameInterval) clearInterval(gameInterval);
    document.removeEventListener("mouseup", handleMouseUp);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("keyup", handleKeyUp);
    document.removeEventListener("wheel", handleWheel);
  });

  // Track render calls
  setRenderCount((prev) => prev + 1);

  return (
    <div class="h-screen w-screen overflow-hidden bg-gray-100 relative">
      {/* Performance HUD */}
      <div class="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg font-mono text-sm">
        <div class="text-lg font-bold mb-2">Game of Life - SVG Sparse</div>
        <div>
          FPS: <span class="font-bold text-green-600">{fps()}</span>
        </div>
        <div>
          Memory: <span class="font-bold text-blue-600">{memoryMB()}MB</span>
        </div>
        <div>
          Renders:{" "}
          <span class="font-bold text-purple-600">{renderCount()}</span>
        </div>
        <div>
          DOM Elements:{" "}
          <span class="font-bold text-red-600">
            {aliveCellsInViewport().length}
          </span>
        </div>
        <div>
          Total Cells:{" "}
          <span class="font-bold text-orange-600">{world().size}</span>
        </div>
        <div>
          Generation:{" "}
          <span class="font-bold text-cyan-600">{generation()}</span>
        </div>
        <div>
          Zoom:{" "}
          <span class="font-bold text-purple-600">{zoom().toFixed(1)}x</span>
        </div>
        <div>
          Status:{" "}
          <span
            class={`font-bold ${isRunning() ? "text-green-600" : "text-gray-600"}`}
          >
            {isRunning() ? "RUNNING" : "PAUSED"}
          </span>
        </div>
        <div>
          Viewport:{" "}
          <span class="font-bold">
            ({viewportX()}, {viewportY()})
          </span>
        </div>

        {/* Speed Control */}
        <div class="flex items-center gap-2 mt-2">
          <label class="text-xs text-gray-700">Speed:</label>
          <select
            class="bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded text-xs"
            value={speed()}
            onChange={(e) => {
              setSpeed(parseInt(e.currentTarget.value));
              updateGameSpeed();
            }}
          >
            <option value={50}>Ultra Fast (20fps)</option>
            <option value={100}>Very Fast (10fps)</option>
            <option value={200}>Fast (5fps)</option>
            <option value={500}>Normal (2fps)</option>
            <option value={1000}>Slow (1fps)</option>
            <option value={2000}>Very Slow (0.5fps)</option>
          </select>
        </div>
        <div class="text-xs mt-2 text-gray-600 border-t pt-2">
          <div>Click/drag: toggle cells</div>
          <div>
            <strong>Shift + drag: pan viewport</strong>
          </div>
          <div>WASD/arrows: pan viewport</div>
          <div>
            Grid: {GRID_WIDTH}x{GRID_HEIGHT} = {GRID_WIDTH * GRID_HEIGHT} cells
          </div>
        </div>
      </div>

      {/* SVG Game Grid */}
      <svg
        class={`w-full h-full ${isDraggingViewport() ? "cursor-grabbing" : isShiftPressed() ? "cursor-grab" : "cursor-pointer"}`}
        viewBox={`0 0 ${GRID_WIDTH * CELL_SIZE} ${GRID_HEIGHT * CELL_SIZE}`}
        onMouseDown={handleSVGClick}
        onMouseMove={handleSVGMouseMove}
        onWheel={handleWheel}
      >
        {/* Grid pattern definition - scales with zoom */}
        <defs>
          <pattern
            id="grid"
            width={effectiveCellSize()}
            height={effectiveCellSize()}
            patternUnits="userSpaceOnUse"
          >
            <rect
              width={effectiveCellSize()}
              height={effectiveCellSize()}
              fill="white"
              stroke="#e5e7eb"
              stroke-width={Math.max(0.5, zoom() * 0.5)}
            />
          </pattern>
        </defs>

        {/* Grid background */}
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Only render alive cells */}
        <For each={aliveCellsInViewport()}>
          {(cell) => (
            <rect
              x={cell.screenX * CELL_SIZE}
              y={cell.screenY * CELL_SIZE}
              width={effectiveCellSize()}
              height={effectiveCellSize()}
              fill="black"
              class="hover:fill-gray-800"
            />
          )}
        </For>
      </svg>
    </div>
  );
};
