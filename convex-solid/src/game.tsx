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

  // Performance tracking
  const [fps, setFps] = createSignal(0);
  const [memoryMB, setMemoryMB] = createSignal(0);
  const [renderCount, setRenderCount] = createSignal(0);

  // Grid configuration
  const CELL_SIZE = 20; // pixels
  const GRID_WIDTH = Math.floor(window.innerWidth / CELL_SIZE);
  const GRID_HEIGHT = Math.floor(window.innerHeight / CELL_SIZE);

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

  // Calculate only alive cells visible in current viewport
  const aliveCellsInViewport = () => {
    const cells = [];
    for (const cellKeyStr of world()) {
      const [worldX, worldY] = parseKey(cellKeyStr);
      const screenX = worldX - viewportX();
      const screenY = worldY - viewportY();

      // Only include cells visible in current viewport
      if (
        screenX >= 0 &&
        screenX < GRID_WIDTH &&
        screenY >= 0 &&
        screenY < GRID_HEIGHT
      ) {
        cells.push({ worldX, worldY, screenX, screenY });
      }
    }
    return cells;
  };

  // Cell toggle logic
  const toggleCell = (worldX: number, worldY: number) => {
    const key = cellKey(worldX, worldY);

    console.log(`Clicking cell at (${worldX}, ${worldY}) - key: ${key}`);

    // Prevent toggling the same cell multiple times during mouse drag
    if (isMouseDown() && lastToggledCell() === key) {
      console.log("Skipping - same cell during drag");
      return;
    }

    setLastToggledCell(key);

    setWorld((prev) => {
      const newWorld = new Set(prev);
      const hadCell = newWorld.has(key);
      if (hadCell) {
        newWorld.delete(key);
        console.log(`Removed cell ${key}`);
      } else {
        newWorld.add(key);
        console.log(`Added cell ${key}`);
      }
      console.log(`World now has ${newWorld.size} cells`);
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

    // Convert screen coordinates to world coordinates
    const screenX = Math.floor(x / CELL_SIZE);
    const screenY = Math.floor(y / CELL_SIZE);
    const worldX = viewportX() + screenX;
    const worldY = viewportY() + screenY;

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

    const screenX = Math.floor(x / CELL_SIZE);
    const screenY = Math.floor(y / CELL_SIZE);
    const worldX = viewportX() + screenX;
    const worldY = viewportY() + screenY;

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

      // Convert pixel movement to cell movement (inverted for natural feel)
      const cellDx = -Math.floor(dx / CELL_SIZE);
      const cellDy = -Math.floor(dy / CELL_SIZE);

      setViewportX(dragStart().viewportX + cellDx);
      setViewportY(dragStart().viewportY + cellDy);
    }
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    setIsDraggingViewport(false);
    setLastToggledCell("");
    // Reset throttle timer on mouse up
    lastDragUpdate = 0;
  };

  // Keyboard controls for viewport panning and shift tracking
  const handleKeyDown = (e: KeyboardEvent) => {
    const MOVE_SPEED = 5;

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
    document.removeEventListener("mouseup", handleMouseUp);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("keyup", handleKeyUp);
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
          Viewport:{" "}
          <span class="font-bold">
            ({viewportX()}, {viewportY()})
          </span>
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
      >
        {/* Grid pattern definition */}
        <defs>
          <pattern
            id="grid"
            width={CELL_SIZE}
            height={CELL_SIZE}
            patternUnits="userSpaceOnUse"
          >
            <rect
              width={CELL_SIZE}
              height={CELL_SIZE}
              fill="white"
              stroke="#e5e7eb"
              stroke-width="1"
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
              width={CELL_SIZE}
              height={CELL_SIZE}
              fill="black"
              class="hover:fill-gray-800"
            />
          )}
        </For>
      </svg>
    </div>
  );
};
