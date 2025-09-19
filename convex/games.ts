import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Card utilities
const SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;
const RANKS = [
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
  "2",
] as const;

type Card = {
  suit: (typeof SUITS)[number];
  rank: (typeof RANKS)[number];
};

type PlayType =
  | "single"
  | "pair"
  | "triple"
  | "straight"
  | "flush"
  | "fullHouse"
  | "fourOfAKind"
  | "straightFlush";

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getRankValue(rank: string): number {
  const rankValues: Record<string, number> = {
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
    "2": 15,
  };
  return rankValues[rank];
}

function getSuitValue(suit: string): number {
  const suitValues: Record<string, number> = {
    diamonds: 1,
    clubs: 2,
    hearts: 3,
    spades: 4,
  };
  return suitValues[suit];
}

function compareCards(a: Card, b: Card): number {
  const rankDiff = getRankValue(a.rank) - getRankValue(b.rank);
  if (rankDiff !== 0) return rankDiff;
  return getSuitValue(a.suit) - getSuitValue(b.suit);
}

function findPlayerWithThreeOfDiamonds(players: any[]): string | null {
  for (const player of players) {
    const hasThreeOfDiamonds = player.hand.some(
      (card: Card) => card.rank === "3" && card.suit === "diamonds"
    );
    if (hasThreeOfDiamonds) {
      return player.userId;
    }
  }
  return null;
}

function analyzePlay(cards: Card[]): { playType: PlayType; value: number } {
  if (cards.length === 0) {
    return { playType: "single", value: 0 };
  }

  cards.sort(compareCards);

  if (cards.length === 1) {
    return {
      playType: "single",
      value: getRankValue(cards[0].rank) * 10 + getSuitValue(cards[0].suit),
    };
  }

  if (cards.length === 2) {
    if (cards[0].rank === cards[1].rank) {
      return {
        playType: "pair",
        value:
          getRankValue(cards[0].rank) * 10 +
          Math.max(getSuitValue(cards[0].suit), getSuitValue(cards[1].suit)),
      };
    }
  }

  if (cards.length === 3) {
    if (cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank) {
      return {
        playType: "triple",
        value:
          getRankValue(cards[0].rank) * 10 +
          Math.max(
            getSuitValue(cards[0].suit),
            getSuitValue(cards[1].suit),
            getSuitValue(cards[2].suit)
          ),
      };
    }
  }

  if (cards.length >= 5) {
    const rankCounts = cards.reduce<Record<string, number>>((acc, card) => {
      acc[card.rank] = (acc[card.rank] || 0) + 1;
      return acc;
    }, {});

    const countValues = Object.values(rankCounts).sort((a, b) => b - a);

    if (cards.length === 5) {
      if (countValues[0] === 4) {
        const rankKeys = Object.keys(rankCounts);
        const quadRank = rankKeys.find((rank) => rankCounts[rank] === 4)!;
        const kickerRank = rankKeys.find((rank) => rankCounts[rank] === 1);

        return {
          playType: "fourOfAKind",
          value:
            getRankValue(quadRank) * 100 +
            (kickerRank ? getRankValue(kickerRank) : 0),
        };
      }

      if (countValues[0] === 3 && countValues[1] === 2) {
        const rankKeys = Object.keys(rankCounts);
        const tripleRank = rankKeys.find((rank) => rankCounts[rank] === 3)!;
        const pairRank = rankKeys.find((rank) => rankCounts[rank] === 2);

        return {
          playType: "fullHouse",
          value:
            getRankValue(tripleRank) * 100 +
            (pairRank ? getRankValue(pairRank) : 0),
        };
      }
    }

    // Check for straight
    const isConsecutive = cards.every(
      (card, index) =>
        index === 0 ||
        getRankValue(card.rank) === getRankValue(cards[index - 1].rank) + 1
    );

    // Check for flush
    const isFlush = cards.every((card) => card.suit === cards[0].suit);

    if (isConsecutive && isFlush) {
      return {
        playType: "straightFlush",
        value:
          getRankValue(cards[cards.length - 1].rank) * 100 +
          getSuitValue(cards[cards.length - 1].suit),
      };
    }

    if (isFlush) {
      return {
        playType: "flush",
        value:
          getRankValue(cards[cards.length - 1].rank) * 100 +
          getSuitValue(cards[cards.length - 1].suit),
      };
    }

    if (isConsecutive) {
      return {
        playType: "straight",
        value:
          getRankValue(cards[cards.length - 1].rank) * 100 +
          getSuitValue(cards[cards.length - 1].suit),
      };
    }
  }

  // Invalid play
  return { playType: "single", value: 0 };
}

