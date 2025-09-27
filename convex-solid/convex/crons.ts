import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "tick all counters",
  { seconds: 1 },
  internal.tick.tickAllCounters,
);

crons.interval(
  "tick game world",
  { seconds: 1 },
  internal.gameOfLife.tickGameWorld,
);

export default crons;
