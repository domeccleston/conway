import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Get game state (read-only)
export const getGameState = query({
  handler: async (ctx) => {
    return await ctx.db.query("gameState").first();
  },
});

// Initialize game state (separate mutation)
export const initializeGameState = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("gameState").first();
    if (existing) {
      return existing;
    }

    const id = await ctx.db.insert("gameState", {
      generation: 0,
      isRunning: false,
      lastTicked: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

// Get chunks in viewport
export const getChunks = query({
  args: {
    minChunkX: v.number(),
    maxChunkX: v.number(),
    minChunkY: v.number(),
    maxChunkY: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gameChunks")
      .withIndex("by_chunk")
      .filter((q) =>
        q.and(
          q.gte(q.field("chunkX"), args.minChunkX),
          q.lte(q.field("chunkX"), args.maxChunkX),
          q.gte(q.field("chunkY"), args.minChunkY),
          q.lte(q.field("chunkY"), args.maxChunkY),
        ),
      )
      .collect();
  },
});

// Place cells
export const placeCells = mutation({
  args: {
    chunkUpdates: v.array(
      v.object({
        chunkX: v.number(),
        chunkY: v.number(),
        cells: v.array(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    for (const chunkUpdate of args.chunkUpdates) {
      const existing = await ctx.db
        .query("gameChunks")
        .withIndex("by_chunk")
        .filter((q) =>
          q.and(
            q.eq(q.field("chunkX"), chunkUpdate.chunkX),
            q.eq(q.field("chunkY"), chunkUpdate.chunkY),
          ),
        )
        .first();

      if (chunkUpdate.cells.length === 0) {
        if (existing) {
          await ctx.db.delete(existing._id);
        }
      } else if (existing) {
        await ctx.db.patch(existing._id, {
          cells: chunkUpdate.cells,
          lastModified: Date.now(),
        });
      } else {
        await ctx.db.insert("gameChunks", {
          chunkX: chunkUpdate.chunkX,
          chunkY: chunkUpdate.chunkY,
          cells: chunkUpdate.cells,
          lastModified: Date.now(),
        });
      }
    }
  },
});

// Toggle simulation
export const toggleSimulation = mutation({
  handler: async (ctx) => {
    const gameState = await ctx.db.query("gameState").first();
    if (!gameState) throw new Error("Game state not found");

    await ctx.db.patch(gameState._id, {
      isRunning: !gameState.isRunning,
      lastTicked: Date.now(),
    });

    return !gameState.isRunning;
  },
});

// Clear all chunks
export const clearWorld = mutation({
  handler: async (ctx) => {
    const chunks = await ctx.db.query("gameChunks").collect();
    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }

    const gameState = await ctx.db.query("gameState").first();
    if (gameState) {
      await ctx.db.patch(gameState._id, {
        generation: 0,
        isRunning: false,
      });
    }
  },
});

// Server-side Game of Life step
export const stepSimulation = internalMutation({
  handler: async (ctx) => {
    // Get all chunks
    const chunks = await ctx.db.query("gameChunks").collect();

    // Convert to cell map
    const cellMap = new Map<string, boolean>();
    for (const chunk of chunks) {
      for (const packed of chunk.cells) {
        let localX = (packed >> 16) & 0xffff;
        let localY = packed & 0xffff;
        if (localX >= 0x8000) localX -= 0x10000;
        if (localY >= 0x8000) localY -= 0x10000;

        const worldX = chunk.chunkX * 64 + localX;
        const worldY = chunk.chunkY * 64 + localY;
        cellMap.set(`${worldX},${worldY}`, true);
      }
    }

    // Calculate neighbor counts
    const neighborCounts = new Map<string, number>();
    for (const cellKey of cellMap.keys()) {
      // cellKey is now properly typed as string
      const [x, y] = cellKey.split(",").map(Number);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const neighborKey = `${x + dx},${y + dy}`;
          neighborCounts.set(
            neighborKey,
            (neighborCounts.get(neighborKey) || 0) + 1,
          );
        }
      }
    }

    // Apply Game of Life rules
    const nextGenCells = new Set<string>();
    for (const [cellKey, count] of neighborCounts.entries()) {
      // Use .entries() for proper typing
      const wasAlive = cellMap.has(cellKey);
      if (count === 3 || (count === 2 && wasAlive)) {
        nextGenCells.add(cellKey);
      }
    }

    // Convert back to chunks
    const newChunks = new Map<
      string,
      { chunkX: number; chunkY: number; cells: number[] }
    >();
    for (const cellKey of nextGenCells) {
      const [x, y] = cellKey.split(",").map(Number);
      const chunkX = Math.floor(x / 64);
      const chunkY = Math.floor(y / 64);
      const localX = ((x % 64) + 64) % 64;
      const localY = ((y % 64) + 64) % 64;

      const chunkKeyStr = `${chunkX},${chunkY}`;
      if (!newChunks.has(chunkKeyStr)) {
        newChunks.set(chunkKeyStr, { chunkX, chunkY, cells: [] });
      }

      const packed = ((localX & 0xffff) << 16) | (localY & 0xffff);
      newChunks.get(chunkKeyStr)!.cells.push(packed);
    }

    // Delete all old chunks
    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }

    // Insert new chunks
    for (const chunkData of newChunks.values()) {
      await ctx.db.insert("gameChunks", {
        chunkX: chunkData.chunkX,
        chunkY: chunkData.chunkY,
        cells: chunkData.cells,
        lastModified: Date.now(),
      });
    }

    // Update generation
    const gameState = await ctx.db.query("gameState").first();
    if (gameState) {
      await ctx.db.patch(gameState._id, {
        generation: gameState.generation + 1,
        lastTicked: Date.now(),
      });
    }
  },
});

// Tick the game world
export const tickGameWorld = internalMutation({
  handler: async (ctx) => {
    const gameState = await ctx.db.query("gameState").first();
    if (gameState?.isRunning) {
      await ctx.runMutation(internal.gameOfLife.stepSimulation, {});
    }
  },
});