function canBeatPlay(newCards: Card[], lastPlay: any): boolean {
  if (!lastPlay) return true;

  const newPlay = analyzePlay(newCards);
  const lastPlayAnalysis = analyzePlay(lastPlay.cards);

  // Must be same type and length for basic plays
  if (newPlay.playType !== lastPlayAnalysis.playType) {
    // Special case: higher combinations can beat lower ones
    const playTypeRanks = {
      single: 1,
      pair: 2,
      triple: 3,
      straight: 4,
      flush: 5,
      fullHouse: 6,
      fourOfAKind: 7,
      straightFlush: 8,
    };

    if (
      playTypeRanks[newPlay.playType] <=
      playTypeRanks[lastPlayAnalysis.playType]
    ) {
      return false;
    }
  }

  return newPlay.value > lastPlayAnalysis.value;
}

export const createGame = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const gameId = await ctx.db.insert("games", {
      status: "waiting",
      consecutivePasses: 0,
      createdAt: Date.now(),
    });

    await ctx.db.insert("players", {
      gameId,
      userId,
      hand: [],
      position: 0,
      hasPlayed: false,
      finished: false,
    });

    return gameId;
  },
});

export const joinGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "waiting") throw new Error("Game already started");

    const existingPlayer = await ctx.db
      .query("players")
      .withIndex("by_user_game", (q) =>
        q.eq("userId", userId).eq("gameId", args.gameId)
      )
      .first();

    if (existingPlayer) throw new Error("Already in this game");

    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    if (players.length >= 4) throw new Error("Game is full");

    await ctx.db.insert("players", {
      gameId: args.gameId,
      userId,
      hand: [],
      position: players.length,
      hasPlayed: false,
      finished: false,
    });

    return args.gameId;
  },
});

export const startGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "waiting") throw new Error("Game already started");

    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    if (players.length < 2) throw new Error("Need at least 2 players");

    // Deal cards
    const deck = shuffleDeck(createDeck());
    const cardsPerPlayer = Math.floor(52 / players.length);

    for (let i = 0; i < players.length; i++) {
      const hand = deck.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer);
      hand.sort(compareCards);

      await ctx.db.patch(players[i]._id, { hand });
    }

    // Find player with 3 of diamonds to start
    const updatedPlayers = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    const startingPlayerId = findPlayerWithThreeOfDiamonds(updatedPlayers);

    await ctx.db.patch(args.gameId, {
      status: "playing",
      currentPlayer: (startingPlayerId || updatedPlayers[0].userId) as any,
    });

    return args.gameId;
  },
});

