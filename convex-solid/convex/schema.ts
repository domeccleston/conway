import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Single shared game state
  gameState: defineTable({
    generation: v.number(),
    isRunning: v.boolean(),
    lastTicked: v.number(),
  }),

  // Chunks for the single shared world
  gameChunks: defineTable({
    chunkX: v.number(),
    chunkY: v.number(),
    cells: v.array(v.number()), // bit-packed coordinates
    lastModified: v.number(),
  }).index("by_chunk", ["chunkX", "chunkY"]),
  
  // Add this to your existing schema
  counters: defineTable({
    name: v.string(),
    count: v.number(),
    isRunning: v.boolean(),
    lastTicked: v.number(),
  }),

  worlds: defineTable({
    name: v.string(),
    generation: v.number(),
    isRunning: v.boolean(),
    speed: v.number(),
    lastUpdated: v.number(),
  }),

  chunks: defineTable({
    worldId: v.id("worlds"),
    chunkX: v.number(),
    chunkY: v.number(),
    cells: v.array(v.number()), // Array of bit-packed coordinates
    lastModified: v.number(),
  })
    .index("by_world_chunk", ["worldId", "chunkX", "chunkY"])
    .index("by_world", ["worldId"]),
});
