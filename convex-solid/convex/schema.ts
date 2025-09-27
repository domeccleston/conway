import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
