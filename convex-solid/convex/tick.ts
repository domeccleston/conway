import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Create a new counter
export const createCounter = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("counters", {
      name: args.name,
      count: 0,
      isRunning: false,
      lastTicked: Date.now(),
    });
  },
});

// Get counter state
export const getCounter = query({
  args: { counterId: v.id("counters") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.counterId);
  },
});

// Start the counter
export const startCounter = mutation({
  args: { counterId: v.id("counters") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.counterId, {
      isRunning: true,
      lastTicked: Date.now(),
    });
  },
});

// Stop the counter
export const stopCounter = mutation({
  args: { counterId: v.id("counters") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.counterId, {
      isRunning: false,
    });
  },
});

// Reset the counter
export const resetCounter = mutation({
  args: { counterId: v.id("counters") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.counterId, {
      count: 0,
      isRunning: false,
    });
  },
});

// Internal function to tick all running counters
export const tickAllCounters = internalMutation({
  handler: async (ctx) => {
    const runningCounters = await ctx.db
      .query("counters")
      .filter((q) => q.eq(q.field("isRunning"), true))
      .collect();

    for (const counter of runningCounters) {
      await ctx.db.patch(counter._id, {
        count: counter.count + 1,
        lastTicked: Date.now(),
      });
    }
  },
});