export const playCards = mutation({
  args: {
    gameId: v.id("games"),
    cards: v.array(
      v.object({
        suit: v.union(
          v.literal("hearts"),
          v.literal("diamonds"),
          v.literal("clubs"),
          v.literal("spades")
        ),
        rank: v.union(
          v.literal("3"),
          v.literal("4"),
          v.literal("5"),
          v.literal("6"),
          v.literal("7"),
          v.literal("8"),
          v.literal("9"),
          v.literal("10"),
          v.literal("J"),
          v.literal("Q"),
          v.literal("K"),
          v.literal("A"),
          v.literal("2")
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "playing") throw new Error("Game not in progress");
    if (game.currentPlayer !== userId) throw new Error("Not your turn");

    const player = await ctx.db
      .query("players")
      .withIndex("by_user_game", (q) =>
        q.eq("userId", userId).eq("gameId", args.gameId)
      )
      .first();

    if (!player) throw new Error("Player not found");

    // Validate that player has these cards
    const hasAllCards = args.cards.every((playedCard) =>
      player.hand.some(
        (handCard) =>
          handCard.suit === playedCard.suit && handCard.rank === playedCard.rank
      )
    );

    if (!hasAllCards) throw new Error("You don't have these cards");

    // Validate play against last play
    if (!canBeatPlay(args.cards, game.lastPlay)) {
      throw new Error("This play doesn't beat the last play");
    }

    // Special rule: first play must include 3 of diamonds
    if (!game.lastPlay && !player.hasPlayed) {
      const hasThreeOfDiamonds = args.cards.some(
        (card) => card.rank === "3" && card.suit === "diamonds"
      );
      if (!hasThreeOfDiamonds) {
        throw new Error("First play must include 3 of diamonds");
      }
    }

    // Remove played cards from hand
    const newHand = player.hand.filter(
      (handCard) =>
        !args.cards.some(
          (playedCard) =>
            handCard.suit === playedCard.suit &&
            handCard.rank === playedCard.rank
        )
    );

    await ctx.db.patch(player._id, {
      hand: newHand,
      hasPlayed: true,
    });

    // Analyze the play
    const playAnalysis = analyzePlay(args.cards);

    // Update game state
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    // Find next active player (not finished)
    let nextPlayerIndex = (player.position + 1) % players.length;
    let nextPlayer = players.find((p) => p.position === nextPlayerIndex);

    while (nextPlayer && nextPlayer.finished && nextPlayer.userId !== userId) {
      nextPlayerIndex = (nextPlayerIndex + 1) % players.length;
      nextPlayer = players.find((p) => p.position === nextPlayerIndex);
    }

    await ctx.db.patch(args.gameId, {
      lastPlay: {
        playerId: userId,
        cards: args.cards,
        playType: playAnalysis.playType,
      },
      currentPlayer: nextPlayer?.userId,
      consecutivePasses: 0,
    });

    // Check if player finished
    if (newHand.length === 0) {
      const finishedPlayers = players.filter((p) => p.finished).length;
      await ctx.db.patch(player._id, {
        finished: true,
        finishPosition: finishedPlayers + 1,
      });

      // Check if game is over (only one player left)
      const activePlayers = players.filter(
        (p) => !p.finished && p.userId !== userId
      );
      if (activePlayers.length <= 1) {
        await ctx.db.patch(args.gameId, {
          status: "finished",
          winner: userId,
        });
      }
    }

    return args.gameId;
  },
});

export const passPlay = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "playing") throw new Error("Game not in progress");
    if (game.currentPlayer !== userId) throw new Error("Not your turn");

    // Can't pass if no previous play (first player must play)
    if (!game.lastPlay) {
      throw new Error("You must play cards (cannot pass on first turn)");
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    const currentPlayer = players.find((p) => p.userId === userId);
    if (!currentPlayer) throw new Error("Player not found");

    // Find next active player
    let nextPlayerIndex = (currentPlayer.position + 1) % players.length;
    let nextPlayer = players.find((p) => p.position === nextPlayerIndex);

    while (nextPlayer && nextPlayer.finished) {
      nextPlayerIndex = (nextPlayerIndex + 1) % players.length;
      nextPlayer = players.find((p) => p.position === nextPlayerIndex);
    }

    const newConsecutivePasses = game.consecutivePasses + 1;
    const activePlayers = players.filter((p) => !p.finished);

    // If all other active players pass, clear the last play
    if (newConsecutivePasses >= activePlayers.length - 1) {
      await ctx.db.patch(args.gameId, {
        lastPlay: undefined,
        consecutivePasses: 0,
        currentPlayer: nextPlayer?.userId,
      });
    } else {
      await ctx.db.patch(args.gameId, {
        consecutivePasses: newConsecutivePasses,
        currentPlayer: nextPlayer?.userId,
      });
    }

    return args.gameId;
  },
});

export const getGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const game = await ctx.db.get(args.gameId);
    if (!game) return null;

    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    // Ensure the current user is part of this game; otherwise treat as not found
    const isParticipant = players.some((p) => p.userId === userId);
    if (!isParticipant) return null;

    const playersWithUsers = await Promise.all(
      players.map(async (player) => {
        const user: any = await ctx.db.get(player.userId);
        const displayName =
          user?.name ||
          (typeof player.position === "number"
            ? `Player ${player.position + 1}`
            : `User ${String(player.userId).slice(-4)}`);
        return {
          ...player,
          user: user ? { name: user.name, displayName } : { displayName },
        };
      })
    );

    const currentPlayer = players.find((p) => p.userId === userId);

    return {
      ...game,
      players: playersWithUsers.sort((a, b) => a.position - b.position),
      myHand: currentPlayer?.hand || [],
      isMyTurn: game.currentPlayer === userId,
      myPosition: currentPlayer?.position || 0,
    };
  },
});

export const listGames = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const games = await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .order("desc")
      .take(10);

    return Promise.all(
      games.map(async (game) => {
        const players = await ctx.db
          .query("players")
          .withIndex("by_game", (q) => q.eq("gameId", game._id))
          .collect();

        return {
          ...game,
          playerCount: players.length,
        };
      })
    );
  },
});

export const leaveGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const player = await ctx.db
      .query("players")
      .withIndex("by_user_game", (q) =>
        q.eq("userId", userId).eq("gameId", args.gameId)
      )
      .first();

    if (!player) throw new Error("Not in this game");

    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");

    // If game hasn't started, just remove the player
    if (game.status === "waiting") {
      await ctx.db.delete(player._id);

      // Check if this was the last player
      const remainingPlayers = await ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .collect();

      if (remainingPlayers.length === 0) {
        await ctx.db.delete(args.gameId);
      }
    } else {
      // Mark player as finished if game is in progress
      await ctx.db.patch(player._id, {
        finished: true,
        finishPosition: 999, // Last place for leaving
      });
    }

    return null;
  },
});
