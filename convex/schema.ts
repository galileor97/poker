import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  games: defineTable({
    status: v.union(v.literal("waiting"), v.literal("playing"), v.literal("finished")),
    currentPlayer: v.optional(v.id("users")),
    lastPlay: v.optional(v.object({
      playerId: v.id("users"),
      cards: v.array(v.object({
        suit: v.union(v.literal("hearts"), v.literal("diamonds"), v.literal("clubs"), v.literal("spades")),
        rank: v.union(
          v.literal("3"), v.literal("4"), v.literal("5"), v.literal("6"), v.literal("7"), 
          v.literal("8"), v.literal("9"), v.literal("10"), v.literal("J"), v.literal("Q"), 
          v.literal("K"), v.literal("A"), v.literal("2")
        )
      })),
      playType: v.union(v.literal("single"), v.literal("pair"), v.literal("triple"), v.literal("straight"), v.literal("flush"), v.literal("fullHouse"), v.literal("fourOfAKind"), v.literal("straightFlush"))
    })),
    consecutivePasses: v.number(),
    winner: v.optional(v.id("users")),
    createdAt: v.number(),
  }).index("by_status", ["status"]),

  players: defineTable({
    gameId: v.id("games"),
    userId: v.id("users"),
    hand: v.array(v.object({
      suit: v.union(v.literal("hearts"), v.literal("diamonds"), v.literal("clubs"), v.literal("spades")),
      rank: v.union(
        v.literal("3"), v.literal("4"), v.literal("5"), v.literal("6"), v.literal("7"), 
        v.literal("8"), v.literal("9"), v.literal("10"), v.literal("J"), v.literal("Q"), 
        v.literal("K"), v.literal("A"), v.literal("2")
      )
    })),
    position: v.number(),
    hasPlayed: v.boolean(),
    finished: v.boolean(),
    finishPosition: v.optional(v.number()),
  }).index("by_game", ["gameId"]).index("by_user_game", ["userId", "gameId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
