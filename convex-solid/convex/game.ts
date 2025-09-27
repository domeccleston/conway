import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new world
export const createWorld = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("worlds", {
      name: args.name,
      generation: 0,
      isRunning: false,
      speed: 500,
      lastUpdated: Date.now(),
    });
  },
});

// Get world info
export const getWorld = query({
  args: { worldId: v.id("worlds") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.worldId);
  },
});

// Get chunks visible in viewport
export const getVisibleChunks = query({
  args: {
    worldId: v.id("worlds"),
    minChunkX: v.number(),
    maxChunkX: v.number(),
    minChunkY: v.number(),
    maxChunkY: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chunks")
      .withIndex("by_world_chunk")
      .filter((q) =>
        q.and(
          q.eq(q.field("worldId"), args.worldId),
          q.gte(q.field("chunkX"), args.minChunkX),
          q.lte(q.field("chunkX"), args.maxChunkX),
          q.gte(q.field("chunkY"), args.minChunkY),
          q.lte(q.field("chunkY"), args.maxChunkY),
        ),
      )
      .collect();
  },
});

// Update a single chunk
export const updateChunk = mutation({
  args: {
    worldId: v.id("worlds"),
    chunkX: v.number(),
    chunkY: v.number(),
    cells: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    // Find existing chunk
    const existing = await ctx.db
      .query("chunks")
      .withIndex("by_world_chunk")
      .filter((q) =>
        q.and(
          q.eq(q.field("worldId"), args.worldId),
          q.eq(q.field("chunkX"), args.chunkX),
          q.eq(q.field("chunkY"), args.chunkY),
        ),
      )
      .first();

    if (args.cells.length === 0) {
      // Delete empty chunk
      if (existing) {
        await ctx.db.delete(existing._id);
      }
    } else if (existing) {
      // Update existing chunk
      await ctx.db.patch(existing._id, {
        cells: args.cells,
        lastModified: Date.now(),
      });
    } else {
      // Create new chunk
      await ctx.db.insert("chunks", {
        worldId: args.worldId,
        chunkX: args.chunkX,
        chunkY: args.chunkY,
        cells: args.cells,
        lastModified: Date.now(),
      });
    }
  },
});

// Batch update multiple chunks (for simulation steps)
export const updateChunks = mutation({
  args: {
    worldId: v.id("worlds"),
    chunks: v.array(
      v.object({
        chunkX: v.number(),
        chunkY: v.number(),
        cells: v.array(v.number()),
      }),
    ),
    newGeneration: v.number(),
  },
  handler: async (ctx, args) => {
    // Update world generation
    await ctx.db.patch(args.worldId, {
      generation: args.newGeneration,
      lastUpdated: Date.now(),
    });

    // Get all existing chunks for this world
    const existingChunks = await ctx.db
      .query("chunks")
      .withIndex("by_world")
      .filter((q) => q.eq(q.field("worldId"), args.worldId))
      .collect();

    // Create lookup for existing chunks
    const existingMap = new Map();
    for (const chunk of existingChunks) {
      existingMap.set(`${chunk.chunkX},${chunk.chunkY}`, chunk);
    }

    // Update/create chunks from new generation
    const updatedChunks = new Set();
    for (const chunkData of args.chunks) {
      const key = `${chunkData.chunkX},${chunkData.chunkY}`;
      updatedChunks.add(key);
      const existing = existingMap.get(key);

      if (chunkData.cells.length === 0) {
        // Delete empty chunk
        if (existing) {
          await ctx.db.delete(existing._id);
        }
      } else if (existing) {
        // Update existing chunk
        await ctx.db.patch(existing._id, {
          cells: chunkData.cells,
          lastModified: Date.now(),
        });
      } else {
        // Create new chunk
        await ctx.db.insert("chunks", {
          worldId: args.worldId,
          chunkX: chunkData.chunkX,
          chunkY: chunkData.chunkY,
          cells: chunkData.cells,
          lastModified: Date.now(),
        });
      }
    }

    // Delete chunks that no longer exist
    for (const [key, existing] of existingMap) {
      if (!updatedChunks.has(key)) {
        await ctx.db.delete(existing._id);
      }
    }
  },
});

// Update world state (running, speed, etc.)
export const updateWorldState = mutation({
  args: {
    worldId: v.id("worlds"),
    isRunning: v.optional(v.boolean()),
    speed: v.optional(v.number()),
    generation: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: {
      lastUpdated: number;
      isRunning?: boolean;
      speed?: number;
      generation?: number;
    } = { lastUpdated: Date.now() };

    if (args.isRunning !== undefined) updates.isRunning = args.isRunning;
    if (args.speed !== undefined) updates.speed = args.speed;
    if (args.generation !== undefined) updates.generation = args.generation;

    await ctx.db.patch(args.worldId, updates);
  },
});
