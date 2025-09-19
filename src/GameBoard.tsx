import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { useState, useEffect, useRef } from "react";
import { PlayingCard } from "./PlayingCard";
import { toast } from "sonner";
import tableUrl from "@assets/table.svg";
import playBtnUrl from "@assets/play_button 2.svg";

interface GameBoardProps {
  gameId: Id<"games">;
  onLeave?: () => void;
}

type Card = {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank:
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9"
    | "10"
    | "J"
    | "Q"
    | "K"
    | "A"
    | "2";
};

export function GameBoard({ gameId, onLeave }: GameBoardProps) {
  const game = useQuery(api.games.getGame, { gameId });
  const startGame = useMutation(api.games.startGame);
  const playCards = useMutation(api.games.playCards);
  const passPlay = useMutation(api.games.passPlay);
  const leaveGame = useMutation(api.games.leaveGame);

  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
    };

    // Initialize on first user interaction
    const handleFirstInteraction = () => {
      initAudio();
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
    };

    document.addEventListener("click", handleFirstInteraction);
    document.addEventListener("keydown", handleFirstInteraction);

    return () => {
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
    };
  }, []);

  // Sound effects
  const playSound = (
    frequency: number,
    duration: number,
    type: OscillatorType = "sine"
  ) => {
    if (!audioContextRef.current) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    oscillator.frequency.setValueAtTime(
      frequency,
      audioContextRef.current.currentTime
    );
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContextRef.current.currentTime + duration
    );

    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + duration);
  };

  const playCardSelectSound = () => playSound(800, 0.1, "square");
  const playCardPlaySound = () => {
    playSound(600, 0.15, "sine");
    setTimeout(() => playSound(800, 0.1, "sine"), 100);
  };
  const playPassSound = () => playSound(300, 0.2, "triangle");
  const playWinSound = () => {
    playSound(523, 0.2, "sine"); // C
    setTimeout(() => playSound(659, 0.2, "sine"), 200); // E
    setTimeout(() => playSound(784, 0.3, "sine"), 400); // G
  };
  const playGameStartSound = () => {
    playSound(440, 0.15, "sine"); // A
    setTimeout(() => playSound(554, 0.15, "sine"), 150); // C#
    setTimeout(() => playSound(659, 0.2, "sine"), 300); // E
  };

  // Auto-clear selection when it's not our turn
  useEffect(() => {
    if (game && !game.isMyTurn) {
      setSelectedCards([]);
    }
  }, [game?.isMyTurn]);

  // If this user isn't a participant (game comes back null), return to lobby
  useEffect(() => {
    if (game === null && onLeave) {
      try {
        localStorage.removeItem("currentGameId");
      } catch {}
      onLeave();
    }
  }, [game]);

  // Play sounds for game events
  useEffect(() => {
    if (game?.status === "playing" && game.lastPlay) {
      playCardPlaySound();
    }
  }, [game?.lastPlay]);

  useEffect(() => {
    if (game?.status === "finished") {
      playWinSound();
    }
  }, [game?.status]);

  if (!game) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  const handleStartGame = async () => {
    try {
      await startGame({ gameId });
      playGameStartSound();
      toast.success("Game started!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start game"
      );
    }
  };

  const handleCardClick = (card: Card) => {
    if (!game.isMyTurn) return;

    const isSelected = selectedCards.some(
      (c) => c.suit === card.suit && c.rank === card.rank
    );

    playCardSelectSound();

    if (isSelected) {
      setSelectedCards(
        selectedCards.filter(
          (c) => !(c.suit === card.suit && c.rank === card.rank)
        )
      );
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  };

  const handlePlayCards = async () => {
    if (selectedCards.length === 0) return;

    try {
      await playCards({ gameId, cards: selectedCards });
      setSelectedCards([]);
      toast.success("Cards played!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to play cards"
      );
    }
  };

  const handlePass = async () => {
    try {
      await passPlay({ gameId });
      playPassSound();
      toast.success("Passed turn");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to pass");
    }
  };

  const handleLeaveGame = async () => {
    try {
      await leaveGame({ gameId });
      toast.success("Left game");
      if (onLeave) onLeave();
      try {
        localStorage.removeItem("currentGameId");
      } catch {}
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to leave game"
      );
    }
  };

  const isCardSelected = (card: Card) => {
    return selectedCards.some(
      (c) => c.suit === card.suit && c.rank === card.rank
    );
  };

  const getPlayTypeDisplay = (playType: string) => {
    const types: Record<string, string> = {
      single: "Single",
      pair: "Pair",
      triple: "Triple",
      straight: "Straight",
      flush: "Flush",
      fullHouse: "Full House",
      fourOfAKind: "Four of a Kind",
      straightFlush: "Straight Flush",
    };
    return types[playType] || playType;
  };

  const getPlayerDisplayName = (player: any) => {
    if (!player) return "Unknown";
    return (
      player.user?.displayName ||
      player.user?.name ||
      (typeof player.position === "number"
        ? `Player ${player.position + 1}`
        : "Unknown")
    );
  };

  // Get player positions for round table
  const getPlayerPosition = (
    playerIndex: number,
    totalPlayers: number,
    isCurrentPlayer: boolean = false
  ) => {
    const angle = (playerIndex * 360) / totalPlayers;
    const radius = isCurrentPlayer ? 280 : 320;
    const x = Math.cos(((angle - 90) * Math.PI) / 180) * radius;
    const y = Math.sin(((angle - 90) * Math.PI) / 180) * radius;

    return {
      transform: `translate(${x}px, ${y}px)`,
      position: "absolute" as const,
      left: "50%",
      top: "50%",
      marginLeft: "-100px",
      marginTop: "20px",
    };
  };

  if (game.status === "waiting") {
    return (
      <div className="text-white text-center">
        <div className=" rounded-lg p-8 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Waiting for Players</h2>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-4">
              Players ({game.players.length}/4)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {game.players.map((player, index) => (
                <div key={player._id} className=" rounded-lg p-4">
                  <p className="font-medium">{getPlayerDisplayName(player)}</p>
                  <p className="text-sm text-green-100">
                    Position {player.position + 1}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            {game.players.length >= 2 && (
              <button
                onClick={handleStartGame}
                className="flex items-center justify-center"
                aria-label="Start Game"
              >
                <img
                  src={playBtnUrl}
                  alt="Start Game"
                  className="h-16 md:h-20 select-none"
                />
              </button>
            )}

            <button
              onClick={handleLeaveGame}
              className="px-6 py-3 rounded bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
            >
              Leave Game
            </button>
          </div>

          {game.players.length < 2 && (
            <p className="text-green-100 mt-4">
              Need at least 2 players to start
            </p>
          )}
        </div>
      </div>
    );
  }

  if (game.status === "finished") {
    const winner = game.players.find((p) => p.userId === game.winner);
    const sortedPlayers = game.players
      .filter((p) => p.finished)
      .sort((a, b) => (a.finishPosition || 999) - (b.finishPosition || 999));

    return (
      <div className="text-white text-center">
        <div className=" rounded-lg p-8 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">🎉 Game Over! 🎉</h2>
          <p className="text-xl mb-6">
            Winner: {winner ? getPlayerDisplayName(winner) : "Unknown"}
          </p>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-4">Final Rankings</h3>
            <div className="space-y-2">
              {sortedPlayers.map((player) => (
                <div key={player._id} className=" rounded-lg p-3">
                  <p className="flex justify-between items-center">
                    <span>
                      #{player.finishPosition} - {getPlayerDisplayName(player)}
                    </span>
                    {player.finishPosition === 1 && (
                      <span className="text-yellow-400">👑</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleLeaveGame}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  const currentPlayerInfo = game.players.find(
    (p) => p.userId === game.currentPlayer
  );
  const myPlayer = game.players.find(
    (p) => p.hand.length === game.myHand.length
  );

  const otherPlayers = game.players.filter(
    (p) => p.hand.length !== game.myHand.length
  );

  return (
    <div className="text-white min-h-screen relative">
      {/* Game Header */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className=" rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">
                Big Two - Game in Progress
              </h2>
              <p className="text-green-100">
                Current Turn: {getPlayerDisplayName(currentPlayerInfo)}
                {game.isMyTurn && (
                  <span className="text-yellow-300 font-bold">
                    {" "}
                    (Your turn!)
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-green-100">
                Round:{" "}
                {game.consecutivePasses === 0
                  ? "Active"
                  : `${game.consecutivePasses} passes`}
              </p>
              <p className="text-sm text-green-100">
                Your cards: {game.myHand.length}
              </p>
              <button
                onClick={handleLeaveGame}
                className="mt-2 bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Round Table Layout */}
      <div className="flex items-center justify-center min-h-screen pt-24 pb-8 overflow-hidden">
        <div className="relative w-[1100px] h-[800px] -mt-32">
          {/* Table Image */}
          <img
            src={tableUrl}
            alt="Table"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />

          {/* Selected Cards - Top Center Overlay */}
          {selectedCards.length > 0 && (
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-white/10 rounded-lg p-3 z-20 text-center">
              <p className="text-sm text-blue-200 mb-2">
                Selected cards ({selectedCards.length}):
              </p>
              <div className="flex gap-2 flex-wrap justify-center">
                {selectedCards.map((card, index) => (
                  <PlayingCard key={index} card={card} size="large" />
                ))}
              </div>
            </div>
          )}

          {/* Center Area - Last Play */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 min-w-[18rem] h-40">
            {game.lastPlay ? (
              <div className=" rounded-lg p-4 text-center">
                <h3 className="text-sm font-semibold mb-2">
                  {getPlayTypeDisplay(game.lastPlay.playType)}
                </h3>
                <div className="flex gap-1 justify-center flex-nowrap">
                  {game.lastPlay.cards.map((card, index) => (
                    <PlayingCard key={index} card={card} size="large" />
                  ))}
                </div>
                <p className="text-xs text-green-100 mt-2">
                  {getPlayerDisplayName(
                    game.players.find(
                      (p) => p.userId === game.lastPlay?.playerId
                    )
                  )}
                </p>
              </div>
            ) : (
              <div className=" rounded-lg p-4 text-center">
                <p className="text-green-100">Waiting for first play...</p>
              </div>
            )}
          </div>

          {/* Other Players around the table */}
          {otherPlayers.map((player, index) => (
            <div
              key={player._id}
              style={getPlayerPosition(index, Math.max(otherPlayers.length, 2))}
              className="w-48 h-20"
            >
              <div className=" rounded-lg p-3 text-center">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm truncate flex-1 text-black">
                    {getPlayerDisplayName(player)}
                  </h4>
                  {player.userId === game.currentPlayer && (
                    <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded ml-2">
                      Turn
                    </span>
                  )}
                  {player.finished && (
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded ml-2">
                      #{player.finishPosition}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-green-100">
                    Cards: {player.hand.length}
                  </p>
                  <div className="flex gap-0.5 ml-2">
                    {Array.from({
                      length: Math.min(player.hand.length, 8),
                    }).map((_, i) => (
                      <div
                        key={i}
                        className="w-3 h-4 bg-blue-900 rounded-sm border border-blue-700"
                      />
                    ))}
                    {player.hand.length > 8 && (
                      <span className="text-xs text-green-100 ml-1">
                        +{player.hand.length - 8}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* My Hand - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-6">
        <div className="max-w-6xl mx-auto">
          <div className=" rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              Your Hand
              {myPlayer?.finished && (
                <span className="bg-green-500 text-white text-sm px-3 py-1 rounded">
                  Finished #{myPlayer.finishPosition}
                </span>
              )}
            </h3>

            {game.myHand.length > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 justify-center">
                  {game.myHand.map((card, index) => (
                    <PlayingCard
                      key={index}
                      card={card}
                      isSelected={isCardSelected(card)}
                      onClick={() => handleCardClick(card)}
                      clickable={game.isMyTurn && !myPlayer?.finished}
                    />
                  ))}
                </div>

                {/* Selected cards moved to top overlay */}
              </div>
            ) : (
              <p className="text-green-100 mb-4 text-center">
                No cards in hand
              </p>
            )}

            {/* Game Controls */}
            {game.isMyTurn && !myPlayer?.finished && (
              <div className="flex gap-4 mt-4 justify-center items-center">
                <button
                  onClick={handlePlayCards}
                  disabled={selectedCards.length === 0}
                  aria-label="Play Cards"
                  className="disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded transition-colors"
                >
                  Play Cards
                </button>

                {game.lastPlay && (
                  <button
                    onClick={handlePass}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded transition-colors"
                  >
                    Pass Turn
                  </button>
                )}

                <button
                  onClick={() => setSelectedCards([])}
                  disabled={selectedCards.length === 0}
                  className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            )}

            {!game.isMyTurn && !myPlayer?.finished && (
              <p className="text-green-100 mt-4 text-center">
                Waiting for other players...
              </p>
            )}

            {myPlayer?.finished && (
              <p className="text-yellow-300 mt-4 font-semibold text-center">
                You finished in position #{myPlayer.finishPosition}! Waiting for
                game to end...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Game Rules - Collapsible */}
      {/* <div className="fixed top-24 right-4 w-80 z-10">
        <div className=" rounded-lg p-4">
          <details className="cursor-pointer">
            <summary className="text-lg font-semibold mb-2">
              🎯 Game Rules & Tips
            </summary>
            <div className="text-green-100 space-y-1 text-sm mt-3">
              <p>
                • <strong>Goal:</strong> Be the first player to empty your
                hand.
              </p>
              <p>
                • <strong>Initial Deal:</strong> Everyone is dealt 13 cards; the
                player holding the 3♦ leads the very first turn.
              </p>
              <p>
                • <strong>Card Ranking:</strong> 3 (lowest) → 4 → 5 → 6 → 7 → 8
                → 9 → 10 → J → Q → K → A → 2 (highest).
              </p>
              <p>
                • <strong>Suit Ranking:</strong> ♦ (lowest) → ♣ → ♥ → ♠
                (highest) for tie breakers on identical ranks.
              </p>
              <p>
                • <strong>Full House Rule:</strong> Compare the three-of-a-kind
                first (e.g. 555JJ loses to 66699 because the triple six is
                higher). The pair can be any rank once your triple wins.
              </p>
              <p>
                • <strong>Valid Plays:</strong> Singles, pairs, triples,
                straights (5+ in sequence), flushes, full houses, four-of-a-kind
                sets, and straight flushes.
              </p>
              <p>
                • <strong>Challenging Plays:</strong> To beat a hand, match its
                length & type with a higher value or present a stronger
                combination tier.
              </p>
              <p>
                • <strong>Passing:</strong> If everyone else passes, the table
                clears and you may lead any valid combination.
              </p>
            </div>
          </details>
        </div>
      </div> */}
    </div>
  );
}
