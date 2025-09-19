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

// Custom rule: Starting player selection
// - Player with the most '3' rank cards starts
// - If there is a tie, the player who holds 3 of hearts starts
// - If still tied (no one among ties has 3♥), fallback to the lowest table position
function findStartingPlayerByThrees(players: Array<{ userId: string; hand: Card[]; position: number }>): string | null {
  if (players.length === 0) return null;

  // Count number of rank '3' in each player's hand
  const counts = players.map((p) => ({
    userId: p.userId,
    position: p.position,
    count: p.hand.reduce((acc, c) => acc + (c.rank === "3" ? 1 : 0), 0),
    hasThreeHearts: p.hand.some((c) => c.rank === "3" && c.suit === "hearts"),
  }));

  const maxCount = Math.max(...counts.map((c) => c.count));
  const tied = counts.filter((c) => c.count === maxCount);

  if (tied.length === 0) return null;

  // Prefer the player who has 3♥ among those tied
  const withThreeHearts = tied.find((c) => c.hasThreeHearts);
  if (withThreeHearts) return withThreeHearts.userId as any;

  // Fallback: lowest position among ties
  const byPos = [...tied].sort((a, b) => a.position - b.position);
  return byPos[0].userId as any;
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

  // Four of a kind (bomb) can be represented as 4 cards (pure quad) or 5 cards (quad + kicker)
  if (cards.length === 4) {
    const rankCounts = cards.reduce<Record<string, number>>((acc, card) => {
      acc[card.rank] = (acc[card.rank] || 0) + 1;
      return acc;
    }, {});

    const rankKeys = Object.keys(rankCounts);
    if (rankKeys.length === 1) {
      // All four the same rank
      const quadRank = rankKeys[0];
      return {
        playType: "fourOfAKind",
        value: getRankValue(quadRank) * 100,
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

  // Special bomb rule: A four-of-a-kind (4 or 5 cards) can beat any single '2' (any suit)
  const isLastSingleTwo =
    lastPlay.cards.length === 1 && lastPlay.cards[0].rank === "2";


  if (isLastSingleTwo && newPlay.playType === "fourOfAKind") {
    return true;
  }

  // Otherwise, require same play type and same length
  if (
    newPlay.playType !== lastPlayAnalysis.playType ||
    newCards.length !== lastPlay.cards.length
  ) {
    return false;
  }

  // Compare values within same type and same length
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

    const userDoc: any = await ctx.db.get(userId);
    await ctx.db.insert("players", {
      gameId,
      userId,
      username: userDoc?.username || userDoc?.name,
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

    const userDoc: any = await ctx.db.get(userId);
    await ctx.db.insert("players", {
      gameId: args.gameId,
      userId,
      username: userDoc?.username || userDoc?.name,
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

    // Determine starting player per custom rule: most 3s; tie -> 3♥; else lowest position
    const updatedPlayers = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    const startingPlayerId = findStartingPlayerByThrees(
      updatedPlayers as any
    );

    // Begin with a seeding phase where players can only play 3s to decide the starter
    // The earliest currentPlayer will be position 0 to kick off seeding turns
    await ctx.db.patch(args.gameId, {
      status: "playing",
      seeding: true,
      currentPlayer: updatedPlayers.find((p) => p.position === 0)?.userId as any,
      lastPlay: undefined,
      consecutivePasses: 0,
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

    // If in seeding phase: only allow playing 3s; accumulate counts and advance turn
    if ((game as any).seeding) {
      const allThrees = args.cards.length > 0 && args.cards.every((c) => c.rank === "3");
      if (!allThrees) {
        throw new Error("Seeding phase: you can only play 3s");
      }

      const threesCount = args.cards.length;
      const hasThreeSpades = args.cards.some((c) => c.rank === "3" && c.suit === "spades");

      await ctx.db.patch(player._id, {
        seededThrees: (player as any).seededThrees ? (player as any).seededThrees + threesCount : threesCount,
        hadThreeSpades: (player as any).hadThreeSpades || hasThreeSpades,
      });

      // Remove played cards from hand
      const newHandSeeding = player.hand.filter(
        (handCard) => !args.cards.some((playedCard) => handCard.suit === playedCard.suit && handCard.rank === playedCard.rank)
      );
      await ctx.db.patch(player._id, { hand: newHandSeeding, hasPlayed: true });

      // Find next player in position order that hasn't finished
      const playersAll = await ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .collect();

      const totalPlayers = playersAll.length;
      let nextPlayerIndex = (player.position + 1) % totalPlayers;
      let nextPlayer = playersAll.find((p) => p.position === nextPlayerIndex);
      while (nextPlayer && nextPlayer.finished) {
        nextPlayerIndex = (nextPlayerIndex + 1) % totalPlayers;
        nextPlayer = playersAll.find((p) => p.position === nextPlayerIndex);
      }

      // Determine if seeding is done: if all players have taken at least one seeding turn
      // We'll consider seeding done when every player has either played some 3 or has no 3s in hand
      const everyoneSeeded = playersAll.every((p) => {
        const seeded = (p as any).seededThrees && (p as any).seededThrees > 0;
        const hasThree = p.hand.some((c: any) => c.rank === "3");
        return seeded || !hasThree;
      });

      if (everyoneSeeded) {
        // Decide starting player: most threes; tie-breaker: had 3♠; else lowest position
        const enriched = playersAll.map((p) => ({
          userId: p.userId,
          position: p.position,
          threes: (p as any).seededThrees || 0,
          hadSpadeThree: !!(p as any).hadThreeSpades,
        }));

        const maxThrees = Math.max(...enriched.map((e) => e.threes));
        let candidates = enriched.filter((e) => e.threes === maxThrees);
        let starter = candidates.find((c) => c.hadSpadeThree);
        if (!starter) {
          starter = candidates.sort((a, b) => a.position - b.position)[0];
        }

        await ctx.db.patch(args.gameId, {
          seeding: false,
          lastPlay: undefined,
          currentPlayer: starter?.userId as any,
          consecutivePasses: 0,
        });
        return args.gameId;
      } else {
        await ctx.db.patch(args.gameId, {
          lastPlay: undefined,
          currentPlayer: nextPlayer?.userId,
          consecutivePasses: 0,
        });
        return args.gameId;
      }
    }

    // Validate play against last play (normal phase)
    if (!canBeatPlay(args.cards, game.lastPlay)) {
      throw new Error("This play doesn't beat the last play");
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

    // Check for bomb scenario: a four-of-a-kind beating a single '2' (any suit)
    const isBombScenario =
      !!game.lastPlay &&
      game.lastPlay.cards.length === 1 &&
      game.lastPlay.cards[0].rank === "2" &&
      playAnalysis.playType === "fourOfAKind";

    if (isBombScenario) {
      // End the game immediately, bomber wins, bombed player loses
      const players = await ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .collect();

      const bombedUserId = game.lastPlay!.playerId as any;
      const bomberUserId = userId as any;

      // Assign finish positions: bomber #1, bombed #N, everyone else 2..N-1 by table position
      const sortedByPos = [...players].sort((a, b) => a.position - b.position);
      let nextPos = 2;
      for (const p of sortedByPos) {
        if (p.userId === bomberUserId) {
          await ctx.db.patch(p._id, { finished: true, finishPosition: 1 });
        } else if (p.userId === bombedUserId) {
          await ctx.db.patch(p._id, {
            finished: true,
            finishPosition: sortedByPos.length,
          });
        } else {
          await ctx.db.patch(p._id, {
            finished: true,
            finishPosition: nextPos,
          });
          nextPos += 1;
        }
      }

      await ctx.db.patch(args.gameId, {
        status: "finished",
        winner: bomberUserId,
      });

      return args.gameId;
    }

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

    // Seeding phase pass: not allowed (everyone must attempt to play their 3s)
    if ((game as any).seeding) {
      throw new Error("Seeding phase: you must play 3s if you have them");
    }

    // Can't pass if no previous play (first player must play in normal phase)
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
        const username =
          player.username ||
          user?.username ||
          user?.name ||
          (typeof player.position === "number"
            ? `Player ${player.position + 1}`
            : `User ${String(player.userId).slice(-4)}`);

        return {
          ...player,
          username,
          user: user
            ? {
                username: user.username || user.name || username,
                name: user.name,
              }
            : { username },
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

        // Fetch user names/display names for lobby display
        const playersWithUsernames = await Promise.all(
          players.map(async (p) => {
            const user: any = await ctx.db.get(p.userId);
            const username =
              p.username ||
              user?.username ||
              user?.name ||
              (typeof p.position === "number"
                ? `Player ${p.position + 1}`
                : `User ${String(p.userId).slice(-4)}`);
            return { userId: p.userId, position: p.position, username };
          })
        );

        return {
          ...game,
          playerCount: players.length,
          playerUsernames: playersWithUsernames
            .sort((a, b) => a.position - b.position)
            .map((p) => p.username),
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
